import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const OrganizerEventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [merchandise, setMerchandise] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [discussion, setDiscussion] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editVariants, setEditVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ product: '', size: '', color: '', price: 0, stock: 0 });
  const [manualTicket, setManualTicket] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Camera QR scanner state
  const [cameraScanning, setCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrRef = useRef(null);
  const QR_READER_ID = 'event-detail-qr-reader';

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAll = async () => {
    try {
      const [evRes, regRes, anaRes] = await Promise.all([
        API.get(`/events/${id}`),
        API.get(`/registrations/event/${id}`).catch(() => ({ data: [] })),
        API.get(`/analytics/event/${id}`).catch(() => ({ data: null }))
      ]);
      setEvent(evRes.data);
      setEditForm({
        name: evRes.data.name,
        description: evRes.data.description,
        eligibility: evRes.data.eligibility,
        startDate: evRes.data.startDate ? new Date(evRes.data.startDate).toISOString().slice(0, 16) : '',
        endDate: evRes.data.endDate ? new Date(evRes.data.endDate).toISOString().slice(0, 16) : '',
        registrationDeadline: evRes.data.registrationDeadline?.split('T')[0] || '',
        registrationLimit: evRes.data.registrationLimit,
        registrationFee: evRes.data.registrationFee,
        tags: evRes.data.tags?.join(', ') || ''
      });
      setEditVariants(evRes.data.merchandiseVariants || []);
      setRegistrations(regRes.data);
      setAnalytics(anaRes.data);

      if (evRes.data.type === 'merchandise') {
        API.get(`/registrations/merchandise/event/${id}`).then(r => setMerchandise(r.data)).catch(() => {});
      }
      API.get(`/attendance/event/${id}`).then(r => setAttendanceLogs(r.data)).catch(() => {});
      API.get(`/discussion/${id}`).then(r => setDiscussion(r.data)).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await API.put(`/events/${id}/publish`);
      setSuccess('Event published!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm(`⚠️ Are you sure you want to permanently delete "${event?.name}"?\n\nThis will remove the event AND all registrations, attendance logs, and discussion messages. This cannot be undone.`)) return;
    try {
      await API.delete(`/events/${id}`);
      navigate('/organizer/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete event');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await API.put(`/events/${id}/status`, { status });
      setSuccess(`Event marked as ${status}`);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    }
  };

  const handleEditSave = async () => {
    try {
      const payload = {
        ...editForm,
        tags: editForm.tags.split(',').map(s => s.trim()).filter(Boolean),
        merchandiseVariants: editVariants,
      };
      await API.put(`/events/${id}`, payload);
      setSuccess('Event updated');
      setEditing(false);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed');
    }
  };

  // Camera QR scanner helpers
  const stopCameraScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch (_) {}
      html5QrRef.current = null;
    }
    setCameraScanning(false);
  }, []);

  // Stop camera when switching tabs or unmounting
  useEffect(() => {
    return () => { stopCameraScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== 'attendance') stopCameraScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const startCameraScanner = async () => {
    setCameraError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setCameraError('No camera found on this device.');
        return;
      }
      const camera =
        cameras.find(c => /back|rear|environment/i.test(c.label)) ||
        cameras[cameras.length - 1];

      const qr = new Html5Qrcode(QR_READER_ID);
      html5QrRef.current = qr;

      await qr.start(
        camera.id,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopCameraScanner();
          // Mark attendance with the scanned data
          try {
            await API.post('/attendance/scan', { ticketData: decodedText });
            setSuccess(`✅ Attendance marked! (${decodedText})`);
            fetchAll();
          } catch (err) {
            setError(err.response?.data?.message || 'Scan failed');
          }
        },
        () => {}
      );
      setCameraScanning(true);
    } catch (e) {
      const msg = e?.message || '';
      if (/permission|denied|notallowed/i.test(msg)) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (/notfound|no device/i.test(msg)) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera. Try refreshing or use Manual Override.');
      }
    }
  };

  const handleManualOverride = async () => {
    try {
      await API.post('/attendance/manual', { ticketId: manualTicket, overrideReason });
      setSuccess('Manual attendance marked');
      setManualTicket(''); setOverrideReason('');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Override failed');
    }
  };

  const handleApprove = async (orderId) => {
    try {
      await API.put(`/registrations/merchandise/${orderId}/approve`);
      setSuccess('Order approved!');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (orderId) => {
    try {
      await API.put(`/registrations/merchandise/${orderId}/reject`);
      setSuccess('Order rejected');
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await API.delete(`/discussion/${msgId}`);
      fetchAll();
    } catch {}
  };

  const handlePinMessage = async (msgId) => {
    try {
      await API.put(`/discussion/${msgId}/pin`);
      fetchAll();
    } catch {}
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await API.post(`/discussion/${id}`, { messageText: newMessage });
      setNewMessage('');
      fetchAll();
    } catch {}
  };

  const exportCSV = (data, filename) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!event) return <div className="page-wrapper"><div className="container"><div className="alert alert-error">Event not found</div></div></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate('/organizer/dashboard')}>← Dashboard</button>

        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="page-title">{event.name}</h1>
            <div className="flex gap-3 items-center mt-2">
              <span className={`badge badge-${event.status}`}>{event.status}</span>
              <span className="badge badge-draft">{event.type}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {event.status === 'draft' && (
              <button className="btn btn-primary" onClick={handlePublish}>🚀 Publish</button>
            )}
            {event.status === 'published' && (
              <button className="btn btn-secondary" onClick={() => handleStatusChange('ongoing')}>Mark Ongoing</button>
            )}
            {event.status === 'ongoing' && (
              <button className="btn btn-secondary" onClick={() => handleStatusChange('completed')}>Mark Completed</button>
            )}
            {event.status === 'published' && (
              <button className="btn btn-ghost" onClick={() => { if (window.confirm('Close registrations? Participants will no longer be able to register.')) handleStatusChange('closed'); }} title="Stop accepting new registrations">🔒 Close Registrations</button>
            )}
            {event.status === 'ongoing' && (
              <button className="btn btn-ghost" onClick={() => handleStatusChange('closed')}>Close</button>
            )}
            {['draft', 'published'].includes(event.status) && (
              <button className="btn btn-ghost" onClick={() => {
                if (event.status === 'draft') {
                  navigate(`/organizer/events/create?edit=${id}`);
                } else {
                  setEditing(!editing);
                }
              }}>{editing ? 'Cancel' : '✏️ Edit'}</button>
            )}
            <button className="btn btn-danger btn-sm" onClick={handleDeleteEvent} title="Delete event permanently">🗑️ Delete</button>
          </div>
        </div>

        {editing && (
          <div className="card mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontWeight: 700 }}>Edit Event</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: event.status === 'draft' ? 'var(--bg-tertiary)' : 'rgba(204,0,0,0.1)',
                border: `1px solid ${event.status === 'draft' ? 'var(--border-color)' : 'var(--accent-red)'}`,
                color: event.status === 'draft' ? 'var(--text-muted)' : 'var(--accent-red)',
                textTransform: 'uppercase'
              }}>
                {event.status === 'draft' ? '✏️ Full Edit (Draft)' : '⚠️ Limited Edit (Published)'}
              </span>
            </div>

            {/* Description — allowed in both draft and published */}
            {event.status === 'draft' && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            {/* Draft-only fields */}
            {event.status === 'draft' && (
              <>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Eligibility</label>
                    <select className="form-select" value={editForm.eligibility} onChange={e => setEditForm(p => ({ ...p, eligibility: e.target.value }))}>
                      <option value="ALL">All</option>
                      <option value="IIIT">IIIT Only</option>
                      <option value="EXTERNAL">External Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tags (comma-separated)</label>
                    <input type="text" className="form-input" value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Start Date &amp; Time</label>
                    <input type="datetime-local" className="form-input" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date &amp; Time</label>
                    <input type="datetime-local" className="form-input" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Registration Deadline</label>
                    <input type="date" className="form-input" value={editForm.registrationDeadline} onChange={e => setEditForm(p => ({ ...p, registrationDeadline: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Limit (0 = unlimited)</label>
                    <input type="number" className="form-input" value={editForm.registrationLimit} onChange={e => setEditForm(p => ({ ...p, registrationLimit: e.target.value }))} min={0} />
                  </div>
                </div>
                {event.type !== 'merchandise' && (
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Registration Fee (₹)</label>
                      <input type="number" className="form-input" value={editForm.registrationFee} onChange={e => setEditForm(p => ({ ...p, registrationFee: e.target.value }))} min={0} />
                    </div>
                    <div className="form-group" />
                  </div>
                )}
              </>
            )}

            {/* Published: extend deadline + increase limit */}
            {event.status === 'published' && (
              <>
                <div className="form-hint" style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(255,200,50,0.06)', border: '1px solid rgba(255,200,50,0.2)' }}>
                  ℹ️ Published events: you may update description, extend the registration deadline, increase the registration limit, and (for merchandise) add/edit variants.
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Registration Deadline <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(extend only)</span></label>
                    <input type="date" className="form-input" value={editForm.registrationDeadline} onChange={e => setEditForm(p => ({ ...p, registrationDeadline: e.target.value }))} min={editForm.registrationDeadline} />
                  </div>
                  {event.type !== 'merchandise' && (
                    <div className="form-group">
                      <label className="form-label">Registration Limit <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(increase only)</span></label>
                      <input type="number" className="form-input" value={editForm.registrationLimit} onChange={e => setEditForm(p => ({ ...p, registrationLimit: e.target.value }))} min={event.analytics?.totalRegistrations || 0} />
                      <div className="form-hint">Current: {event.analytics?.totalRegistrations || 0} registered</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Merchandise variants — draft (full) or published (add/edit) */}
            {event.type === 'merchandise' && (
              <div>
                <h4 style={{ fontWeight: 700, marginBottom: 12, marginTop: 8 }}>
                  Merchandise Variants
                  {event.status === 'published' && <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>— add variants or change stock &amp; price</span>}
                </h4>
                {editVariants.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 80px auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Product" value={v.product || ''} onChange={e => setEditVariants(prev => prev.map((x, j) => j === i ? { ...x, product: e.target.value } : x))} />
                    <input type="text" className="form-input" placeholder="Size/Color" value={[v.size, v.color].filter(Boolean).join(' / ')} readOnly style={{ color: 'var(--text-muted)', fontSize: 12 }} title="Size/color set at creation" />
                    <input type="number" className="form-input" placeholder="Price ₹" value={v.price || 0} min={0} onChange={e => setEditVariants(prev => prev.map((x, j) => j === i ? { ...x, price: parseFloat(e.target.value) || 0 } : x))} title="Price" />
                    <input type="number" className="form-input" placeholder="Stock" value={v.stock || 0} min={0} onChange={e => setEditVariants(prev => prev.map((x, j) => j === i ? { ...x, stock: parseInt(e.target.value) || 0 } : x))} title="Stock" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Sold: {v.sold || 0}</span>
                    {event.status === 'draft' && (
                      <button className="btn btn-danger btn-sm" onClick={() => setEditVariants(prev => prev.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)', padding: 12, marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>Add New Variant</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px 80px auto', gap: 8, alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="Product *" value={newVariant.product} onChange={e => setNewVariant(p => ({ ...p, product: e.target.value }))} />
                    <input type="text" className="form-input" placeholder="Size" value={newVariant.size} onChange={e => setNewVariant(p => ({ ...p, size: e.target.value }))} />
                    <input type="text" className="form-input" placeholder="Color" value={newVariant.color} onChange={e => setNewVariant(p => ({ ...p, color: e.target.value }))} />
                    <input type="number" className="form-input" placeholder="Price ₹" value={newVariant.price} min={0} onChange={e => setNewVariant(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                    <input type="number" className="form-input" placeholder="Stock" value={newVariant.stock} min={0} onChange={e => setNewVariant(p => ({ ...p, stock: parseInt(e.target.value) || 0 }))} />
                    <button className="btn btn-secondary btn-sm" disabled={!newVariant.product} onClick={() => {
                      setEditVariants(prev => [...prev, { ...newVariant, sold: 0 }]);
                      setNewVariant({ product: '', size: '', color: '', price: 0, stock: 0 });
                    }}>+ Add</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="tabs">
          {['overview','participants','analytics','attendance','merchandise','discussion'].map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'merchandise' ? (
                <>💳 Payments {merchandise.filter(o => o.approvalStatus === 'pending').length > 0 && (
                  <span style={{ marginLeft: 4, background: 'var(--accent-red)', color: '#fff', borderRadius: '50%', fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                    {merchandise.filter(o => o.approvalStatus === 'pending').length}
                  </span>
                )}</>
              ) : t.charAt(0).toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid-4">
            <div className="stat-card"><div className="stat-number">{event.analytics?.totalRegistrations || 0}</div><div className="stat-label">Total Registrations</div></div>
            <div className="stat-card"><div className="stat-number">₹{event.analytics?.revenue || 0}</div><div className="stat-label">Revenue</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.attendanceCount || 0}</div><div className="stat-label">Attendance</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.merchandiseSales || 0}</div><div className="stat-label">Merch Sales</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.iiitRegistrations || 0}</div><div className="stat-label">IIIT Regs</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.externalRegistrations || 0}</div><div className="stat-label">External Regs</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.cancellationCount || 0}</div><div className="stat-label">Cancellations</div></div>
            <div className="stat-card"><div className="stat-number">{event.analytics?.pageViews || 0}</div><div className="stat-label">Page Views</div></div>
          </div>
        )}

        {tab === 'participants' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{registrations.length} participants</span>
              <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(registrations.map(r => ({
                name: `${r.participantId?.firstName} ${r.participantId?.lastName}`,
                email: r.participantId?.userId?.email,
                type: r.participantType,
                ticketId: r.ticketId,
                status: r.status,
                attendanceMarked: r.attendanceMarked
              })), `participants-${event.name}.csv`)}>
                Export CSV
              </button>
            </div>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Type</th><th>Ticket ID</th><th>Status</th><th>Attendance</th></tr>
                </thead>
                <tbody>
                  {registrations.map(r => (
                    <tr key={r._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {r.participantId?.firstName} {r.participantId?.lastName}
                      </td>
                      <td>{r.participantId?.userId?.email}</td>
                      <td><span className="badge badge-pending">{r.participantType}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.ticketId}</td>
                      <td><span className={`badge badge-${r.status === 'registered' ? 'approved' : r.status}`}>{r.status}</span></td>
                      <td>
                        <span style={{ color: r.attendanceMarked ? 'var(--success)' : 'var(--text-muted)' }}>
                          {r.attendanceMarked ? '✓ Present' : '✗ Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'analytics' && analytics && (
          <div>
            <div className="grid-2" style={{ gap: 24 }}>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Registration Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString()} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #cc0000', color: '#fff', borderRadius: 0 }} />
                    <Line type="monotone" dataKey="registrations" stroke="#cc0000" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Revenue Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.history || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 11 }} tickFormatter={d => new Date(d).toLocaleDateString()} />
                    <YAxis stroke="#666" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #cc0000', color: '#fff', borderRadius: 0 }} />
                    <Bar dataKey="revenue" fill="#cc0000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {tab === 'attendance' && (
          <div>
            {event.status !== 'ongoing' ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>Attendance Not Started</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                  Attendance tracking begins when you mark the event as <strong>Ongoing</strong>.
                  {event.status === 'published' && ' Click "Mark Ongoing" in the header above to begin.'}
                  {event.status === 'completed' && ' This event has ended.'}
                  {event.status === 'closed' && ' This event is closed.'}
                  {event.status === 'draft' && ' Publish the event first, then mark it as Ongoing to start attendance.'}
                </p>
                {event.status === 'published' && (
                  <button className="btn btn-primary" onClick={() => handleStatusChange('ongoing')}>
                    ▶ Mark Ongoing &amp; Start Attendance
                  </button>
                )}
                {attendanceLogs.length > 0 && (
                  <div style={{ marginTop: 32, textAlign: 'left' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Attendance Log ({attendanceLogs.length})</h4>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr><th>Name</th><th>Ticket ID</th><th>Scanned At</th><th>Type</th></tr>
                        </thead>
                        <tbody>
                          {attendanceLogs.map(l => (
                            <tr key={l._id}>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                {l.participantId?.firstName} {l.participantId?.lastName}
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.ticketId}</td>
                              <td>{new Date(l.scannedAt).toLocaleString()}</td>
                              <td>
                                {l.manualOverride
                                  ? <span className="badge badge-pending">Manual</span>
                                  : <span className="badge badge-approved">QR Scan</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="grid-2 mb-6" style={{ gap: 24 }}>
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>QR Scanner</h3>

                    {/* Camera viewport — must be in DOM before startCameraScanner() is called */}
                    <div id={QR_READER_ID} style={{ width: '100%' }} />

                    {cameraError && (
                      <div className="alert alert-error" style={{ fontSize: 13, marginBottom: 12 }}>
                        {cameraError}
                      </div>
                    )}

                    {!cameraScanning ? (
                      <button className="btn btn-primary w-full" style={{ marginTop: 8 }} onClick={startCameraScanner}>
                        📷 Open Camera &amp; Scan QR
                      </button>
                    ) : (
                      <button className="btn btn-danger w-full" style={{ marginTop: 8 }} onClick={stopCameraScanner}>
                        ⏹ Stop Camera
                      </button>
                    )}

                    <div className="form-hint" style={{ marginTop: 8 }}>
                      Point the camera at the participant's QR code — attendance is marked automatically.
                    </div>
                  </div>
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Manual Override</h3>
                    <div className="form-group">
                      <label className="form-label">Ticket ID</label>
                      <input type="text" className="form-input" value={manualTicket} onChange={e => setManualTicket(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Override Reason</label>
                      <input type="text" className="form-input" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
                    </div>
                    <button className="btn btn-secondary" onClick={handleManualOverride} disabled={!manualTicket}>Mark Present</button>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <h3 style={{ fontWeight: 700 }}>Attendance Log ({attendanceLogs.length})</h3>
                  <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(attendanceLogs.map(l => ({
                    name: `${l.participantId?.firstName} ${l.participantId?.lastName}`,
                    email: l.participantId?.userId?.email,
                    ticketId: l.ticketId,
                    scannedAt: l.scannedAt,
                    manualOverride: l.manualOverride,
                    reason: l.overrideReason || ''
                  })), `attendance-${event.name}.csv`)}>Export CSV</button>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Name</th><th>Email</th><th>Ticket ID</th><th>Scanned At</th><th>Type</th></tr>
                    </thead>
                    <tbody>
                      {attendanceLogs.map(l => (
                        <tr key={l._id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {l.participantId?.firstName} {l.participantId?.lastName}
                          </td>
                          <td>{l.participantId?.userId?.email}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{l.ticketId}</td>
                          <td>{new Date(l.scannedAt).toLocaleString()}</td>
                          <td>
                            {l.manualOverride
                              ? <span className="badge badge-pending">Manual</span>
                              : <span className="badge badge-approved">QR Scan</span>}
                          </td>
                        </tr>
                      ))}
                      {attendanceLogs.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No attendance recorded yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'merchandise' && (
          <div>
            {/* Summary bar */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Orders', value: merchandise.length, color: 'var(--text-primary)' },
                { label: '⏳ Pending', value: merchandise.filter(o => o.approvalStatus === 'pending').length, color: 'var(--warning)' },
                { label: '✅ Approved', value: merchandise.filter(o => o.approvalStatus === 'approved').length, color: 'var(--success)' },
                { label: '❌ Rejected', value: merchandise.filter(o => o.approvalStatus === 'rejected').length, color: 'var(--accent-red)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div className="stat-number" style={{ color: s.color }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pending orders at top */}
            {merchandise.filter(o => o.approvalStatus === 'pending').length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--warning)' }}>⏳ Pending Approvals</h3>
                {merchandise.filter(o => o.approvalStatus === 'pending').map(o => (
                  <div key={o._id} style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                    borderLeft: '4px solid var(--warning)', padding: '16px 20px', marginBottom: 12,
                  }}>
                    <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {o.participantId?.firstName} {o.participantId?.lastName}
                          <span className="badge badge-pending" style={{ marginLeft: 8, fontSize: 11 }}>{o.participantType}</span>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{o.participantId?.userId?.email}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>₹{o.revenueAmount}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty: {o.quantity}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                    </div>

                    {o.variantsSelected?.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Variants: {o.variantsSelected.map(v => [v.size, v.color].filter(Boolean).join(' / ')).join(', ')}
                      </div>
                    )}

                    {o.paymentProofUrl && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Payment Proof:</div>
                        {/\.(jpg|jpeg|png|webp)$/i.test(o.paymentProofUrl) || o.paymentProofUrl.includes('cloudinary') ? (
                          <div>
                            <img
                              src={o.paymentProofUrl}
                              alt="Payment Proof"
                              style={{ maxWidth: 280, maxHeight: 180, objectFit: 'contain', border: '1px solid var(--border-color)', display: 'block', marginBottom: 6 }}
                            />
                            <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                              🔍 View Full Image
                            </a>
                          </div>
                        ) : (
                          <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                            📄 View Payment Proof
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2" style={{ paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                      <button className="btn btn-success btn-sm" onClick={() => handleApprove(o._id)}>
                        ✅ Approve — Generate Ticket &amp; Email
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(o._id)}>
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resolved orders */}
            {merchandise.filter(o => o.approvalStatus !== 'pending').length > 0 && (
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-muted)' }}>All Orders History</h3>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr><th>Participant</th><th>Qty</th><th>Amount</th><th>Proof</th><th>Status</th><th>Ticket ID</th></tr>
                    </thead>
                    <tbody>
                      {merchandise.filter(o => o.approvalStatus !== 'pending').map(o => (
                        <tr key={o._id}>
                          <td style={{ color: 'var(--text-primary)' }}>
                            <div style={{ fontWeight: 600 }}>{o.participantId?.firstName} {o.participantId?.lastName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.participantId?.userId?.email}</div>
                          </td>
                          <td>{o.quantity}</td>
                          <td style={{ color: 'var(--success)' }}>₹{o.revenueAmount}</td>
                          <td>
                            {o.paymentProofUrl && (
                              <a href={o.paymentProofUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View</a>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${o.approvalStatus === 'approved' ? 'approved' : 'rejected'}`}>
                              {o.approvalStatus === 'approved' ? '✅ Approved' : '❌ Rejected'}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.ticketId || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {merchandise.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🛒</div>
                <div className="empty-state-title">No orders yet</div>
                <div className="empty-state-text">Merchandise orders will appear here once participants place them.</div>
              </div>
            )}
          </div>
        )}

        {tab === 'discussion' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {discussion.filter(m => !m.isDeleted).map(msg => (
                <div key={msg._id} style={{ background: msg.isPinned ? 'rgba(204,0,0,0.06)' : 'var(--bg-elevated)', border: `1px solid ${msg.isPinned ? 'var(--accent-red-muted)' : 'var(--border-color)'}`, padding: 12 }}>
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: 12, fontWeight: 600, color: msg.role === 'organizer' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                      {msg.userId?.email} {msg.isPinned && '📌'}
                    </span>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => handlePinMessage(msg._id)}>📌 Pin</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMessage(msg._id)}>Delete</button>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{msg.messageText}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <input type="text" className="form-input" placeholder="Post an announcement..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePostMessage()} />
              <button className="btn btn-primary" onClick={handlePostMessage}>Post</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerEventDetail;

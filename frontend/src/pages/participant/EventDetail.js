import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { jsPDF } from 'jspdf';
import { fmtDateTime, fmtDate } from '../../utils/dateUtils';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showMerchForm, setShowMerchForm] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [merchandiseData, setMerchandiseData] = useState({ variantQuantities: {}, paymentProof: null });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myReg, setMyReg] = useState(null);
  const [myMerchOrder, setMyMerchOrder] = useState(null);
  const [discussion, setDiscussion] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    fetchEvent();
    if (isAuthenticated) fetchMyReg();
    fetchDiscussion();
    // Mark discussion as read when opening the event page
    localStorage.setItem(`discussionLastRead_${id}`, new Date().toISOString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await API.get(`/events/${id}`);
      setEvent(res.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyReg = async () => {
    try {
      const res = await API.get('/registrations/my');
      const reg = res.data.registrations.find(r => r.eventId?._id === id || r.eventId === id);
      setMyReg(reg);
      const order = res.data.merchandiseOrders?.find(o => o.eventId?._id === id || o.eventId === id);
      setMyMerchOrder(order || null);
    } catch {}
  };

  const fetchDiscussion = async () => {
    try {
      const res = await API.get(`/discussion/${id}`);
      setDiscussion(res.data);
    } catch {}
  };

  const handleFormChange = (label, value) => setFormResponses(p => ({ ...p, [label]: value }));

  const handleRegister = async () => {
    setError('');
    setRegistering(true);
    try {
      await API.post(`/registrations/event/${id}`, { formResponses });
      setSuccess('Registered successfully! Check your email for the ticket.');
      setShowForm(false);
      fetchMyReg();
      fetchEvent();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const isFreeEvent = event
    ? (event.merchandiseVariants?.length > 0
        ? event.merchandiseVariants.every(v => (v.price || 0) === 0)
        : (event.registrationFee || 0) === 0)
    : false;

  // Compute total payable and selected variant list from variantQuantities map
  const selectedVariants = event
    ? Object.entries(merchandiseData.variantQuantities || {})
        .filter(([, qty]) => qty > 0)
        .map(([variantId, qty]) => ({ variantId, qty }))
    : [];
  const totalPayable = event
    ? selectedVariants.reduce((sum, { variantId, qty }) => {
        const v = event.merchandiseVariants?.find(x => x._id === variantId);
        return sum + (v?.price || 0) * qty;
      }, 0)
    : 0;

  const handleMerchOrder = async () => {
    setError('');
    setRegistering(true);
    try {
      const formData = new FormData();
      formData.append('variantsSelected', JSON.stringify(selectedVariants));
      formData.append('quantity', selectedVariants.reduce((s, v) => s + v.qty, 0));
      if (!isFreeEvent && merchandiseData.paymentProof) formData.append('paymentProof', merchandiseData.paymentProof);
      await API.post(`/registrations/merchandise/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(isFreeEvent ? 'Order placed! Your order has been confirmed.' : 'Order placed! Your payment proof has been uploaded. Awaiting organizer approval.');
      setShowMerchForm(false);
      fetchMyReg();
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setRegistering(false);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await API.post(`/discussion/${id}`, { messageText: newMessage, parentMessageId: replyTo });
      setNewMessage('');
      setReplyTo(null);
      fetchDiscussion();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not post message');
    }
  };

  const handleReact = async (msgId, emoji) => {
    try {
      await API.post(`/discussion/${msgId}/react`, { emoji });
      fetchDiscussion();
    } catch {}
  };

  const downloadTicketPDF = async () => {
    if (!myReg) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a5', orientation: 'portrait' });

    // Background
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');

    // Red header bar
    doc.setFillColor(204, 0, 0);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 56, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FELICITY', 28, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 200, 200);
    doc.text('EVENT TICKET', doc.internal.pageSize.getWidth() - 28, 36, { align: 'right' });

    // Event name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(event.name || '', 28, 82);

    // Organiser
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(204, 0, 0);
    doc.text(event.organizerId?.name || '', 28, 100);

    // Divider
    doc.setDrawColor(50, 50, 50);
    doc.line(28, 112, doc.internal.pageSize.getWidth() - 28, 112);

    // Info rows
    const rows = [
      ['Ticket ID', myReg.ticketId || '—'],
      ['Date', event.startDate ? fmtDateTime(event.startDate) : 'TBD'],
      ['Venue / Mode', event.venue || event.type || '—'],
      ['Fee', event.registrationFee > 0 ? `INR ${event.registrationFee}` : 'Free'],
      ['Registered', fmtDate(myReg.createdAt || Date.now())],
    ];

    let y = 132;
    rows.forEach(([label, value]) => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(label.toUpperCase(), 28, y);
      doc.setFontSize(10);
      doc.setTextColor(230, 230, 230);
      doc.text(String(value), 130, y);
      y += 22;
    });

    // QR code (if base64 data URL)
    if (myReg.qrCodeUrl && myReg.qrCodeUrl.startsWith('data:image')) {
      try {
        doc.addImage(myReg.qrCodeUrl, 'PNG', doc.internal.pageSize.getWidth() - 128, 120, 100, 100);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Scan at entrance', doc.internal.pageSize.getWidth() - 78, 228, { align: 'center' });
      } catch {}
    }

    // Footer
    doc.setDrawColor(50, 50, 50);
    doc.line(28, doc.internal.pageSize.getHeight() - 36, doc.internal.pageSize.getWidth() - 28, doc.internal.pageSize.getHeight() - 36);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This ticket is non-transferable. Present QR code at the event entrance.', 28, doc.internal.pageSize.getHeight() - 20);

    doc.save(`Felicity-Ticket-${myReg.ticketId || 'ticket'}.pdf`);
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!event) return <div className="page-wrapper"><div className="container"><div className="alert alert-error">Event not found</div></div></div>;

  const isPast = event.registrationDeadline && new Date(event.registrationDeadline) < new Date();
  const isLimitReached = event.registrationLimit > 0 && event.analytics?.totalRegistrations >= event.registrationLimit;
  const canRegister = isAuthenticated && user?.role === 'participant' && !myReg && !myMerchOrder && !isPast && !isLimitReached && event.status === 'published';

  return (
    <div className="page-wrapper">
      <div className="container">
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="grid-2" style={{ gridTemplateColumns: '1fr 340px', alignItems: 'start', gap: 24 }}>
          {/* Main */}
          <div>
            <div className="card mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className={`badge badge-${event.status}`}>{event.status}</span>
                <span className="badge badge-draft" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {event.type} event
                </span>
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{event.name}</h1>
              <div style={{ color: 'var(--accent-red)', fontWeight: 600, marginBottom: 16 }}>
                {event.organizerId?.name}
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{event.description}</p>
              {event.tags?.length > 0 && (
                <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                  {event.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>

            {/* Dynamic Form */}
            {showForm && event.type === 'normal' && (
              <div className="card mb-4">
                <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Registration Form</h3>
                {event.formSchema?.map((field, i) => (
                  <div key={i} className="form-group">
                    <label className="form-label">{field.label}{field.required && ' *'}</label>
                    {['text','email','number'].includes(field.fieldType) && (
                      <input type={field.fieldType} className="form-input" onChange={e => handleFormChange(field.label, e.target.value)} required={field.required} />
                    )}
                    {field.fieldType === 'textarea' && (
                      <textarea className="form-textarea" onChange={e => handleFormChange(field.label, e.target.value)} required={field.required} />
                    )}
                    {field.fieldType === 'select' && (
                      <select className="form-select" onChange={e => handleFormChange(field.label, e.target.value)}>
                        <option value="">Select...</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <div className="flex gap-3">
                  <button className="btn btn-primary" onClick={handleRegister} disabled={registering}>
                    {registering ? 'Registering...' : 'Confirm Registration'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Merchandise Form */}
            {showMerchForm && event.type === 'merchandise' && (
              <div className="card mb-4">
                <h3 style={{ marginBottom: 4, fontWeight: 700 }}>Place Merchandise Order</h3>
                {/* Purchase limit indicator */}
                {(() => {
                  const limit = event.purchaseLimit || 1;
                  const totalSelected = Object.values(merchandiseData.variantQuantities).reduce((s, q) => s + q, 0);
                  return (
                    <div style={{ fontSize: 12, color: totalSelected >= limit ? 'var(--accent-red)' : 'var(--text-muted)', marginBottom: 16 }}>
                      {totalSelected}/{limit} item{limit !== 1 ? 's' : ''} selected
                      {totalSelected >= limit && ' — purchase limit reached'}
                    </div>
                  );
                })()}

                {/* Variant tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                  {event.merchandiseVariants?.map(v => {
                    const qty = merchandiseData.variantQuantities[v._id] || 0;
                    const isSelected = qty > 0;
                    const outOfStock = v.stock <= 0;
                    return (
                      <div key={v._id} style={{
                        border: `2px solid ${isSelected ? 'var(--accent-red)' : 'var(--border-color)'}`,
                        background: isSelected ? 'rgba(204,0,0,0.06)' : 'var(--bg-elevated)',
                        padding: '12px 16px',
                        minWidth: 140,
                        opacity: outOfStock ? 0.5 : 1,
                        position: 'relative'
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{v.product || 'Item'}</div>
                        {(v.size || v.color) && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {[v.size, v.color].filter(Boolean).join(' / ')}
                          </div>
                        )}
                        {v.price > 0
                          ? <div style={{ fontWeight: 700, color: 'var(--accent-red)', marginBottom: 6 }}>₹{v.price}</div>
                          : <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 6, fontSize: 12 }}>Free</div>
                        }
                        <div style={{ fontSize: 11, color: v.stock > 0 ? 'var(--text-muted)' : 'var(--error)', marginBottom: 8 }}>
                          {outOfStock ? 'Out of stock' : `${v.stock} left`}
                        </div>
                        {!outOfStock && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              style={{ width: 28, height: 28, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => setMerchandiseData(p => ({
                                ...p,
                                variantQuantities: { ...p.variantQuantities, [v._id]: Math.max(0, (p.variantQuantities[v._id] || 0) - 1) }
                              }))}
                            >−</button>
                            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                            <button
                              style={{ width: 28, height: 28, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', cursor: 'pointer', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => setMerchandiseData(p => {
                                const currentTotal = Object.values(p.variantQuantities).reduce((s, q) => s + q, 0);
                                const limit = event.purchaseLimit || 1;
                                if (currentTotal >= limit) return p; // already at purchase limit
                                return {
                                  ...p,
                                  variantQuantities: { ...p.variantQuantities, [v._id]: Math.min(v.stock, (p.variantQuantities[v._id] || 0) + 1) }
                                };
                              })}
                            >+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Payable total */}
                {selectedVariants.length > 0 && (
                  <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Order Summary</div>
                    {selectedVariants.map(({ variantId, qty }) => {
                      const v = event.merchandiseVariants?.find(x => x._id === variantId);
                      return (
                        <div key={variantId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span>{v?.product}{v?.size ? ` (${v.size}` : ''}{v?.color ? `/${v.color})` : (v?.size ? ')' : '')}</span>
                          <span>× {qty} = {v?.price > 0 ? `₹${v.price * qty}` : 'Free'}</span>
                        </div>
                      );
                    })}
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Total Payable</span>
                      <span style={{ color: totalPayable > 0 ? 'var(--accent-red)' : 'var(--success)' }}>
                        {totalPayable > 0 ? `₹${totalPayable}` : 'Free'}
                      </span>
                    </div>
                  </div>
                )}

                {!isFreeEvent && totalPayable > 0 && (
                  <div className="form-group">
                    <label className="form-label">Payment Proof *</label>
                    <input type="file" className="form-input" accept="image/*,application/pdf" onChange={e => setMerchandiseData(p => ({ ...p, paymentProof: e.target.files[0] }))} />
                    <div className="form-hint">Upload screenshot/receipt of payment of ₹{totalPayable}</div>
                  </div>
                )}
                {(isFreeEvent || totalPayable === 0) && selectedVariants.length > 0 && (
                  <div className="form-hint" style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)' }}>
                    ✅ No payment required for your selection.
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    className="btn btn-primary"
                    onClick={handleMerchOrder}
                    disabled={registering || selectedVariants.length === 0 || (!isFreeEvent && totalPayable > 0 && !merchandiseData.paymentProof)}
                  >
                    {registering ? 'Placing Order...' : `Place Order${totalPayable > 0 ? ` (₹${totalPayable})` : ''}`}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowMerchForm(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Discussion */}
            <div className="card">
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Discussion Forum</h3>
              {discussion.length === 0 && (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No messages yet. Be the first to post!</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {discussion.filter(m => !m.parentMessageId).map(msg => (
                  <MessageItem key={msg._id} msg={msg} replies={discussion.filter(m => m.parentMessageId === msg._id)} onReply={() => setReplyTo(msg._id)} onReact={handleReact} />
                ))}
              </div>
              {isAuthenticated && (user?.role === 'participant' || user?.role === 'organizer') && (
                <div>
                  {replyTo && (
                    <div className="alert alert-info" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                      Replying to message <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(null)}>Cancel</button>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Write a message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handlePostMessage()}
                    />
                    <button className="btn btn-primary" onClick={handlePostMessage}>Post</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="card mb-4" style={{ borderTop: '3px solid var(--accent-red)' }}>
              <h3 style={{ marginBottom: 16, fontWeight: 700 }}>Event Details</h3>
              <InfoRow label="Start Date" value={fmtDateTime(event.startDate)} />
              <InfoRow label="End Date" value={fmtDateTime(event.endDate)} />
              <InfoRow label="Reg. Deadline" value={fmtDateTime(event.registrationDeadline)} />
              {event.type !== 'merchandise' && (
                <InfoRow label="Fee" value={event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'} />
              )}
              <InfoRow label="Eligibility" value={event.eligibility} />
              {event.registrationLimit > 0 && (
                <InfoRow label="Seats" value={`${event.analytics?.totalRegistrations || 0} / ${event.registrationLimit}`} />
              )}
              <div className="divider" />
              {!isAuthenticated && (
                <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>Login to Register</button>
              )}
              {isAuthenticated && user?.role === 'participant' && myReg && (
                <div>
                  <div className="alert alert-success" style={{ marginBottom: 12 }}>You're registered!</div>
                  {myReg.qrCodeUrl && (
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                      <img src={myReg.qrCodeUrl} alt="QR Code" style={{ maxWidth: 160, border: '2px solid var(--border-color)' }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Your QR Code</div>
                    </div>
                  )}
                  <button
                    className="btn btn-ghost w-full"
                    onClick={downloadTicketPDF}
                    style={{ fontSize: 13 }}
                  >
                    ⬇️ Download PDF Ticket
                  </button>
                </div>
              )}
              {isAuthenticated && user?.role === 'participant' && myMerchOrder && (
                <div>
                  {myMerchOrder.approvalStatus === 'pending' && (
                    <div style={{ background: 'rgba(255,200,50,0.08)', border: '1px solid var(--warning)', borderLeft: '3px solid var(--warning)', padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>⏳ Order Pending Approval</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your payment proof has been uploaded. The organizer will review and approve your order shortly.</div>
                    </div>
                  )}
                  {myMerchOrder.approvalStatus === 'approved' && (
                    <div>
                      <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid var(--success)', borderLeft: '3px solid var(--success)', padding: '12px 14px', marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>✅ Order Approved!</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ticket ID: <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{myMerchOrder.ticketId}</span></div>
                      </div>
                      {myMerchOrder.qrCodeUrl && (
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <img src={myMerchOrder.qrCodeUrl} alt="QR Code" style={{ maxWidth: 160, border: '2px solid var(--border-color)' }} />
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Your QR Code</div>
                        </div>
                      )}
                    </div>
                  )}
                  {myMerchOrder.approvalStatus === 'rejected' && (
                    <div style={{ background: 'rgba(204,0,0,0.08)', border: '1px solid var(--accent-red)', borderLeft: '3px solid var(--accent-red)', padding: '12px 14px', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-red)', marginBottom: 4 }}>❌ Order Rejected</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your order was rejected. Please contact the organizer for more information.</div>
                    </div>
                  )}
                </div>
              )}
              {canRegister && event.type === 'normal' && !showForm && (
                <button className="btn btn-primary w-full" onClick={() => setShowForm(true)}>Register Now</button>
              )}
              {canRegister && event.type === 'merchandise' && !showMerchForm && (
                <button className="btn btn-primary w-full" onClick={() => setShowMerchForm(true)}>Purchase Now</button>
              )}
              {isPast && !myReg && (
                <div className="alert alert-error">Registration deadline has passed</div>
              )}
              {isLimitReached && !myReg && (
                <div className="alert alert-error">Registration limit reached</div>
              )}
            </div>

            {event.type === 'merchandise' && event.merchandiseVariants?.length > 0 && (
              <div className="card">
                <h3 style={{ marginBottom: 12, fontWeight: 700 }}>Available Variants</h3>
                {event.merchandiseVariants.map(v => (
                  <div key={v._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v.product || 'Item'}</div>
                      {(v.size || v.color) && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[v.size, v.color].filter(Boolean).join(' / ')}</div>}
                      <div style={{ fontSize: 12, fontWeight: 700, color: v.price > 0 ? 'var(--accent-red)' : 'var(--success)', marginTop: 2 }}>
                        {v.price > 0 ? `₹${v.price}` : 'Free'}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: v.stock > 0 ? 'var(--success)' : 'var(--error)' }}>
                      {v.stock > 0 ? `${v.stock} left` : 'Out of stock'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
  </div>
);

const MessageItem = ({ msg, replies, onReply, onReact }) => (
  <div style={{ background: msg.isPinned ? 'rgba(204,0,0,0.06)' : 'var(--bg-elevated)', border: `1px solid ${msg.isPinned ? 'var(--accent-red-muted)' : 'var(--border-color)'}`, padding: 12 }}>
    <div className="flex justify-between items-center mb-2">
      <span style={{ fontSize: 12, fontWeight: 600, color: msg.role === 'organizer' ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
        {msg.userId?.email} {msg.role === 'organizer' && '(Organizer)'} {msg.isPinned && '📌'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDateTime(msg.createdAt)}</span>
    </div>
    <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{msg.messageText}</p>
    <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
      {['👍','❤️','🔥'].map(emoji => {
        const count = msg.reactions?.filter(r => r.emoji === emoji).length || 0;
        return (
          <button key={emoji} style={{ background: 'transparent', border: '1px solid var(--border-color)', padding: '2px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', borderRadius: 0 }} onClick={() => onReact(msg._id, emoji)}>
            {emoji} {count > 0 && count}
          </button>
        );
      })}
      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onReply}>Reply</button>
    </div>
    {replies?.length > 0 && (
      <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid var(--border-color)' }}>
        {replies.map(r => (
          <div key={r._id} style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.userId?.email}: </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.messageText}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default EventDetail;

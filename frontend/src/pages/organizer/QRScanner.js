import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import { fmtDateTime } from '../../utils/dateUtils';

const QR_ELEMENT_ID = 'qr-reader';

const QRScanner = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');

  const html5QrRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manualTicket, setManualTicket] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState('qr'); // 'qr' | 'upload' | 'manual' | 'override' | 'dashboard'

  // Dashboard state
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);
  const dashIntervalRef = useRef(null);

  // ── Camera scanner ──────────────────────────────────────────────────────────
  const startScanner = async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Get available cameras and prefer the rear/environment-facing one
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setError('No camera found on this device.');
        return;
      }
      // Pick back camera if available, otherwise first camera
      const camera =
        cameras.find(c => /back|rear|environment/i.test(c.label)) ||
        cameras[cameras.length - 1];

      const qr = new Html5Qrcode(QR_ELEMENT_ID);
      html5QrRef.current = qr;

      await qr.start(
        camera.id,
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          await handleScan(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (e) {
      const msg = e?.message || '';
      if (/permission|denied|notallowed/i.test(msg)) {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (/notfound|no device/i.test(msg)) {
        setError('No camera found on this device.');
      } else {
        setError('Could not start camera. Try refreshing the page or use Upload / Manual mode.');
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        if (html5QrRef.current.isScanning) await html5QrRef.current.stop();
        html5QrRef.current.clear();
      } catch (_) {}
      html5QrRef.current = null;
    }
    setScanning(false);
  };

  // Stop camera when navigating away from camera tab or unmounting
  useEffect(() => {
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── File upload QR scan ─────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const qr = new Html5Qrcode('qr-file-scanner');
      const decoded = await qr.scanFile(file, true);
      qr.clear();
      await handleScan(decoded);
    } catch {
      setError('Could not decode QR from image. Try a clearer photo.');
    }
    e.target.value = '';
  };

  // ── Core scan handler ───────────────────────────────────────────────────────
  const handleScan = async (ticketData) => {
    setError('');
    setResult(null);
    try {
      await API.post('/attendance/scan', { ticketData });
      const entry = { ticketData, time: new Date().toLocaleTimeString(), status: 'success', message: 'Attendance marked!' };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
    } catch (err) {
      const msg = err.response?.data?.message || 'Scan failed';
      const entry = { ticketData, time: new Date().toLocaleTimeString(), status: 'error', message: msg };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
    }
  };

  // ── Manual entry ────────────────────────────────────────────────────────────
  const handleManualScan = () => {
    if (!manualTicket.trim()) return;
    handleScan(manualTicket.trim());
    setManualTicket('');
  };

  // ── Manual override ─────────────────────────────────────────────────────────
  const handleManualOverride = async () => {
    if (!manualTicket.trim()) return;
    setError('');
    try {
      await API.post('/attendance/manual', { ticketId: manualTicket.trim(), overrideReason });
      const entry = { ticketData: manualTicket.trim(), time: new Date().toLocaleTimeString(), status: 'success', message: 'Manual override success' };
      setResult(entry);
      setHistory(prev => [entry, ...prev.slice(0, 49)]);
      setManualTicket('');
      setOverrideReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Override failed');
    }
  };

  // ── Live dashboard ──────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    if (!eventId) return;
    setDashLoading(true);
    try {
      const res = await API.get(`/attendance/event/${eventId}/all`);
      setDashboard(res.data);
    } catch { /* silently fail on auto-refresh */ }
    finally { setDashLoading(false); }
  }, [eventId]);

  useEffect(() => {
    if (mode === 'dashboard') {
      fetchDashboard();
      dashIntervalRef.current = setInterval(fetchDashboard, 10000);
    } else {
      clearInterval(dashIntervalRef.current);
    }
    return () => clearInterval(dashIntervalRef.current);
  }, [mode, fetchDashboard]);

  // ── CSV export ──────────────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    if (!eventId) { setError('Add ?eventId=<id> to the URL to export.'); return; }
    try {
      const res = await API.get(`/attendance/event/${eventId}/export-csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('CSV export failed.');
    }
  };

  // ── Tab switch ──────────────────────────────────────────────────────────────
  const switchMode = (m) => {
    if (mode === 'qr' && m !== 'qr') stopScanner();
    setMode(m);
    setError('');
    setResult(null);
  };

  const tabs = [
    { key: 'qr',        label: '📷 Camera' },
    { key: 'upload',    label: '🖼️ Upload QR' },
    { key: 'manual',    label: '⌨️ Manual' },
    { key: 'override',  label: '🔧 Override' },
    { key: 'dashboard', label: '📊 Dashboard' },
  ];

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">QR Attendance Scanner</h1>
          {eventId && (
            <button className="btn btn-ghost btn-sm" onClick={handleExportCSV}>⬇️ Export CSV</button>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {result && (
          <div className={`alert ${result.status === 'success' ? 'alert-success' : 'alert-error'}`}
            style={{ fontSize: 15, fontWeight: 600 }}>
            {result.status === 'success' ? '✅' : '❌'} {result.message}
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{result.ticketData}</div>
          </div>
        )}

        <div className="tabs mb-6">
          {tabs.map(t => (
            <div key={t.key} className={`tab ${mode === t.key ? 'active' : ''}`} onClick={() => switchMode(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        {/* Camera */}
        {mode === 'qr' && (
          <div className="card" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Camera QR Scanner</h3>
            {/* qr-reader div must always be present before startScanner() is called */}
            <div id={QR_ELEMENT_ID} style={{ width: '100%', minHeight: scanning ? 0 : undefined }} />
            {!scanning ? (
              <button className="btn btn-primary mt-4 w-full" onClick={startScanner}>
                📷 Scan QR
              </button>
            ) : (
              <button className="btn btn-danger mt-4 w-full" onClick={stopScanner}>
                ⏹ Stop Camera
              </button>
            )}
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
              Point your camera at the participant's QR code. The back camera will be used automatically.
            </div>
          </div>
        )}

        {/* Upload QR image */}
        {mode === 'upload' && (
          <div className="card" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Scan QR from Image</h3>
            <div id="qr-file-scanner" style={{ display: 'none' }} />
            <div className="form-group">
              <label className="form-label">Select QR Code Image</label>
              <input type="file" className="form-input" accept="image/*" onChange={handleFileUpload} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Upload a screenshot or photo containing the participant's QR code.
            </div>
          </div>
        )}

        {/* Manual entry */}
        {mode === 'manual' && (
          <div className="card" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Manual Ticket ID Entry</h3>
            <div className="form-group">
              <label className="form-label">Ticket ID</label>
              <input
                type="text" className="form-input" placeholder="FEL-XXXX-timestamp"
                value={manualTicket} onChange={e => setManualTicket(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualScan()}
              />
            </div>
            <button className="btn btn-primary w-full" onClick={handleManualScan} disabled={!manualTicket.trim()}>
              Mark Attendance
            </button>
          </div>
        )}

        {/* Override */}
        {mode === 'override' && (
          <div className="card" style={{ maxWidth: 500 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Manual Override</h3>
            <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 12 }}>
              ⚠️ Emergency use only. All overrides are audit-logged.
            </div>
            <div className="form-group">
              <label className="form-label">Ticket ID</label>
              <input type="text" className="form-input" value={manualTicket}
                onChange={e => setManualTicket(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Override Reason *</label>
              <input type="text" className="form-input" value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)} placeholder="e.g. Phone battery dead" />
            </div>
            <button className="btn btn-secondary w-full" onClick={handleManualOverride}
              disabled={!manualTicket.trim() || !overrideReason.trim()}>
              Override & Mark Present
            </button>
          </div>
        )}

        {/* Live Dashboard */}
        {mode === 'dashboard' && (
          <div>
            {!eventId ? (
              <div className="alert alert-error">
                Add <code>?eventId=&lt;id&gt;</code> to the URL to load the live dashboard.
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 style={{ fontWeight: 700 }}>Live Attendance Dashboard</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {dashLoading ? 'Refreshing…' : 'Auto-refreshes every 10s'}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={fetchDashboard}>↻</button>
                  </div>
                </div>
                {dashboard && (
                  <>
                    <div className="grid-4 mb-4">
                      <div className="stat-card"><div className="stat-number">{dashboard.total}</div><div className="stat-label">Total</div></div>
                      <div className="stat-card"><div className="stat-number" style={{ color: 'var(--success)' }}>{dashboard.scanned}</div><div className="stat-label">Scanned ✅</div></div>
                      <div className="stat-card"><div className="stat-number" style={{ color: 'var(--accent-red)' }}>{dashboard.notScanned}</div><div className="stat-label">Not Yet ❌</div></div>
                      <div className="stat-card">
                        <div className="stat-number">{dashboard.total > 0 ? Math.round((dashboard.scanned / dashboard.total) * 100) : 0}%</div>
                        <div className="stat-label">Attendance Rate</div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', height: 8, marginBottom: 20 }}>
                      <div style={{ height: '100%', background: 'var(--success)', transition: 'width 0.5s ease',
                        width: `${dashboard.total > 0 ? (dashboard.scanned / dashboard.total) * 100 : 0}%` }} />
                    </div>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr><th>Name</th><th>Email</th><th>Type</th><th>Ticket</th><th>Status</th><th>Scanned At</th></tr>
                        </thead>
                        <tbody>
                          {dashboard.participants.map(p => (
                            <tr key={p._id}>
                              <td style={{ fontWeight: 600 }}>{p.name || '—'}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.email}</td>
                              <td><span className="badge badge-draft">{p.participantType}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.ticketId || '—'}</td>
                              <td><span className={`badge badge-${p.attendanceMarked ? 'approved' : 'rejected'}`}>
                                {p.attendanceMarked ? '✅ Present' : '❌ Absent'}
                              </span></td>
                              <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {p.attendanceTimestamp ? fmtDateTime(p.attendanceTimestamp) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Session Log */}
        {['qr', 'upload', 'manual'].includes(mode) && history.length > 0 && (
          <div className="card mt-6">
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Session Log ({history.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {history.map((h, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 12px', background: 'var(--bg-elevated)',
                  border: `1px solid ${h.status === 'success' ? 'var(--success)' : 'var(--accent-red)'}30`
                }}>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-primary)' }}>{h.ticketData}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: h.status === 'success' ? 'var(--success)' : 'var(--accent-red)' }}>{h.message}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{h.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;

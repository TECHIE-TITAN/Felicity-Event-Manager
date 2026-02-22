import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const STATUS_COLORS = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--accent-red)' };
const STATUS_ICONS  = { pending: '⏳', approved: '✅', rejected: '❌' };

const OrganizerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [resetRequesting, setResetRequesting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [resetHistory, setResetHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    API.get('/organizers/me/profile')
      .then(r => {
        setProfile(r.data);
        const org = r.data.organizer || {};
        setForm({
          name: org.name || '',
          organizerType: org.organizerType || 'club',
          category: org.category || '',
          description: org.description || '',
          contactEmail: org.contactEmail || '',
          contactNumber: org.contactNumber || '',
        });
      })
      .finally(() => setLoading(false));

    // Load reset history
    setHistoryLoading(true);
    API.get('/organizers/me/password-reset-history')
      .then(r => setResetHistory(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { name, category, description, contactEmail, contactNumber } = form;
      await API.put('/organizers/me/profile', { name, category, description, contactEmail, contactNumber });
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestReset = async () => {
    setResetRequesting(true);
    setResetMsg('');
    try {
      const res = await API.post('/organizers/me/request-password-reset', { reason: resetReason });
      setResetMsg(res.data.message);
      setResetReason('');
      // Refresh history
      API.get('/organizers/me/password-reset-history').then(r => setResetHistory(r.data)).catch(() => {});
    } catch (err) {
      setResetMsg(err.response?.data?.message || 'Request failed');
    } finally {
      setResetRequesting(false);
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 700 }}>
        <h1 className="page-title mb-6">Organizer Profile</h1>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Club / Organizer Details</h3>

          <div className="form-group">
            <label className="form-label">Organization Name *</label>
            <input
              type="text"
              className="form-input"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Organiser Type</label>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { key: 'club',      label: '🎭 Club' },
                { key: 'council',   label: '🏛️ Council' },
                { key: 'fest_team', label: '🎪 Fest Team' },
              ].map((t, i, arr) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, organizerType: t.key }))}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: form.organizerType === t.key ? 'var(--accent-red)' : 'var(--bg-elevated)',
                    color: form.organizerType === t.key ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${form.organizerType === t.key ? 'var(--accent-red)' : 'var(--border-color)'}`,
                    borderRight: i < arr.length - 1 ? 'none' : undefined,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="form-hint">Set by admin — contact admin to change</div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              type="text"
              className="form-input"
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              placeholder="e.g. Music, Technical, Sports"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Describe your organization..."
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                value={form.contactEmail}
                onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="tel"
                className="form-input"
                value={form.contactNumber}
                onChange={e => setForm(p => ({ ...p, contactNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Email</label>
            <input
              type="email"
              className="form-input"
              value={profile?.user?.email || ''}
              disabled
              style={{ background: 'var(--bg-tertiary)', cursor: 'not-allowed' }}
            />
            <div className="form-hint">Login email cannot be changed</div>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !form.name}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Password reset request card */}
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Password Reset</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            If you have forgotten or want to change your password, submit a request to the admin.
            The admin will generate a new password and share it with you directly.
          </p>
          {resetMsg && (
            <div
              className={`alert ${resetMsg.includes('failed') || resetMsg.includes('already') ? 'alert-error' : 'alert-success'}`}
              style={{ marginBottom: 12 }}
              onClick={() => setResetMsg('')}
            >
              {resetMsg}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Reason for Reset <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(recommended)</span></label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="e.g. Forgot password, suspected compromise..."
              value={resetReason}
              onChange={e => setResetReason(e.target.value)}
            />
          </div>
          <button
            className="btn btn-ghost"
            onClick={handleRequestReset}
            disabled={resetRequesting}
          >
            {resetRequesting ? 'Submitting...' : '🔑 Request Password Reset'}
          </button>
        </div>

        {/* Password reset history */}
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Password Reset History</h3>
          {historyLoading ? (
            <div className="spinner" style={{ width: 24, height: 24 }} />
          ) : resetHistory.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No password reset requests found.</div>
          ) : (
            <div>
              {resetHistory.map(h => (
                <div key={h._id} style={{
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-color)',
                  borderLeft: `3px solid ${STATUS_COLORS[h.status]}`,
                  marginBottom: 10,
                }}>
                  <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: STATUS_COLORS[h.status], fontSize: 13 }}>
                      {STATUS_ICONS[h.status]} {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Requested: {new Date(h.requestedAt).toLocaleString()}
                    </span>
                  </div>
                  {h.reason && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Your reason: </span>{h.reason}
                    </div>
                  )}
                  {h.adminComment && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, padding: '6px 10px', background: 'var(--bg-tertiary)', borderLeft: '2px solid var(--accent-red)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Admin comment: </span>{h.adminComment}
                    </div>
                  )}
                  {h.resolvedAt && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      Resolved: {new Date(h.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerProfile;

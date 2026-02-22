import React, { useEffect, useState } from 'react';
import API from '../../api/axios';

const ORGANIZER_TYPES = [
  { key: 'club',      label: 'Club',      icon: '🎭', desc: 'Student interest clubs' },
  { key: 'council',   label: 'Council',   icon: '🏛️', desc: 'Student body councils' },
  { key: 'fest_team', label: 'Fest Team', icon: '🎪', desc: 'Core fest organizing team' },
];

const ManageOrganizers = () => {
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', organizerType: 'club', category: '', description: '' });
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newCredentials, setNewCredentials] = useState(null); // { loginEmail, password, contactEmail }
  const [saving, setSaving] = useState(false);

  const fetchOrganizers = () => {
    setLoading(true);
    API.get('/admin/organizers')
      .then(r => setOrganizers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrganizers(); }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await API.post('/admin/organizers', form);
      setNewCredentials({
        loginEmail: res.data.loginEmail,
        password: res.data.password,
      });
      setSuccess('');
      setForm({ name: '', organizerType: 'club', category: '', description: '' });
      setCreating(false);
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.message || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await API.put(`/admin/organizers/${id}/toggle-active`);
      fetchOrganizers();
    } catch (err) {
      setError('Toggle failed');
    }
  };

  const handleResetPassword = async (id, name) => {
    if (!window.confirm(`Reset password for "${name}"? New credentials will be emailed.`)) return;
    try {
      await API.put(`/admin/organizers/${id}/reset-password`);
      setSuccess('Password reset — new credentials emailed');
    } catch {
      setError('Reset failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}" and all associated data? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/organizers/${id}`);
      setSuccess(`"${name}" deleted`);
      fetchOrganizers();
    } catch {
      setError('Delete failed');
    }
  };

  const filtered = filterType === 'all' ? organizers : organizers.filter(o => o.organizerType === filterType);

  const countByType = (type) => organizers.filter(o => o.organizerType === type).length;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">Manage Clubs & Organisers</h1>
          <button className="btn btn-primary" onClick={() => { setCreating(!creating); setError(''); setSuccess(''); }}>
            {creating ? '✕ Cancel' : '+ Create Organiser'}
          </button>
        </div>

        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

        {/* Credentials box shown after creation */}
        {newCredentials && (
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--success)',
            borderLeft: '4px solid var(--success)',
            padding: '20px 24px',
            marginBottom: 24,
            position: 'relative',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 12, fontSize: 15 }}>
              ✅ Organiser account created successfully
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Login Email</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600, letterSpacing: 0.3 }}>
                {newCredentials.loginEmail}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>Password</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-red)', fontWeight: 700, fontSize: 16 }}>
                {newCredentials.password}
              </span>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              ⚠️ Note down these credentials now. They will not be shown again or emailed anywhere.
            </div>
            <button
              onClick={() => setNewCredentials(null)}
              style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
            >✕</button>
          </div>
        )}

        {/* Type stat cards */}
        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-number">{organizers.length}</div>
            <div className="stat-label">Total</div>
          </div>
          {ORGANIZER_TYPES.map(t => (
            <div key={t.key} className="stat-card" style={{ cursor: 'pointer', border: filterType === t.key ? '1px solid var(--accent-red)' : undefined }} onClick={() => setFilterType(filterType === t.key ? 'all' : t.key)}>
              <div className="stat-number">{t.icon} {countByType(t.key)}</div>
              <div className="stat-label">{t.label}s</div>
            </div>
          ))}
        </div>

        {/* Create form */}
        {creating && (
          <div className="card mb-6">
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>New Organiser Account</h3>

            {/* Organizer type selector */}
            <div className="form-group">
              <label className="form-label">Organiser Type *</label>
              <div style={{ display: 'flex', gap: 0 }}>
                {ORGANIZER_TYPES.map((t, i) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, organizerType: t.key }))}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      background: form.organizerType === t.key ? 'var(--accent-red)' : 'var(--bg-elevated)',
                      color: form.organizerType === t.key ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${form.organizerType === t.key ? 'var(--accent-red)' : 'var(--border-color)'}`,
                      borderRight: i < ORGANIZER_TYPES.length - 1 ? 'none' : undefined,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <div>{t.icon}</div>
                    <div>{t.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Organisation Name *</label>
                <input type="text" className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. IIIT Music Club" />
              </div>
            <div className="form-group">
              <label className="form-label">Category / Domain</label>
              <input type="text" className="form-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Music, Technical, Sports" />
            </div>
          </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} rows={3} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={saving || !form.name || !form.organizerType}
            >
              {saving ? 'Creating...' : 'Create & Send Credentials'}
            </button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="tabs mb-4">
          {['all', ...ORGANIZER_TYPES.map(t => t.key)].map(f => (
            <div key={f} className={`tab ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
              {f === 'all' ? 'All' : ORGANIZER_TYPES.find(t => t.key === f)?.label + 's'}
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Login Email</th>
                <th>Contact Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o._id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{o.name}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', fontSize: 11, fontWeight: 700,
                      background: o.organizerType === 'club' ? 'rgba(51,153,255,0.12)' : o.organizerType === 'council' ? 'rgba(204,0,0,0.12)' : 'rgba(0,204,102,0.12)',
                      color: o.organizerType === 'club' ? 'var(--info)' : o.organizerType === 'council' ? 'var(--accent-red)' : 'var(--success)',
                      border: `1px solid currentColor`,
                    }}>
                      {ORGANIZER_TYPES.find(t => t.key === o.organizerType)?.icon}{' '}
                      {ORGANIZER_TYPES.find(t => t.key === o.organizerType)?.label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.category || '—'}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{o.userId?.email}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.contactEmail || '—'}</td>
                  <td>
                    <span className={`badge badge-${o.isActive ? 'approved' : 'rejected'}`}>
                      {o.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(o._id)}>
                        {o.isActive ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleResetPassword(o._id, o.name)}>
                        Reset Pwd
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(o._id, o.name)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    No organisers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;

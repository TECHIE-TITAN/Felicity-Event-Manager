import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { fmtDateTime } from '../../utils/dateUtils';

const STATUS_COLORS = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--accent-red)' };
const STATUS_ICONS  = { pending: '⏳', approved: '✅', rejected: '❌' };

const PasswordResetRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // pending | all | approved | rejected
  const [approvedCredentials, setApprovedCredentials] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [commentInputs, setCommentInputs] = useState({}); // { [id]: string }

  const fetchRequests = (status = filter) => {
    setLoading(true);
    setError('');
    API.get(`/admin/password-reset-requests?status=${status}`)
      .then(r => setRequests(r.data))
      .catch(() => setError('Failed to load requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(filter); }, [filter]); // eslint-disable-line

  const handleApprove = async (req) => {
    setActionLoading(req._id);
    try {
      const res = await API.post(`/admin/password-reset-requests/${req._id}/approve`, {
        adminComment: commentInputs[req._id] || '',
      });
      setApprovedCredentials({
        organizerName: req.organizerId?.name || req.userId?.email,
        loginEmail: req.userId?.email,
        newPassword: res.data.newPassword,
      });
      fetchRequests(filter);
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req) => {
    setActionLoading(req._id);
    try {
      await API.post(`/admin/password-reset-requests/${req._id}/reject`, {
        adminComment: commentInputs[req._id] || '',
      });
      fetchRequests(filter);
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">Password Reset Requests</h1>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchRequests(filter)}>↻ Refresh</button>
        </div>

        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}

        {/* Approved credentials banner */}
        {approvedCredentials && (
          <div style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--success)',
            borderLeft: '4px solid var(--success)', padding: '20px 24px', marginBottom: 24, position: 'relative',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 12, fontSize: 15 }}>
              ✅ Password reset approved for: {approvedCredentials.organizerName}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>Login Email</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{approvedCredentials.loginEmail}</span>
              <span style={{ color: 'var(--text-muted)' }}>New Password</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-red)', fontWeight: 700, fontSize: 16 }}>{approvedCredentials.newPassword}</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              ⚠️ Note down and share this password with the organiser directly. It will not be shown again or sent via email.
            </div>
            <button onClick={() => setApprovedCredentials(null)}
              style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'pending',  label: `⏳ Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { key: 'approved', label: '✅ Approved' },
            { key: 'rejected', label: '❌ Rejected' },
            { key: 'all',      label: '📋 All History' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: '6px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f.key ? 'var(--accent-red)' : 'var(--bg-elevated)',
              border: `1px solid ${filter === f.key ? 'var(--accent-red)' : 'var(--border-color)'}`,
              color: filter === f.key ? '#fff' : 'var(--text-muted)',
            }}>{f.label}</button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">No {filter === 'all' ? '' : filter} requests</div>
            <div className="empty-state-text">When an organiser submits a password reset request, it will appear here.</div>
          </div>
        ) : (
          <div>
            {requests.map(r => (
              <div key={r._id} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                borderLeft: `3px solid ${STATUS_COLORS[r.status]}`, padding: '16px 20px', marginBottom: 12,
              }}>
                <div className="flex justify-between items-start" style={{ marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {r.organizerId?.name || '—'}
                      <span className="badge badge-pending" style={{ marginLeft: 8, textTransform: 'capitalize', fontSize: 11 }}>
                        {r.organizerId?.organizerType?.replace('_', ' ') || '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.userId?.email || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: STATUS_COLORS[r.status], fontSize: 13 }}>
                      {STATUS_ICONS[r.status]} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {fmtDateTime(r.requestedAt)}
                    </div>
                  </div>
                </div>

                {r.reason && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-tertiary)', marginBottom: 10, borderLeft: '2px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Organiser reason: </span>{r.reason}
                  </div>
                )}

                {r.adminComment && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--bg-tertiary)', marginBottom: 10, borderLeft: '2px solid var(--accent-red)' }}>
                    <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Your comment: </span>{r.adminComment}
                  </div>
                )}

                {r.resolvedAt && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Resolved: {fmtDateTime(r.resolvedAt)}
                  </div>
                )}

                {r.status === 'pending' && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Admin comment (optional)</label>
                      <textarea
                        className="form-textarea" rows={2}
                        placeholder="Add a comment for the organiser (will be visible to them in their history)..."
                        style={{ fontSize: 13 }}
                        value={commentInputs[r._id] || ''}
                        onChange={e => setCommentInputs(p => ({ ...p, [r._id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-primary btn-sm" onClick={() => handleApprove(r)} disabled={actionLoading === r._id}>
                        {actionLoading === r._id ? '...' : '✅ Approve & Reset Password'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(r)} disabled={actionLoading === r._id}>
                        {actionLoading === r._id ? '...' : '❌ Reject'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;

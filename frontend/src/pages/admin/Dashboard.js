import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { fmtDateTime } from '../../utils/dateUtils';

const AdminDashboard = () => {
  const [organizers, setOrganizers] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/admin/organizers').then(r => setOrganizers(r.data)).catch(() => {}),
      API.get('/admin/security-logs?limit=20').then(r => setSecurityLogs(r.data)).catch(() => {}),
      API.get('/admin/password-reset-requests').then(r => setResetRequests(r.data)).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  const activeOrgs = organizers.filter(o => o.isActive).length;
  const blockedIPs = securityLogs.filter(l => l.actionType === 'blocked').length;
  const pendingResets = resetRequests.filter(r => new Date(r.expiresAt) > new Date()).length;

  const countByType = (type) => organizers.filter(o => o.organizerType === type).length;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <h1 className="page-title mb-6">Admin Dashboard</h1>

        {/* Quick nav cards */}
        <div className="grid-4 mb-8">
          <Link to="/admin/organizers" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Manage Organisers</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clubs, Councils, Fest Teams</div>
            </div>
          </Link>
          <Link to="/admin/password-resets" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer',
              borderColor: pendingResets > 0 ? 'var(--warning)' : undefined }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔑</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Password Resets</div>
              <div style={{ fontSize: 12, color: pendingResets > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                {pendingResets > 0 ? `${pendingResets} pending` : 'No pending requests'}
              </div>
            </div>
          </Link>
          <Link to="/admin/security" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center', cursor: 'pointer',
              borderColor: blockedIPs > 0 ? 'var(--accent-red)' : undefined }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🛡️</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Security</div>
              <div style={{ fontSize: 12, color: blockedIPs > 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {blockedIPs} blocked IPs
              </div>
            </div>
          </Link>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Total Organisers</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{activeOrgs} active / {organizers.length} total</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid-4 mb-8">
          <div className="stat-card">
            <div className="stat-number">{countByType('club')}</div>
            <div className="stat-label">🎭 Clubs</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{countByType('council')}</div>
            <div className="stat-label">🏛️ Councils</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{countByType('fest_team')}</div>
            <div className="stat-label">🎪 Fest Teams</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--accent-red)' }}>{organizers.length - activeOrgs}</div>
            <div className="stat-label">Disabled Accounts</div>
          </div>
        </div>

        {/* Recent security events */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: 700 }}>Recent Security Events</h3>
            <Link to="/admin/security" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>IP Address</th><th>Action</th><th>User</th><th>Time</th></tr>
              </thead>
              <tbody>
                {securityLogs.slice(0, 8).map(l => (
                  <tr key={l._id}>
                    <td style={{ fontFamily: 'monospace' }}>{l.ipAddress}</td>
                    <td>
                      <span className={`badge badge-${l.actionType === 'blocked' ? 'rejected' : l.actionType === 'captcha_fail' ? 'pending' : 'approved'}`}>
                        {l.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.userId?.email || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(l.createdAt)}</td>
                  </tr>
                ))}
                {securityLogs.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No events yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

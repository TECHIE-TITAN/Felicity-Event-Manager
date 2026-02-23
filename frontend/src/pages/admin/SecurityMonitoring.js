import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { fmtDateTime } from '../../utils/dateUtils';

const SecurityMonitoring = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [blockIP, setBlockIP] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    API.get('/admin/security-logs')
      .then(r => setLogs(r.data))
      .catch(() => setError('Failed to load logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleBlockIP = async () => {
    if (!blockIP.trim()) return;
    try {
      await API.post('/admin/security-logs/block', { ipAddress: blockIP, reason: blockReason });
      setSuccess(`IP ${blockIP} blocked`);
      setBlockIP('');
      setBlockReason('');
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to block IP');
    }
  };

  const handleUnblockIP = async (ip) => {
    try {
      await API.delete(`/admin/security-logs/block/${encodeURIComponent(ip)}`);
      setSuccess(`IP ${ip} unblocked`);
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unblock IP');
    }
  };

  // Derive currently blocked IPs (has a 'blocked' entry but no later 'unblocked')
  const blockedIPs = new Set(
    logs.filter(l => l.actionType === 'blocked').map(l => l.ipAddress)
  );
  logs.filter(l => l.actionType === 'unblocked').forEach(l => blockedIPs.delete(l.ipAddress));

  const filtered = filter === 'all' ? logs : logs.filter(l => l.actionType === filter);
  const countByType = (type) => logs.filter(l => l.actionType === type).length;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">Security Monitoring</h1>
          <button className="btn btn-ghost btn-sm" onClick={fetchLogs}>↻ Refresh</button>
        </div>

        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

        {/* Stats */}
        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-number">{logs.length}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--accent-red)' }}>{blockedIPs.size}</div>
            <div className="stat-label">Currently Blocked</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--warning)' }}>{countByType('captcha_fail')}</div>
            <div className="stat-label">Captcha Fails</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: 'var(--info)' }}>{countByType('login_attempt') + countByType('rate_limit_block')}</div>
            <div className="stat-label">Login Attempts</div>
          </div>
        </div>

        {/* Currently blocked IPs */}
        {blockedIPs.size > 0 && (
          <div className="card mb-6">
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>🚫 Currently Blocked IPs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...blockedIPs].map(ip => (
                <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--accent-red)30' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ip}</span>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)', fontSize: 12 }}
                    onClick={() => handleUnblockIP(ip)}>
                    ✅ Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Block IP card */}
        <div className="card mb-6">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Block IP Address</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">IP Address *</label>
              <input type="text" className="form-input" value={blockIP}
                onChange={e => setBlockIP(e.target.value)} placeholder="192.168.1.1"
                onKeyDown={e => e.key === 'Enter' && handleBlockIP()} />
            </div>
            <div className="form-group">
              <label className="form-label">Reason</label>
              <input type="text" className="form-input" value={blockReason}
                onChange={e => setBlockReason(e.target.value)} placeholder="Reason for blocking..." />
            </div>
          </div>
          <button className="btn btn-danger" onClick={handleBlockIP} disabled={!blockIP.trim()}>Block IP</button>
        </div>

        {/* Filter tabs */}
        <div className="tabs mb-4">
          {[
            { key: 'all',               label: 'All' },
            { key: 'blocked',           label: '🚫 Blocked' },
            { key: 'unblocked',         label: '✅ Unblocked' },
            { key: 'captcha_fail',      label: '⚠️ Captcha Fails' },
            { key: 'login_attempt',     label: '🔑 Login Attempts' },
            { key: 'rate_limit_block',  label: '⛔ Rate Limited' },
          ].map(f => (
            <div key={f.key} className={`tab ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </div>
          ))}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Action</th>
                <th>Reason</th>
                <th>User</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l._id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{l.ipAddress}</td>
                  <td>
                    <span className={`badge badge-${
                      l.actionType === 'blocked'          ? 'rejected' :
                      l.actionType === 'unblocked'        ? 'approved' :
                      l.actionType === 'captcha_fail'     ? 'pending'  :
                      l.actionType === 'rate_limit_block' ? 'rejected' : 'approved'
                    }`}>
                      {l.actionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.reason || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.userId?.email || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(l.createdAt)}</td>
                  <td>
                    {l.actionType === 'blocked' && blockedIPs.has(l.ipAddress) && (
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--success)', fontSize: 11 }}
                        onClick={() => handleUnblockIP(l.ipAddress)}>
                        Unblock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    No security events found
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

export default SecurityMonitoring;

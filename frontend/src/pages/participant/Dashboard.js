import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

// localStorage helpers for discussion last-read tracking
const getLastRead = (eventId) => localStorage.getItem(`discussionLastRead_${eventId}`) || null;

const ParticipantDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({ registrations: [], merchandiseOrders: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [unreadMap, setUnreadMap] = useState({});  // eventId -> true/false

  useEffect(() => {
    API.get('/registrations/my')
      .then(res => {
        setData(res.data);
        // Collect all event IDs from registrations + merch orders
        const allRegs = res.data.registrations || [];
        const allOrders = res.data.merchandiseOrders || [];
        const eventIds = [
          ...allRegs.map(r => r.eventId?._id).filter(Boolean),
          ...allOrders.map(o => o.eventId?._id).filter(Boolean),
        ];
        const unique = [...new Set(eventIds)];
        if (unique.length) {
          API.post('/discussion/unread-counts', { eventIds: unique })
            .then(unreadRes => {
              const map = {};
              unique.forEach(eid => {
                const info = unreadRes.data[eid];
                if (!info) return;
                const lastRead = getLastRead(eid);
                if (!lastRead || new Date(info.latestAt) > new Date(lastRead)) {
                  map[eid] = true;
                }
              });
              setUnreadMap(map);
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = data.registrations.filter(r =>
    r.status === 'registered' && r.eventId?.startDate && new Date(r.eventId.startDate) >= now
  );
  const completed = data.registrations.filter(r => r.status === 'completed' || (r.eventId?.status === 'completed'));
  const cancelled = data.registrations.filter(r => ['cancelled', 'rejected'].includes(r.status));

  const handleView = (eventId) => {
    // Mark discussion as read when navigating to event
    localStorage.setItem(`discussionLastRead_${eventId}`, new Date().toISOString());
    setUnreadMap(prev => ({ ...prev, [eventId]: false }));
    navigate(`/events/${eventId}`);
  };

  const statusBadge = s => {
    const map = { registered: 'approved', cancelled: 'rejected', rejected: 'rejected', completed: 'approved' };
    return <span className={`badge badge-${map[s] || 'pending'}`}>{s}</span>;
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">My Dashboard</h1>
            <p className="page-subtitle">Track your event registrations and merchandise orders</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/events')}>Browse Events</button>
        </div>

        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-number">{data.registrations.length}</div>
            <div className="stat-label">Total Registrations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{upcoming.length}</div>
            <div className="stat-label">Upcoming Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{data.merchandiseOrders.length}</div>
            <div className="stat-label">Merch Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{completed.length}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="tabs">
          {['upcoming', 'history', 'merchandise', 'cancelled'].map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'upcoming' ? 'Upcoming' : t === 'history' ? 'History' : t === 'merchandise' ? 'Merchandise' : 'Cancelled/Rejected'}
            </div>
          ))}
        </div>

        {tab === 'upcoming' && (
          <RegistrationList items={upcoming} statusBadge={statusBadge} onView={handleView} unreadMap={unreadMap} />
        )}
        {tab === 'history' && (
          <RegistrationList items={completed} statusBadge={statusBadge} onView={handleView} unreadMap={unreadMap} />
        )}
        {tab === 'merchandise' && (
          <MerchandiseList items={data.merchandiseOrders} onView={handleView} unreadMap={unreadMap} />
        )}
        {tab === 'cancelled' && (
          <RegistrationList items={cancelled} statusBadge={statusBadge} onView={handleView} unreadMap={unreadMap} />
        )}
      </div>
    </div>
  );
};

const RegistrationList = ({ items, statusBadge, onView, unreadMap = {} }) => {
  if (!items.length) return (
    <div className="empty-state">
      <h3>No registrations here</h3>
      <p>Check out upcoming events and register!</p>
    </div>
  );
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th><th>Type</th><th>Ticket ID</th><th>Status</th><th>Date</th><th>QR</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r._id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {r.eventId?.name || 'N/A'}
                  {unreadMap[r.eventId?._id] && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block', flexShrink: 0 }} title="New discussion messages" />
                  )}
                </span>
              </td>
              <td><span className="badge badge-pending">{r.eventId?.type}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.ticketId || '—'}</td>
              <td>{statusBadge(r.status)}</td>
              <td>{r.eventId?.startDate ? new Date(r.eventId.startDate).toLocaleDateString() : '—'}</td>
              <td>
                {r.qrCodeUrl ? (
                  <img src={r.qrCodeUrl} alt="QR" style={{ width: 40, height: 40, border: '1px solid var(--border-color)' }} />
                ) : '—'}
              </td>
              <td>
                {r.eventId?._id && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onView(r.eventId._id)}>View</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MerchandiseList = ({ items, onView, unreadMap = {} }) => {
  if (!items.length) return (
    <div className="empty-state">
      <h3>No merchandise orders</h3>
      <p>Browse merchandise events and place an order!</p>
    </div>
  );
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Event</th><th>Qty</th><th>Amount</th><th>Status</th><th>Ticket ID</th><th>QR</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map(o => (
            <tr key={o._id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {o.eventId?.name || 'N/A'}
                  {unreadMap[o.eventId?._id] && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)', display: 'inline-block', flexShrink: 0 }} title="New discussion messages" />
                  )}
                </span>
              </td>
              <td>{o.quantity}</td>
              <td style={{ color: 'var(--success)' }}>₹{o.revenueAmount}</td>
              <td><span className={`badge badge-${o.approvalStatus}`}>{o.approvalStatus}</span></td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{o.ticketId || '—'}</td>
              <td>
                {o.qrCodeUrl ? (
                  <img src={o.qrCodeUrl} alt="QR" style={{ width: 40, height: 40, border: '1px solid var(--border-color)' }} />
                ) : '—'}
              </td>
              <td>
                {o.eventId?._id && (
                  <button className="btn btn-ghost btn-sm" onClick={() => onView(o.eventId._id)}>View</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ParticipantDashboard;

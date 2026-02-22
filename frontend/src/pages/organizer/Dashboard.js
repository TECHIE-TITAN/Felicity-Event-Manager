import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/events/organizer/mine').then(r => setEvents(r.data)).finally(() => setLoading(false));
  }, []);

  const published = events.filter(e => e.status === 'published');
  const ongoing = events.filter(e => e.status === 'ongoing');
  const draft = events.filter(e => e.status === 'draft');

  const totalRevenue = events.reduce((sum, e) => sum + (e.analytics?.revenue || 0), 0);
  const totalRegs = events.reduce((sum, e) => sum + (e.analytics?.totalRegistrations || 0), 0);

  const statusBadge = s => <span className={`badge badge-${s}`}>{s}</span>;

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title">Organizer Dashboard</h1>
            <p className="page-subtitle">Manage your events and track analytics</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/organizer/events/create')}>+ Create Event</button>
        </div>

        <div className="grid-4 mb-6">
          <div className="stat-card">
            <div className="stat-number">{events.length}</div>
            <div className="stat-label">Total Events</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalRegs}</div>
            <div className="stat-label">Total Registrations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">₹{totalRevenue.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{ongoing.length + published.length}</div>
            <div className="stat-label">Active Events</div>
          </div>
        </div>

        {/* Events Carousel / List */}
        <div className="card mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontWeight: 700 }}>Your Events</h3>
            <div className="flex gap-2">
              <span className="badge badge-published">{published.length} published</span>
              <span className="badge badge-ongoing">{ongoing.length} ongoing</span>
              <span className="badge badge-draft">{draft.length} drafts</span>
            </div>
          </div>
          {events.length === 0 ? (
            <div className="empty-state">
              <h3>No events yet</h3>
              <p>Create your first event to get started!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th><th>Type</th><th>Status</th><th>Registrations</th><th>Revenue</th><th>Deadline</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{e.name}</td>
                      <td><span className="badge badge-draft">{e.type}</span></td>
                      <td>{statusBadge(e.status)}</td>
                      <td>{e.analytics?.totalRegistrations || 0}</td>
                      <td style={{ color: 'var(--success)' }}>₹{e.analytics?.revenue || 0}</td>
                      <td>{e.registrationDeadline ? new Date(e.registrationDeadline).toLocaleDateString() : '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/organizer/events/${e._id}`)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;

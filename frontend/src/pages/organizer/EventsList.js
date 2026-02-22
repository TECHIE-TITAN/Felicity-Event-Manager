import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api/axios';

const OrganizerEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/events/organizer/mine')
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? events : events.filter(e => e.status === filter);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="flex justify-between items-center mb-6">
          <h1 className="page-title">My Events</h1>
          <button className="btn btn-primary" onClick={() => navigate('/organizer/events/create')}>+ Create Event</button>
        </div>

        <div className="tabs mb-6">
          {['all', 'draft', 'published', 'ongoing', 'completed', 'closed'].map(s => (
            <div key={s} className={`tab ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <div className="empty-state-title">No events found</div>
            <div className="empty-state-text">No events with status "{filter}"</div>
            <button className="btn btn-primary mt-4" onClick={() => navigate('/organizer/events/create')}>Create First Event</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Registrations</th>
                  <th>Revenue</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{ev.name}</td>
                    <td><span className="badge badge-draft">{ev.type}</span></td>
                    <td>
                      <span className={`badge badge-${ev.status}`}>{ev.status}</span>
                    </td>
                    <td>
                      {ev.analytics?.totalRegistrations || 0}
                      {ev.registrationLimit && (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> / {ev.registrationLimit}</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--success)' }}>₹{ev.analytics?.revenue || 0}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {ev.eventDates?.start ? new Date(ev.eventDates.start).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/organizer/events/${ev._id}`} className="btn btn-ghost btn-sm">Manage</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerEvents;

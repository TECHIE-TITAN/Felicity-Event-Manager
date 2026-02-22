import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { EventCard } from './BrowseEvents';

const OrganizerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/organizers/${id}`).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;
  if (!data) return <div className="page-wrapper"><div className="container"><div className="alert alert-error">Organizer not found</div></div></div>;

  const { organizer, upcoming, past } = data;

  return (
    <div className="page-wrapper">
      <div className="container">
        <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
        <div className="card mb-6" style={{ borderTop: '3px solid var(--accent-red)' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{organizer.name}</h1>
              <span className="badge badge-pending" style={{ marginBottom: 12 }}>{organizer.category}</span>
              <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{organizer.description}</p>
            </div>
          </div>
          <div className="divider" />
          <div className="flex gap-4">
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📧 {organizer.contactEmail}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>📞 {organizer.contactNumber}</span>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="mb-6">
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Upcoming Events</h2>
            <div className="grid-3">
              {upcoming.map(e => <EventCard key={e._id} event={e} onClick={() => navigate(`/events/${e._id}`)} />)}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Past Events</h2>
            <div className="grid-3">
              {past.map(e => <EventCard key={e._id} event={e} onClick={() => navigate(`/events/${e._id}`)} />)}
            </div>
          </div>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <div className="empty-state"><h3>No events yet</h3></div>
        )}
      </div>
    </div>
  );
};

export default OrganizerDetail;

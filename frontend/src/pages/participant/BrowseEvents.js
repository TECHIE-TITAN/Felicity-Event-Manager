import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

const BrowseEvents = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', type: '', eligibility: '', startDate: '', endDate: '' });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await API.get('/events', { params });
      setEvents(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.get('/events/trending').then(r => setTrending(r.data)).catch(() => {});
    fetchEvents();
  }, []);

  const handleFilter = e => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleSearch = e => { e.preventDefault(); fetchEvents(); };

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Browse Events</h1>
          <p className="page-subtitle">Discover exciting events at Felicity</p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <form onSubmit={handleSearch} className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
              <label className="form-label">Search</label>
              <input type="text" name="search" className="form-input" placeholder="Search events..." value={filters.search} onChange={handleFilter} />
            </div>
            <div className="form-group" style={{ flex: '0 0 140px', marginBottom: 0 }}>
              <label className="form-label">Type</label>
              <select name="type" className="form-select" value={filters.type} onChange={handleFilter}>
                <option value="">All Types</option>
                <option value="normal">Normal</option>
                <option value="merchandise">Merchandise</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 140px', marginBottom: 0 }}>
              <label className="form-label">Eligibility</label>
              <select name="eligibility" className="form-select" value={filters.eligibility} onChange={handleFilter}>
                <option value="">All</option>
                <option value="IIIT">IIIT</option>
                <option value="EXTERNAL">External</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: '0 0 150px', marginBottom: 0 }}>
              <label className="form-label">From</label>
              <input type="date" name="startDate" className="form-input" value={filters.startDate} onChange={handleFilter} />
            </div>
            <div className="form-group" style={{ flex: '0 0 150px', marginBottom: 0 }}>
              <label className="form-label">To</label>
              <input type="date" name="endDate" className="form-input" value={filters.endDate} onChange={handleFilter} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>Search</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setFilters({ search: '', type: '', eligibility: '', startDate: '', endDate: '' }); fetchEvents(); }}>Clear</button>
          </form>
        </div>

        {/* Trending */}
        {trending.length > 0 && (
          <div className="mb-6">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              🔥 Trending (Last 24h)
            </h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {trending.map(e => (
                <div key={e._id} className="event-card" style={{ minWidth: 220 }} onClick={() => navigate(`/events/${e._id}`)}>
                  <div className="event-card-body">
                    <div className="event-card-org">{e.organizerId?.name}</div>
                    <div className="event-card-title">{e.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>
                      {e.analytics?.totalRegistrations} registrations
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Events Grid */}
        {loading ? (
          <div className="loading-page"><div className="spinner" /></div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid-3">
            {events.map(event => (
              <EventCard key={event._id} event={event} onClick={() => navigate(`/events/${event._id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EventCard = ({ event, onClick }) => {
  return (
    <div className="event-card" onClick={onClick}>
      <div className="event-card-body">
        <div className="flex justify-between items-center mb-2">
          <span className={`badge badge-${event.status}`}>{event.status}</span>
          <span className="badge badge-draft" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{event.type}</span>
        </div>
        <div className="event-card-org">{event.organizerId?.name}</div>
        <div className="event-card-title">{event.name}</div>
        <div className="event-card-desc">{event.description}</div>
        <div className="event-card-meta">
          <span className="event-meta-item">
            📅 {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
          </span>
          {event.registrationFee > 0 && (
            <span className="event-meta-item" style={{ color: 'var(--success)' }}>₹{event.registrationFee}</span>
          )}
          {event.registrationFee === 0 && (
            <span className="event-meta-item" style={{ color: 'var(--success)' }}>Free</span>
          )}
          <span className="event-meta-item">👥 {event.analytics?.totalRegistrations || 0}</span>
        </div>
        {event.tags?.length > 0 && (
          <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
            {event.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
};

export { EventCard };
export default BrowseEvents;

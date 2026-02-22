import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const Clubs = () => {
  const navigate = useNavigate();
  const [organizers, setOrganizers] = useState([]);
  const [myFollowed, setMyFollowed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      API.get('/organizers'),
      API.get('/participants/me')
    ]).then(([orgRes, meRes]) => {
      setOrganizers(orgRes.data);
      setMyFollowed(meRes.data.participant?.followedOrganizers?.map(o => o._id || o) || []);
    }).finally(() => setLoading(false));
  }, []);

  const handleFollow = async (orgId) => {
    setFollowing(p => ({ ...p, [orgId]: true }));
    try {
      const res = await API.post(`/participants/me/follow/${orgId}`);
      setMessage(res.data.message);
      if (res.data.followed) {
        setMyFollowed(p => [...p, orgId]);
      } else {
        setMyFollowed(p => p.filter(id => id !== orgId));
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error');
    } finally {
      setFollowing(p => ({ ...p, [orgId]: false }));
    }
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Clubs & Organizers</h1>
          <p className="page-subtitle">Follow clubs to get personalized recommendations</p>
        </div>

        {message && <div className="alert alert-success">{message}</div>}

        <div className="grid-3">
          {organizers.map(org => (
            <div key={org._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{org.name}</div>
                  <span className="badge badge-pending" style={{ fontSize: 10 }}>{org.category}</span>
                </div>
                <button
                  className={`btn btn-sm ${myFollowed.includes(org._id) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleFollow(org._id)}
                  disabled={following[org._id]}
                >
                  {myFollowed.includes(org._id) ? '✓ Following' : '+ Follow'}
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{org.description}</p>
              <div className="flex gap-3">
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clubs/${org._id}`)}>View Events →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Clubs;

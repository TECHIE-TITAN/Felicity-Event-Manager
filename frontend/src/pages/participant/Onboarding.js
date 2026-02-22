import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

const ALL_INTERESTS = [
  'Technology', 'Programming', 'Artificial Intelligence', 'Machine Learning', 'Cybersecurity',
  'Web Development', 'App Development', 'Robotics', 'Electronics', 'Data Science',
  'Music', 'Dance', 'Theatre', 'Fine Arts', 'Photography', 'Film Making', 'Poetry', 'Creative Writing',
  'Sports', 'Cricket', 'Football', 'Basketball', 'Badminton', 'Table Tennis', 'Chess', 'Esports',
  'Quizzing', 'Debate', 'Public Speaking', 'Model United Nations',
  'Finance', 'Entrepreneurship', 'Management', 'Marketing',
  'Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Astronomy',
  'Environment', 'Sustainability', 'Social Work', 'Politics', 'Law',
  'Cooking', 'Travel', 'Gaming', 'Anime', 'Books', 'Fashion', 'Fitness', 'Yoga', 'Meditation',
];

const STEP_COUNT = 2;

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [followedOrgs, setFollowedOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 2) {
      setOrgsLoading(true);
      API.get('/organizers')
        .then(r => setOrganizers(r.data))
        .catch(() => {})
        .finally(() => setOrgsLoading(false));
    }
  }, [step]);

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleOrg = (id) => {
    setFollowedOrgs(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      await API.put('/participants/me/onboarding', {
        interests: selectedInterests,
        followedOrganizers: followedOrgs,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const ORG_TYPE_LABELS = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎪 Fest Team' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 900, color: 'var(--accent-red)', letterSpacing: 4, marginBottom: 8 }}>
          FELICITY
        </div>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 22, marginBottom: 4 }}>
          Welcome aboard! Let's set up your profile.
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Step {step} of {STEP_COUNT}</p>
        {/* Progress bar */}
        <div style={{ width: 260, height: 4, background: 'var(--bg-elevated)', margin: '12px auto 0', borderRadius: 0 }}>
          <div style={{ width: `${(step / STEP_COUNT) * 100}%`, height: '100%', background: 'var(--accent-red)', transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 720 }}>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* ── STEP 1: Interests ── */}
        {step === 1 && (
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>What are your interests?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              Select all that apply. This helps us show you relevant events.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
              {ALL_INTERESTS.map(interest => {
                const selected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    style={{
                      padding: '7px 14px',
                      fontSize: 13,
                      fontWeight: selected ? 700 : 400,
                      background: selected ? 'var(--accent-red)' : 'var(--bg-elevated)',
                      color: selected ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${selected ? 'var(--accent-red)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedInterests.length} selected
              </span>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Next: Follow Organisers →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Follow Organisers ── */}
        {step === 2 && (
          <div className="card">
            <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Follow clubs & organisers</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
              Follow the ones you're interested in to see their events on your dashboard.
            </p>

            {orgsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner" />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
                {organizers.map(org => {
                  const followed = followedOrgs.includes(org._id);
                  return (
                    <div
                      key={org._id}
                      onClick={() => toggleOrg(org._id)}
                      style={{
                        padding: '16px',
                        background: followed ? 'rgba(204,0,0,0.08)' : 'var(--bg-elevated)',
                        border: `1px solid ${followed ? 'var(--accent-red)' : 'var(--border-color)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        position: 'relative',
                      }}
                    >
                      {followed && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 18, height: 18,
                          background: 'var(--accent-red)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#fff', fontWeight: 700,
                        }}>✓</div>
                      )}
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>
                        {org.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {ORG_TYPE_LABELS[org.organizerType] || org.organizerType}
                        {org.category ? ` · ${org.category}` : ''}
                      </div>
                      {org.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {org.description}
                        </div>
                      )}
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: followed ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                        {followed ? '✓ Following' : '+ Follow'}
                      </div>
                    </div>
                  );
                })}
                {organizers.length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                    No organisers available yet. You can follow them later from the Clubs page.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {followedOrgs.length} following
                </span>
                <button className="btn btn-primary" onClick={handleFinish} disabled={saving}>
                  {saving ? 'Saving...' : 'Go to Dashboard →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;

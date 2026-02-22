import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

const ORG_TYPE_LABELS = { club: '🎭 Club', council: '🏛️ Council', fest_team: '🎪 Fest Team' };

const ParticipantProfile = () => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordTab, setPasswordTab] = useState('current'); // 'current' | 'otp'
  const [otpStep, setOtpStep] = useState(1); // 1=send OTP, 2=verify OTP + set new password
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpConfirmPassword, setOtpConfirmPassword] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('profile');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [editingInterests, setEditingInterests] = useState(false);

  const fetchProfile = () => {
    setLoading(true);
    API.get('/participants/me').then(res => {
      setProfile(res.data);
      const p = res.data.participant;
      setForm({
        firstName: p.firstName, lastName: p.lastName,
        collegeName: p.collegeName || '', contactNumber: p.contactNumber || '',
      });
      setSelectedInterests(p.interests || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePasswordChange = e => setPasswordForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleInterest = (interest) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSaveProfile = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      await API.put('/participants/me', { ...form, interests: selectedInterests });
      setSuccess('Profile updated successfully');
      setEditingInterests(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await API.put('/participants/me/password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOTP = async () => {
    setError(''); setOtpSending(true);
    try {
      await API.post('/auth/forgot-password', { email: profile?.user?.email });
      setOtpStep(2);
      setSuccess('OTP sent to your registered email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpReset = async e => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (otpNewPassword !== otpConfirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await API.post('/auth/reset-password', { email: profile?.user?.email, otp: otpCode, newPassword: otpNewPassword });
      setSuccess('Password reset successfully via OTP!');
      setOtpStep(1); setOtpCode(''); setOtpNewPassword(''); setOtpConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUnfollow = async (orgId) => {
    try {
      await API.post(`/participants/me/follow/${orgId}`);
      fetchProfile();
    } catch {}
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  const participant = profile?.participant;
  const followedOrganizers = participant?.followedOrganizers || [];

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 740 }}>
        <div className="page-header">
          <h1 className="page-title">My Profile</h1>
        </div>

        <div className="tabs">
          <div className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>Profile</div>
          <div className={`tab ${tab === 'interests' ? 'active' : ''}`} onClick={() => setTab('interests')}>Interests</div>
          <div className={`tab ${tab === 'following' ? 'active' : ''}`} onClick={() => setTab('following')}>
            Following {followedOrganizers.length > 0 && <span style={{ marginLeft: 4, background: 'var(--accent-red)', color: '#fff', borderRadius: 10, fontSize: 11, padding: '1px 6px' }}>{followedOrganizers.length}</span>}
          </div>
          <div className={`tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>Password</div>
        </div>

        {error && <div className="alert alert-error" onClick={() => setError('')}>{error}</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile}>
            <div className="card">
              <div className="grid-2 mb-4">
                <div>
                  <label className="form-label">Email</label>
                  <input type="text" className="form-input" value={profile?.user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="form-label">Participant Type</label>
                  <input type="text" className="form-input" value={participant?.participantType || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input type="text" name="firstName" className="form-input" value={form.firstName || ''} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input type="text" name="lastName" className="form-input" value={form.lastName || ''} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">College / Organization</label>
                <input type="text" name="collegeName" className="form-input" value={form.collegeName || ''} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input type="text" name="contactNumber" className="form-input" value={form.contactNumber || ''} onChange={handleChange} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* ── Interests Tab ── */}
        {tab === 'interests' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Your Interests</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{selectedInterests.length} selected</p>
              </div>
              {!editingInterests ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingInterests(true)}>✏️ Edit</button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    setEditingInterests(false);
                    setSelectedInterests(participant?.interests || []);
                  }}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {!editingInterests ? (
              selectedInterests.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏷️</div>
                  <div className="empty-state-title">No interests selected</div>
                  <div className="empty-state-text">Click Edit to pick from 54 categories</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedInterests.map(interest => (
                    <span key={interest} style={{
                      padding: '6px 14px',
                      background: 'rgba(204,0,0,0.1)',
                      border: '1px solid var(--accent-red)',
                      color: 'var(--accent-red)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}>{interest}</span>
                  ))}
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                    >{interest}</button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Following Tab ── */}
        {tab === 'following' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Following</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {followedOrganizers.length} organiser{followedOrganizers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Link to="/clubs" className="btn btn-ghost btn-sm">+ Discover More</Link>
            </div>

            {followedOrganizers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏢</div>
                <div className="empty-state-title">Not following anyone yet</div>
                <div className="empty-state-text">
                  Visit <Link to="/clubs" style={{ color: 'var(--accent-red)' }}>Clubs &amp; Orgs</Link> to find groups you like
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {followedOrganizers.map(org => (
                  <div key={org._id} style={{
                    padding: 16,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                      {ORG_TYPE_LABELS[org.organizerType] || org.organizerType}
                      {org.category ? ` · ${org.category}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Link to={`/clubs/${org._id}`} className="btn btn-ghost btn-sm" style={{ fontSize: 11, flex: 1, textAlign: 'center' }}>
                        View
                      </Link>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => handleUnfollow(org._id)}
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Password Tab ── */}
        {tab === 'password' && (
          <div className="card">
            {/* Sub-tabs */}
            <div className="flex gap-0 mb-5" style={{ border: '1px solid var(--border-color)' }}>
              {[
                { key: 'current', label: '🔑 Change Password' },
                { key: 'otp',     label: '📧 Reset via Email OTP' },
              ].map(t => (
                <button key={t.key} type="button" onClick={() => { setPasswordTab(t.key); setError(''); setSuccess(''); setOtpStep(1); }} style={{
                  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  background: passwordTab === t.key ? 'var(--accent-red)' : 'transparent',
                  color: passwordTab === t.key ? '#fff' : 'var(--text-muted)',
                  borderRight: t.key === 'current' ? '1px solid var(--border-color)' : 'none',
                }}>{t.label}</button>
              ))}
            </div>

            {/* Change with current password */}
            {passwordTab === 'current' && (
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" name="currentPassword" className="form-input" value={passwordForm.currentPassword} onChange={handlePasswordChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input type="password" name="newPassword" className="form-input" value={passwordForm.newPassword} onChange={handlePasswordChange} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input type="password" name="confirmPassword" className="form-input" value={passwordForm.confirmPassword} onChange={handlePasswordChange} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            )}

            {/* Reset via Email OTP */}
            {passwordTab === 'otp' && (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  An OTP will be sent to <strong style={{ color: 'var(--text-primary)' }}>{profile?.user?.email}</strong>.
                  Use it to set a new password without needing your current password.
                </p>

                {otpStep === 1 ? (
                  <button className="btn btn-primary" onClick={handleSendOTP} disabled={otpSending}>
                    {otpSending ? 'Sending OTP...' : '📧 Send OTP to Email'}
                  </button>
                ) : (
                  <form onSubmit={handleOtpReset}>
                    <div className="form-group">
                      <label className="form-label">OTP Code</label>
                      <input type="text" className="form-input" value={otpCode} onChange={e => setOtpCode(e.target.value)} maxLength={6} required
                        style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} placeholder="••••••" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input type="password" className="form-input" value={otpNewPassword} onChange={e => setOtpNewPassword(e.target.value)} required minLength={6} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input type="password" className="form-input" value={otpConfirmPassword} onChange={e => setOtpConfirmPassword(e.target.value)} required />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Resetting...' : 'Reset Password'}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOtpStep(1); setOtpCode(''); }}>← Resend OTP</button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipantProfile;

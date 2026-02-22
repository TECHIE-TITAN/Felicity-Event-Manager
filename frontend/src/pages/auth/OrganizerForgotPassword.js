import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';

const OrganizerForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/organizers/request-password-reset-public', { email, reason });
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FELICITY</div>
        <div className="auth-subtitle">Organiser — Forgot Password</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success ? (
          <div>
            <div className="alert alert-success">{success}</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
              Your request has been sent to the admin. They will review it and share your new password directly.
              You can also check the status in your profile after logging in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Enter your organiser login email and a reason for the reset. An admin will review your request
              and provide you with a new password.
            </p>
            <div className="form-group">
              <label className="form-label">Organiser Login Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="yourclub.xxxx@felicity.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Reset <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(recommended)</span></label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. Forgot password, credential compromised..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Reset Request'}
            </button>
          </form>
        )}

        <div className="divider" style={{ margin: '20px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 13 }}>
          <Link to="/login" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default OrganizerForgotPassword;

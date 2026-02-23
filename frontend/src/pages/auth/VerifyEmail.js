import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState(location.state?.email || '');
  const password = location.state?.password || null; // passed from Register for auto-login
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/verify-otp', { email, otp });
      // Auto-login if we have the password (coming from registration flow).
      // Uses a dedicated no-captcha endpoint — captcha was already verified at registration.
      if (password) {
        const res = await API.post('/auth/login-after-verify', { email, password });
        login(res.data.user, res.data.token);
        setSuccess('Email verified! Setting up your account...');
        setTimeout(() => navigate('/onboarding', { replace: true }), 800);
      } else {
        setSuccess('Email verified! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await API.post('/auth/resend-otp', { email });
      setSuccess('OTP resent to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FELICITY</div>
        <div className="auth-subtitle">Verify your email address</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">OTP Code</label>
            <input
              type="text"
              className="form-input"
              placeholder="6-digit code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              maxLength={6}
              required
              style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={handleResend} disabled={resending}>
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
        <div className="divider" style={{ margin: '20px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/login" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

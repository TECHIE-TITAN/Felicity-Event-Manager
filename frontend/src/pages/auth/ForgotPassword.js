import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/axios';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSuccess('OTP sent to your email');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async e => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email, otp, newPassword });
      setSuccess('Password reset! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FELICITY</div>
        <div className="auth-subtitle">Reset your password</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">OTP Code</label>
              <input type="text" className="form-input" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
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

export default ForgotPassword;

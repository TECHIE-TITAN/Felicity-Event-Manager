import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const ROLES = [
  { key: 'participant', label: 'Participant', icon: '🎓' },
  { key: 'organizer',  label: 'Organiser',   icon: '🏢' },
  { key: 'admin',      label: 'Admin',        icon: '🛡️' },
];

const PARTICIPANT_TYPES = [
  { key: 'IIIT',     label: 'IIIT Student',   hint: 'yourname@iiit.ac.in' },
  { key: 'EXTERNAL', label: 'External',        hint: 'you@email.com' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const [selectedRole, setSelectedRole] = useState('participant');
  const [participantType, setParticipantType] = useState('IIIT');
  const [form, setForm] = useState({ email: '', password: '' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const emailPlaceholder =
    selectedRole === 'admin'      ? 'admin@felicity.fest' :
    selectedRole === 'organizer'  ? 'club@felicity.fest'  :
    participantType === 'IIIT'    ? 'yourname@iiit.ac.in' :
                                    'you@email.com';

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/login', { ...form, captchaToken });
      const { token, user } = res.data;

      // Validate the returned role matches what the user selected
      if (user.role !== selectedRole) {
        setError(`No ${selectedRole} account found for this email.`);
        setLoading(false);
        return;
      }

      login(user, token);
      if (user.role === 'admin')     navigate('/admin/dashboard');
      else if (user.role === 'organizer') navigate('/organizer/dashboard');
      else navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      if (err.response?.data?.requiresVerification) {
        setRequiresVerification(true);
        setError('Please verify your email first. Check your inbox for OTP.');
      } else {
        setError(msg);
      }
      // Reset CAPTCHA on failure so user must re-verify
      recaptchaRef.current?.reset();
      setCaptchaToken('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">FELICITY</div>
        <div className="auth-subtitle">Sign in to your account</div>

        {/* Role Selector */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--border-color)' }}>
          {ROLES.map(r => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setSelectedRole(r.key); setError(''); setRequiresVerification(false); }}
              style={{
                flex: 1,
                padding: '10px 0',
                background: selectedRole === r.key ? 'var(--accent-red)' : 'transparent',
                color: selectedRole === r.key ? '#fff' : 'var(--text-muted)',
                border: 'none',
                borderRight: r.key !== 'admin' ? '1px solid var(--border-color)' : 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-body, Inter)',
                fontSize: 13,
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              <div>{r.icon}</div>
              <div>{r.label}</div>
            </button>
          ))}
        </div>

        {/* Participant sub-type */}
        {selectedRole === 'participant' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {PARTICIPANT_TYPES.map(pt => (
              <button
                key={pt.key}
                type="button"
                onClick={() => setParticipantType(pt.key)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  background: participantType === pt.key ? 'rgba(204,0,0,0.15)' : 'var(--bg-elevated)',
                  color: participantType === pt.key ? 'var(--accent-red)' : 'var(--text-muted)',
                  border: `1px solid ${participantType === pt.key ? 'var(--accent-red)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body, Inter)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {pt.label}
              </button>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder={emailPlaceholder}
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
              onChange={token => setCaptchaToken(token || '')}
              onExpired={() => setCaptchaToken('')}
              theme="dark"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading || !captchaToken}>
            {loading ? 'Signing in...' : `Sign In as ${ROLES.find(r => r.key === selectedRole)?.label}`}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          {selectedRole === 'participant' && (
            <Link to="/forgot-password" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          )}
          {selectedRole === 'organizer' && (
            <Link to="/organizer-forgot-password" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          )}
          {selectedRole === 'participant' && (
            <>
              &nbsp;·&nbsp;
              <Link to="/register" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>
                Create account
              </Link>
            </>
          )}
        </div>

        {requiresVerification && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Link to="/verify-email" style={{ color: 'var(--accent-red)', fontSize: 13 }}>
              Verify Email →
            </Link>
          </div>
        )}

        {selectedRole === 'organizer' && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
            Organiser accounts are created by the Admin. Contact the Felicity admin team for access.
          </div>
        )}
        {selectedRole === 'admin' && (
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)' }}>
            Admin access is restricted. Use your assigned credentials.
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    participantType: 'EXTERNAL', collegeName: '', contactNumber: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'participantType' && value === 'IIIT') {
      setForm(prev => ({ ...prev, participantType: value, collegeName: 'International Institute of Information Technology, Hyderabad' }));
    } else if (name === 'participantType' && value !== 'IIIT') {
      setForm(prev => ({ ...prev, participantType: value, collegeName: '' }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      payload.interests = [];
      await API.post('/auth/register', payload);
      setSuccess('Registration successful! Check your email for the OTP code.');
      setTimeout(() => navigate('/verify-email', { state: { email: form.email, password: form.password } }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">FELICITY</div>
        <div className="auth-subtitle">Create your participant account</div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" name="firstName" className="form-input" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" name="lastName" className="form-input" value={form.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Participant Type</label>
            <select name="participantType" className="form-select" value={form.participantType} onChange={handleChange}>
              <option value="EXTERNAL">External</option>
              <option value="IIIT">IIIT Student</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" className="form-input" placeholder={form.participantType === 'IIIT' ? 'yourname@iiit.ac.in' : 'you@email.com'} value={form.email} onChange={handleChange} required />
            {form.participantType === 'IIIT' && <div className="form-hint">Must be an IIIT institute email</div>}
          </div>
          <div className="form-group">
            <label className="form-label">College / Organization</label>
            <input
              type="text"
              name="collegeName"
              className="form-input"
              value={form.collegeName}
              onChange={handleChange}
              readOnly={form.participantType === 'IIIT'}
              style={form.participantType === 'IIIT' ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
            />
            {form.participantType === 'IIIT' && (
              <div className="form-hint">Auto-filled for IIIT students</div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input type="text" name="contactNumber" className="form-input" value={form.contactNumber} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input" value={form.password} onChange={handleChange} required minLength={6} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input type="password" name="confirmPassword" className="form-input" value={form.confirmPassword} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider" style={{ margin: '24px 0' }} />
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-red)', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

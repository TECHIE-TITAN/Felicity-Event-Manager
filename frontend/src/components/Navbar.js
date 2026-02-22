import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide navbar on full-screen flows
  if (location.pathname === '/onboarding') return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const participantLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/events', label: 'Browse Events' },
    { to: '/clubs', label: 'Clubs' },
    { to: '/profile', label: 'Profile' },
  ];

  const organizerLinks = [
    { to: '/organizer/dashboard', label: 'Dashboard' },
    { to: '/organizer/events/create', label: 'Create Event' },
    { to: '/organizer/events', label: 'My Events' },
    { to: '/organizer/profile', label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin/dashboard',       label: 'Dashboard' },
    { to: '/admin/organizers',      label: 'Manage Clubs/Organisers' },
    { to: '/admin/password-resets', label: 'Password Reset Requests' },
    { to: '/admin/security',        label: 'Security' },
  ];

  let links = [];
  if (user?.role === 'participant') links = participantLinks;
  else if (user?.role === 'organizer') links = organizerLinks;
  else if (user?.role === 'admin') links = adminLinks;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">FELICITY</NavLink>
        {isAuthenticated && (
          <ul className="navbar-nav">
            {links.map(l => (
              <li key={l.to}>
                <NavLink to={l.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
            </li>
          </ul>
        )}
        {!isAuthenticated && (
          <ul className="navbar-nav">
            <li><NavLink to="/login" className="nav-link">Login</NavLink></li>
            <li><NavLink to="/register" className="btn btn-primary btn-sm">Register</NavLink></li>
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

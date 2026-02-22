import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import OrganizerForgotPassword from './pages/auth/OrganizerForgotPassword';

// Participant
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetail from './pages/participant/EventDetail';
import Clubs from './pages/participant/Clubs';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import ParticipantProfile from './pages/participant/Profile';
import Onboarding from './pages/participant/Onboarding';

// Organizer
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerEvents from './pages/organizer/EventsList';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import QRScanner from './pages/organizer/QRScanner';
import OrganizerProfile from './pages/organizer/Profile';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResetRequests from './pages/admin/PasswordResetRequests';
import SecurityMonitoring from './pages/admin/SecurityMonitoring';

const Home = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'participant') return <Navigate to="/dashboard" replace />;
  if (user.role === 'organizer') return <Navigate to="/organizer/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

const App = () => {
  const { user } = useAuth();

  return (
    <div className="app">
      <Navbar />
      <Routes>
        {/* Root */}
        <Route path="/" element={<Home />} />

        {/* Auth Routes */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/organizer-forgot-password" element={<OrganizerForgotPassword />} />

        {/* Onboarding — participant only */}
        <Route
          path="/onboarding"
          element={
            (() => {
              // user state may not have re-rendered yet after auto-login, so also check localStorage
              const storedUser = (() => { try { return JSON.parse(localStorage.getItem('felicity_user')); } catch { return null; } })();
              const resolvedUser = user || storedUser;
              return resolvedUser?.role === 'participant'
                ? <Onboarding />
                : <Navigate to="/login" replace />;
            })()
          }
        />

        {/* Protected Event / Club Routes (login required) */}
        <Route
          path="/events"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <BrowseEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <Clubs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clubs/:id"
          element={
            <ProtectedRoute roles={['participant', 'organizer', 'admin']}>
              <OrganizerDetail />
            </ProtectedRoute>
          }
        />

        {/* Participant Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['participant']}>
              <ParticipantDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={['participant']}>
              <ParticipantProfile />
            </ProtectedRoute>
          }
        />

        {/* Organizer Protected Routes */}
        <Route
          path="/organizer/dashboard"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/create"
          element={
            <ProtectedRoute roles={['organizer']}>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerEventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/scanner"
          element={
            <ProtectedRoute roles={['organizer']}>
              <QRScanner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/profile"
          element={
            <ProtectedRoute roles={['organizer']}>
              <OrganizerProfile />
            </ProtectedRoute>
          }
        />

        {/* Admin Protected Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organizers"
          element={
            <ProtectedRoute roles={['admin']}>
              <ManageOrganizers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/password-resets"
          element={
            <ProtectedRoute roles={['admin']}>
              <PasswordResetRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/security"
          element={
            <ProtectedRoute roles={['admin']}>
              <SecurityMonitoring />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={
          <div className="page-wrapper">
            <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
              <h1 style={{ fontSize: 80, fontWeight: 900, color: 'var(--accent-red)', fontFamily: 'var(--font-display)' }}>404</h1>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Page Not Found</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>The page you're looking for doesn't exist.</p>
              <a href="/" className="btn btn-primary">Go Home</a>
            </div>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default App;

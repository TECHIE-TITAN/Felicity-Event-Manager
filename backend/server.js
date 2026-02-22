require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const startCronJobs = require('./cron/analytics');

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts. Please try again later.' }
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: 'Too many registration attempts. Please try again later.' }
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/participants', require('./routes/participants'));
app.use('/api/organizers', require('./routes/organizers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/discussion', require('./routes/discussion'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'Felicity backend running' }));

// Start cron jobs
startCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Felicity server running on port ${PORT}`));

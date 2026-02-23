# Felicity Event Manager

A full-stack event management platform built for **Felicity Fest** — a college cultural festival. It covers the complete lifecycle of an event: creation, registration, payment verification, QR-based attendance, merchandise orders, live analytics, and a participant-facing portal.

---

## Features

### Participants
- Register / login with email OTP verification and Google reCAPTCHA
- Browse published events, filter by tags/type, view organizer profiles
- Register for events (free or paid with payment-proof upload)
- Receive QR-code tickets via email
- Track registrations and merchandise orders on a personal dashboard
- Forgot-password flow with OTP

### Organizers
- Dedicated login with credentials issued by admin
- Create & manage events (standard, team, merchandise)
- Publish → Ongoing → Completed event lifecycle
- **QR Attendance** — open camera, scan a participant's QR code, and mark present instantly
- Manual attendance override with audit log
- Live attendance dashboard with auto-refresh
- Export attendance CSV
- Merchandise variant management and order approval/rejection
- Event discussion board with pin & delete moderation
- Per-event analytics (registration trend, revenue trend)

### Admin
- Manage organizer accounts (create, reset passwords)
- Review and approve organizer password-reset requests
- Security monitoring (IP block / audit log)
- System-wide dashboard

### System
- JWT authentication with role-based access (participant / organizer / admin)
- Rate limiting on login & registration endpoints
- Nightly analytics snapshot cron job
- Discord webhook integration for security/audit alerts
- Cloudinary storage for payment-proof images
- Nodemailer (Gmail SMTP) for transactional email

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Recharts, html5-qrcode, jsPDF |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB Atlas |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Email | Nodemailer (Gmail SMTP) |
| File Storage | Cloudinary |
| CAPTCHA | Google reCAPTCHA v2 |

---

## Project Structure

```
Felicity_Event_Manager/
├── backend/
│   ├── config/          # DB & Cloudinary setup
│   ├── cron/            # Nightly analytics snapshot
│   ├── middleware/       # JWT auth, reCAPTCHA verification
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route handlers
│   ├── utils/           # Email, QR generation, Discord webhook
│   ├── seed.js          # Creates the first admin user
│   └── server.js        # Entry point
└── frontend/
    └── src/
        ├── api/         # Axios instance
        ├── components/  # Shared components (Navbar, ProtectedRoute)
        ├── context/     # Auth context
        └── pages/
            ├── admin/
            ├── auth/
            ├── organizer/
            └── participant/
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833)
- A [Cloudinary](https://cloudinary.com/) account (free tier is fine)
- (Optional) Google reCAPTCHA v2 keys and a Discord webhook URL

### 1 — Clone & install

```bash
git clone https://github.com/<your-username>/felicity-event-manager.git
cd felicity-event-manager

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2 — Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in MONGO_URI, JWT_SECRET, SMTP_*, CLOUDINARY_*, RECAPTCHA_* in backend/.env

# Frontend (only needed if you add REACT_APP_ vars)
cp frontend/.env.example frontend/.env
```

See [`backend/.env.example`](backend/.env.example) for all available variables.

### 3 — Seed the admin user

```bash
node backend/seed.js
```

This creates an admin account using `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (defaults: `admin@felicity.fest` / `Admin@Felicity2024`). **Change the password after first login.**

### 4 — Run in development

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:3000)
cd frontend && npm start
```

The React dev server proxies all `/api` requests to `http://localhost:5000` automatically.

---

## Environment Variables

All variables are documented in [`backend/.env.example`](backend/.env.example). Key ones:

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret used to sign JWTs — use a long random string |
| `BREVO_API_KEY` | ✅ | Brevo API key for transactional email |
| `EMAIL_FROM` | ✅ | Verified sender address in your Brevo account |
| `FRONTEND_URL` | ✅ | Allowed CORS origin (e.g. `https://your-app.vercel.app`) |
| `CLOUDINARY_*` | ✅ | Cloudinary cloud name, API key & secret |
| `RECAPTCHA_SECRET_KEY` | ⬜ | Skipped automatically when missing (dev-friendly) |
| `DISCORD_WEBHOOK_URL` | ⬜ | Discord webhook for security alerts |

---

## Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm start` | Start in production mode |
| `node seed.js` | Create the initial admin user |

### Frontend

| Command | Description |
|---|---|
| `npm start` | Start dev server on port 3000 |
| `npm run build` | Production build to `frontend/build/` |

---

## License

This project is for academic/portfolio use. Feel free to fork and adapt.

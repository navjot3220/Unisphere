# UniSphere — Smart Campus Events & Clubs Hub

A full-stack platform for posting campus events, registering with signed QR passes, tracking attendance, managing clubs, and giving coordinators and admins AI-driven insights (recommendations, attendance forecasts, smart scheduling, engagement analytics).

Stack: **React + Vite + Tailwind** (client) · **Node + Express + MongoDB/Mongoose** (server) · **JWT auth** · **HMAC-signed QR passes**.

---

## Quick start

You need Node 18+ and Docker (for MongoDB). Two terminals.

### 1. Database

```bash
docker compose up -d      # starts MongoDB on :27017
```

No Docker? Point `MONGO_URI` at any MongoDB (e.g. a free MongoDB Atlas cluster).

### 2. Server

```bash
cd server
cp .env.example .env       # then edit JWT_SECRET and QR_SECRET
npm install
npm run seed               # loads demo users, clubs, events, registrations
npm run dev                # http://localhost:5000
```

### 3. Client

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

Open **http://localhost:5173** and log in with any account below.

---

## Demo accounts

Password for **all** accounts: `Password123`

| Email | Role | Notes |
|-------|------|-------|
| `admin@unisphere.dev` | Admin | Approval queue, insights, heatmap, user roles |
| `rhea@unisphere.dev` | Faculty | Coding Club coordinator, has events + smart slots |
| `dan@unisphere.dev` | Faculty | Business & Arts coordinator |
| `sam@unisphere.dev` | Student | CS, Coding Club, has upcoming passes |
| `jordan@unisphere.dev` | Student | Business |
| `fatima@unisphere.dev` | Student | Arts |

---

## Features

**Students**
- Browse/search events, filter by category
- One-tap registration with a signed **QR digital pass** (styled as a real ticket)
- **🎯 Recommended for me** — content-based scoring over your clubs, attendance history, interests, and department
- `.ics` calendar export, engagement score, join/leave clubs

**Coordinators (faculty)**
- Create events (go to admin for approval)
- **Smart scheduling** — best day/time slot by historical registrations and show-up rate
- **Attendance forecast** — expected turnout from category history
- Live **QR check-in** (camera scanner) + manual check-in, attendance progress
- Create clubs

**Admins**
- Approve/reject events with reasons
- **Automated insights** — underperforming categories, near-capacity events, schedule overlaps, low-participation departments
- **Engagement heatmap** — department × category
- Platform stats, user role management

**System**
- JWT + bcrypt auth, role-based route guards, zod validation, helmet + rate limiting
- QR passes are **HMAC-SHA256 signed** and verified in constant time — screenshots of someone else's pass won't validate, and tokens can't be forged
- Automated 24h email reminders (node-cron; logs to console in dev, real SMTP in prod)

---

## AI features — how they work (no external API key needed)

All "AI" is transparent, rule-based ML you can explain in a viva:

| Feature | Method |
|---------|--------|
| Event recommendations | Content-based scoring: club membership, category affinity from attendance, declared interests, department popularity, recency |
| "Students also attended" | Item-to-item collaborative filtering on co-registration counts |
| Attendance forecast | Historical show-up rate for the category × current registrations |
| Smart scheduling | Aggregated registrations + check-in rate bucketed by (day of week, time slot) |
| Engagement score | Weighted activity (check-ins count double, recent activity boosted) |
| Admin insights | Threshold rules over aggregated participation, capacity, and schedule data |

---

## Project structure

```
unisphere/
├── docker-compose.yml         # MongoDB
├── server/
│   └── src/
│       ├── index.js           # Express app + scheduler
│       ├── models/            # User, Club, Event, Registration
│       ├── middleware/        # auth (JWT + roles), validation, errors
│       ├── routes/            # auth, events, registrations, clubs, recommendations, admin
│       ├── services/          # qr (HMAC), recommender, analytics, reminders
│       └── seed.js            # demo data
└── client/
    └── src/
        ├── api/client.js      # fetch wrapper
        ├── context/           # auth context
        ├── components/ui.jsx  # Navbar, EventCard, TicketPass, guards
        └── pages/             # Landing, Login, Signup, Events, EventDetails,
                               # Clubs, Student/Faculty dashboards, CreateEvent,
                               # Attendance, AdminPanel
```

---

## Deployment notes

- **Client** → Vercel or Netlify. Set the API base (currently proxied at `/api`) to your server URL, or configure a rewrite.
- **Server** → Render, Railway, or Fly.io. Set `MONGO_URI`, `JWT_SECRET`, `QR_SECRET`, `CLIENT_ORIGIN`, and optional SMTP vars.
- **Database** → MongoDB Atlas free tier works out of the box.

## API surface (quick reference)

```
POST /api/auth/signup | login        GET /api/auth/me
GET  /api/events  (filters: category, club, from, to, q)
POST /api/events                     GET /api/events/:id
GET  /api/events/:id/also-attended   GET /api/events/:id/forecast
GET  /api/events/:id/ics             GET /api/events/:id/attendance
GET  /api/events/smart-slots/:category
POST /api/registrations/:eventId     GET /api/registrations/mine
POST /api/registrations/check-in/qr  POST /api/registrations/check-in/manual/:id
GET  /api/clubs                      POST /api/clubs  /:id/join  /:id/leave
GET  /api/recommendations            GET /api/recommendations/engagement
GET  /api/admin/stats | heatmap | insights | pending-events | users
POST /api/admin/events/:id/approve | reject
```

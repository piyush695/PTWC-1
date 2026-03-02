# 🏆 Hola Prime World Cup — Full Stack Application

Complete web platform for the Hola Prime Prop Trading World Cup tournament.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React, Tailwind CSS |
| **Backend** | Next.js API Routes (Node.js) |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Real-time** | Socket.io / WebSocket |
| **Auth** | Custom JWT (jose) + bcrypt |
| **Email** | Nodemailer (SendGrid SMTP) |
| **Broker** | MT5/cTrader REST API (abstraction layer included) |

---

## Project Structure

```
holaprime-worldcup/
├── prisma/
│   ├── schema.prisma          ← Full database schema
│   └── seed.ts                ← Countries, admin user, tournament config
│
├── src/
│   ├── app/
│   │   ├── page.tsx            ← Homepage / landing
│   │   ├── register/           ← 3-step registration flow
│   │   ├── leaderboard/        ← Live qualifier leaderboard
│   │   ├── bracket/            ← H2H bracket visualization
│   │   ├── news/               ← CMS-powered news
│   │   ├── dashboard/          ← Trader dashboard
│   │   └── admin/
│   │       ├── page.tsx        ← Admin overview dashboard
│   │       ├── traders/        ← KYC management, disqualify
│   │       ├── bracket/        ← Seed bracket, advance matches
│   │       ├── cms/            ← Blog/news editor
│   │       ├── crm/            ← CRM + bulk email
│   │       └── config/         ← Tournament settings
│   │
│   ├── api/
│   │   ├── auth/               ← login, register, logout
│   │   ├── leaderboard/        ← Live qualifier standings
│   │   ├── bracket/            ← Bracket + live H2H scores
│   │   ├── admin/
│   │   │   ├── traders/        ← KYC approve/reject, disqualify
│   │   │   ├── bracket/        ← Seed, advance, create matches
│   │   │   ├── cms/            ← Post CRUD
│   │   │   ├── crm/            ← CRM activities, bulk email
│   │   │   ├── config/         ← Tournament config CRUD
│   │   │   └── stats/          ← Dashboard metrics
│   │   └── webhook/broker/     ← MT5 webhook handler
│   │
│   └── lib/
│       ├── db.ts               ← Prisma singleton
│       ├── auth.ts             ← JWT, bcrypt, middleware
│       ├── scoring.ts          ← Scoring engine + anti-cheat
│       ├── bracket.ts          ← H2H bracket logic + seeding
│       ├── broker.ts           ← MT5/cTrader API abstraction
│       └── email.ts            ← Email service + templates
```

---

## Setup

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (for real-time leaderboard caching)

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your database URL, SMTP, broker API keys
```

### 4. Database setup
```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
```

### 5. Run development server
```bash
npm run dev
```

---

## Key Pages

| URL | Description |
|---|---|
| `/` | Homepage / landing |
| `/register` | 3-step trader registration |
| `/leaderboard` | Live qualifier leaderboard |
| `/bracket` | H2H tournament bracket |
| `/news` | News & announcements (CMS) |
| `/dashboard` | Trader dashboard |
| `/admin` | Admin panel |
| `/admin/traders` | Trader management + KYC |
| `/admin/bracket` | Bracket seeding + match advancement |
| `/admin/cms` | Content management |
| `/admin/crm` | CRM + bulk email |
| `/admin/config` | Tournament configuration |

---

## API Reference

### Public
```
GET  /api/leaderboard          → Qualifier standings
GET  /api/bracket              → Bracket + live H2H scores
POST /api/auth/register        → Create trader account
POST /api/auth/login           → Login
```

### Admin (requires auth)
```
GET/PATCH  /api/admin/traders          → Manage traders + KYC
POST       /api/admin/bracket?action=  → seed | advance | create-match
GET/POST   /api/admin/cms              → Post CRUD
GET/POST   /api/admin/crm             → CRM activities + bulk email
GET/PATCH  /api/admin/config           → Tournament settings
GET        /api/admin/stats            → Dashboard metrics
```

### Webhooks
```
POST /api/webhook/broker       → MT5 trade events (signature-verified)
```

---

## Broker Integration

The platform uses an abstraction layer in `src/lib/broker.ts`.
Replace the mock implementations with your actual MT5/cTrader API calls.

Required broker API capabilities:
- `GET /accounts/{id}` — balance, equity, margin
- `GET /accounts/{id}/trades` — open + closed positions
- `POST /accounts` — create new funded account
- Webhook: trade.opened, trade.closed, drawdown.breach.daily/total

---

## Anti-Cheat System

Automatic detection in `src/lib/scoring.ts`:
- **Min trade duration** — flags HFT/arbitrage (< configurable threshold)
- **Max position size** — flags overleveraged trades (> % of balance)
- **Trades-per-hour** — flags bot trading (> configurable limit)
- **Drawdown breach** — auto-disqualifies via webhook
- Flagged trades appear in admin trader detail view

---

## Tournament Scoring

**Qualifier**: Net % Return on $10K account over 12 days.
Tiebreaker 1: Lower max drawdown.
Tiebreaker 2: More trades.

**Knockout Rounds**: Same — H2H weekly competition.
Minimum 10 trades per round required.

---

## Deployment

```bash
# Production build
npm run build
npm start

# Recommended: Deploy on Vercel (frontend) + Railway (PostgreSQL + Redis)
# Set all environment variables in your deployment platform
```

---

## First Admin Login
After seeding, log in at `/admin` with:
- Email: `admin@holaprime.com` (or ADMIN_SEED_EMAIL)
- Password: `ChangeMe123!` (or ADMIN_SEED_PASSWORD)

**Change the password immediately after first login.**

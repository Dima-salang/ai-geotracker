# Iozera GeoTracker

Multi-LLM **AI visibility** platform for local businesses. GeoTracker checks whether tools like ChatGPT, Gemini, Claude, and Perplexity recommend your business when customers ask “who should I hire near me?”—then returns a simple score, competitor context, and actionable fixes.

This repository is a **prototype**: marketing pages are client-friendly, the operator admin is open in the navbar, and several flows use sample or simulated data.

## What it does

| Audience | Experience |
|----------|------------|
| **Business owners (clients)** | Enter a website on the landing page, run a free visibility check, view a live scorecard, sign in with Google, and use a personal dashboard. |
| **Agents & team leaders** | Register as an agent, join teams, and work balanced leads in the dashboard. |
| **Operators (internal)** | Use `/admin` to manage AI providers, organizations, businesses, scans, users, teams, and leads. |

Domain language and glossary: [`CONTEXT.md`](./CONTEXT.md). Visual system: [`DESIGN.md`](./DESIGN.md).

---

## Features

### Public marketing site

Modular Next.js layout shared across pages:

- **Shared chrome** — `SiteNavbar`, `SiteFooter`, `MarketingLayout`, sign-in modal (Google OAuth via Supabase).
- **Home (`/`)** — Hero with left-aligned copy + domain input, dithered earth graphic (no glow), blueprint grid background.
- **Live visibility check** — SSE stream from `POST /api/v1/scan`; wavy **loading blob** during progress; **ResultsDashboard** with streaming provider cards.
- **Sections** — Network stats, value bento grid, interactive “how it works” steps, pricing teaser, FAQ teaser, CTA banner.
- **Services (`/services`)** — Three service cards (visibility check, competitor comparison, action plan).
- **Pricing (`/pricing`)** — Free / Premium / Done-for-you tiers with trust copy.
- **FAQ (`/faq`)** — Accordion Q&A in plain language (AI visibility, scoring, setup, fixes).
- **Design system** — Neo-brutalist / technical retro-futurist tokens in `lib/marketing/design-tokens.ts` (zero radius, mono micro-copy, electric blue accent).
- **Mobile** — Responsive nav menu, touch targets, `100dvh` hero, reduced-motion support.
- **Dev preview** — Hidden control (bottom-left corner) toggles loading blob + results dashboard with sample data for UI review.

### Client dashboard (`/dashboard`)

After Google sign-in:

- **Sidebar workspace** — Profile, Audit, History, Settings; optional **Leads** and **Team** tabs for agents.
- **Audit tab** — Run scans and view the same style of results scorecard as the landing page.
- **History** — Past scans.
- **Settings** — Tier simulation (prototype upgrades).
- **Verification gate** — Email verification flow where configured.

### Agent onboarding

- **`/agent/register`** — Agent registration linked to teams and organization model.

### Operator admin (`/admin`)

Accessible from the **navbar for all users** during the prototype (no RBAC gate yet):

| Route | Purpose |
|-------|---------|
| `/admin` | Hub dashboard with stats and links |
| `/admin/providers` | AI provider configs (models, API keys, timeouts, rotation) |
| `/admin/organizations` | Franchise / org CRUD |
| `/admin/businesses` | Business directory |
| `/admin/scans` | Scan records |
| `/admin/results` | Scan result rows |
| `/admin/users` | User profiles and tiers |
| `/admin/teams` | Teams and agent assignment |
| `/admin/leads` | Sales leads pipeline |

Server-rendered pages with client tables; shared **AdminChrome**, **AdminFooter**, and API helpers under `lib/api/`.

### Scan engine (backend)

- **LangGraph workflow** — Classify business, ground location/services, build local search prompts, query multiple **auditing engines** in parallel.
- **SSE progress** — Stages: initiated → validated → classification → geocoding → querying_providers → complete; per-provider results streamed as they finish.
- **Scoring** — 0–100 visibility score; green / yellow / red per provider; recommendations list.
- **Rate limiting** — Guest scan limits (403) with upgrade messaging on the frontend.
- **Telemetry** — Engagement events (`click_cta`, `view_report`, etc.) and observability stats for admin.
- **Encrypted API keys** — Provider credentials stored with rotation support for rate-limit retries.

### Auth & data

- **Supabase Auth** — Google OAuth; callback at `/auth/callback`.
- **SQLite** (local dev) / configurable DB via SQLAlchemy + Alembic migrations.
- **REST API** — FastAPI under `/api/v1/` (see [API overview](#api-overview) below).

---

## Repository layout

```
iozera-geotracker/
├── CONTEXT.md              # Product glossary
├── DESIGN.md               # UI / brand specification
├── README.md               # This file
├── docs/
│   ├── brd.md              # Business requirements
│   ├── srs.md              # Software requirements
│   └── adr/                # Architecture decision records
├── src/
│   ├── frontend/           # Next.js 16 (App Router), React 19, Tailwind v4
│   │   ├── app/            # Routes (marketing, dashboard, admin, agent)
│   │   ├── components/     # UI (marketing/, admin/, dashboard/, ResultsDashboard)
│   │   ├── hooks/          # e.g. useVisibilityScan
│   │   └── lib/            # API client, marketing copy & tokens
│   └── backend/            # FastAPI, LangGraph, SQLAlchemy
│       ├── app/
│       │   ├── api/v1/     # REST + SSE scan endpoint
│       │   ├── graph/      # Scan workflow nodes
│       │   ├── services/   # Scan, search, provider, user services
│       │   └── models/     # DB schema & encryption
│       ├── alembic/        # Migrations
│       └── tests/
└── .agents/skills/         # Agent skills for this repo
```

---

## Getting started

### Prerequisites

- **Node.js** 20+ (or Bun) for the frontend
- **Python** 3.11+ for the backend
- **Supabase** project (Google OAuth enabled) for sign-in
- API keys for AI/search providers you enable in admin (Gemini, OpenAI, Groq, Perplexity, etc.)

### Backend

```bash
cd src/backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment (create .env with provider keys, DB URL, etc.)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

On startup the API seeds a default organization, operator user, and provider configs when the database is empty.

### Frontend

```bash
cd src/frontend
npm install   # or: bun install

# .env.local example:
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

npm run dev   # http://localhost:3000
```

### Quick manual test

1. Open **Home** → enter a domain → **Check score**.
2. Watch the **loading blob**, then the **scorecard**.
3. Use the **bottom-left preview dot** to toggle blob + dashboard without scanning.
4. Open **Admin** from the navbar → explore provider and scan management.
5. **Sign in** → **Dashboard** for saved session flows.

---

## API overview

Base URL: `http://localhost:8000/api/v1` (when running locally).

| Area | Examples |
|------|----------|
| **Scan** | `POST /scan` (SSE), `GET /scans`, `GET /scans/{id}` |
| **Providers** | `GET/POST/DELETE /providers` |
| **CRM** | `GET/POST/PUT/DELETE` organizations, businesses, users, teams, leads |
| **Stats** | `GET /public-stats`, `GET /admin/stats`, `GET /observability/stats` |
| **Engagement** | `POST /telemetry/engagement` |
| **Agent** | `POST /users/register-agent`, `POST /teams/assign-agent` |

Full route list: `src/backend/app/api/v1/endpoints.py`.

---

## Frontend architecture notes

- **Marketing** composes section components under `components/marketing/landing/`; scan logic lives in `hooks/useVisibilityScan.ts`.
- **ResultsDashboard** — Large scorecard: overall score, provider matrix, per-prompt breakdowns, markdown-rendered AI responses, recommendations.
- **Admin** — Server components fetch via `lib/api/server.ts`; clients refresh with `lib/admin/refresh.ts`.
- **Styling** — Global tokens in `app/globals.css`; loading blob animations in `.loading-blob-*` classes.

---

## Documentation

| Doc | Description |
|-----|-------------|
| [`docs/brd.md`](./docs/brd.md) | Business requirements & tiers |
| [`docs/srs.md`](./docs/srs.md) | Software requirements |
| [`docs/adr/0001-supabase-auth-and-postgres.md`](./docs/adr/0001-supabase-auth-and-postgres.md) | Auth & database direction |
| [`docs/adr/0002-sse-on-serverless.md`](./docs/adr/0002-sse-on-serverless.md) | SSE streaming constraints |
| [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md) | GitHub issue workflow |
| [`AGENTS.md`](./AGENTS.md) | Instructions for coding agents |

---

## Prototype limitations

- **Admin** is linked in the public navbar without authentication checks.
- **Subscriptions** are simulated in the UI; billing is not production-ready.
- **LinkedIn OAuth** may be documented but Google is the primary path implemented.
- **Build**: `next build` may require the API up for admin pages that fetch at build time.
- Some copy and metrics on the landing page are illustrative (e.g. aggregate scan counts).

---

## License

Private / proprietary — Iozera. Contact the maintainers for use outside this prototype.

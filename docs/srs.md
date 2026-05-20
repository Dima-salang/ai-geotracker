# Iozera GeoTracker — Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for Iozera GeoTracker v0.1 (prototype). It covers the multi-LLM visibility auditing platform that allows local business owners to assess their presence across AI recommendation ecosystems.

### 1.2 Scope
The prototype implements the Quick Scan (freemium) workflow only. Full Audit, subscription billing, and admin features are scoped for later phases.

### 1.3 Definitions

| Term | Definition |
|---|---|
| Quick Scan | One-shot freemium visibility check across 5 LLM providers |
| SSE | Server-Sent Events — HTTP streaming protocol for progress updates |
| Client | Business owner using the platform |
| Business | The entity being scanned (name, domain, industry, location) |
| Provider | An LLM service queried during a scan (e.g., Gemini, Perplexity) |

## 2. System Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────┐
│                Browser (Client)                   │
│  Next.js 16 + Tailwind v4 + Supabase Auth SDK     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS + SSE
                   ▼
┌─────────────────────────────────────────────────┐
│             FastAPI Cloud (Backend)               │
│  FastAPI + LangGraph + litellm                    │
│                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Validate  │→│ Classify+Geo │→│ Parallel LLM│ │
│  └──────────┘  └──────────────┘  └──────┬─────┘ │
│                                         │        │
│  ┌──────────────────────────────────────┘        │
│  ▼                                               │
│  ┌───────┐  ┌──────────┐                         │
│  │ Score │← │ Parse     │                         │
│  └───┬───┘  └──────────┘                         │
│      │ SSE                                       │
└──────┼──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│               External Services                   │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │Nominatim │  │Supabase  │  │LLM Providers    │ │
│  │(Geo)     │  │(Auth+DB) │  │(5+ APIs)       │ │
│  └──────────┘  └──────────┘  └────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend framework | Next.js 16 | SSR, Vercel deploy, React ecosystem |
| Styling | Tailwind v4 | Utility-first, fast prototyping |
| Auth | Supabase Auth | Bundled with DB, OOTB OAuth |
| Database | Supabase PostgreSQL | Serverless, cheap prototype |
| Backend framework | FastAPI | Async-native, SSE support, FastAPI Cloud |
| Orchestration | LangGraph | Graph-based state machine for workflow |
| LLM abstraction | litellm | Unified interface across 30+ providers |
| Geospatial | Nominatim | Free, no API key needed |
| Deploy (frontend) | Vercel | Optimized for Next.js |
| Deploy (backend) | FastAPI Cloud | Serverless, SSE-capable |

## 3. Functional Requirements

### FR-1: Authentication

| ID | Description | Priority |
|---|---|---|
| FR-1.1 | User can sign up using Google OAuth | P0 |
| FR-1.2 | User can sign up using LinkedIn OAuth | P0 |
| FR-1.3 | User can sign out | P0 |
| FR-1.4 | Session persists across page reloads | P0 |
| FR-1.5 | Unauthenticated users are redirected to sign-in for scan functionality | P1 |
| FR-1.6 | Unauthenticated users can view landing, pricing, services, and FAQs pages | P0 |

### FR-2: Quick Scan Submission

| ID | Description | Priority |
|---|---|---|
| FR-2.1 | User can enter business name (required) | P0 |
| FR-2.2 | User can enter website domain (required) | P0 |
| FR-2.3 | User can select industry from predefined list (required) | P0 |
| FR-2.4 | User can enter primary city (required) | P0 |
| FR-2.5 | User can enter primary state/region (required) | P0 |
| FR-2.6 | User can select country (required) | P0 |
| FR-2.7 | User can optionally specify service focuses | P1 |
| FR-2.8 | User can optionally specify target suburbs | P2 |
| FR-2.9 | Form validates all required fields before submission | P0 |
| FR-2.10 | Domain format is validated (basic URL/domain regex) | P0 |
| FR-2.11 | User cannot submit a new scan while one is in progress | P1 |

### FR-3: Scan Execution

| ID | Description | Priority |
|---|---|---|
| FR-3.1 | Backend validates input fields before starting the scan | P0 |
| FR-3.2 | Backend classifies the business (industry → radius, prompt templates, service categories) | P0 |
| FR-3.3 | Backend resolves business coordinates via Nominatim | P0 |
| FR-3.4 | Backend expands to nearby suburbs (where available) | P1 |
| FR-3.5 | Backend generates industry-specific prompts for each suburb/service combination | P0 |
| FR-3.6 | Prompt templates avoid robotic wording, vary intent | P0 |
| FR-3.7 | Backend queries all configured LLM providers in parallel | P0 |
| FR-3.8 | Each provider call has a configurable timeout ceiling | P0 |
| FR-3.9 | Transient failures and rate limits are retried (configurable retry count) | P0 |
| FR-3.10 | Auth failures and invalid requests are NOT retried | P0 |
| FR-3.11 | If one provider fails, the scan continues with remaining providers | P0 |
| FR-3.12 | Concurrency is limited via semaphore to prevent API exhaustion | P1 |
| FR-3.13 | OpenRouter is used as fallback if a direct provider API is unavailable | P2 |

### FR-4: Scan Results Display

| ID | Description | Priority |
|---|---|---|
| FR-4.1 | Results stream to the frontend via SSE as each provider completes | P0 |
| FR-4.2 | Client sees per-provider status (green/yellow/red) with reason | P0 |
| FR-4.3 | Client sees overall visibility score (0-100) | P0 |
| FR-4.4 | Client sees rank position per provider (if mentioned) | P0 |
| FR-4.5 | Client sees whether domain was matched for each mention | P0 |
| FR-4.6 | Client sees audit summary (green/yellow/red counts) | P0 |
| FR-4.7 | Client sees actionable recommendations (if any) | P1 |
| FR-4.8 | Results are persisted in the database for history | P1 |

### FR-5: Dashboard

| ID | Description | Priority |
|---|---|---|
| FR-5.1 | User can view their scan history (date, business name, score) | P0 |
| FR-5.2 | User can click a past scan to view full results | P0 |
| FR-5.3 | Dashboard shows remaining scan credits (if applicable) | P2 |

### FR-6: Upsell / Conversion

| ID | Description | Priority |
|---|---|---|
| FR-6.1 | Non-paying users see a prompt to upgrade for Full Audit features | P1 |
| FR-6.2 | Pricing page describes what each tier includes | P1 |
| FR-6.3 | Free scan has a cooldown period (configurable, default 30 days) | P1 |

### FR-7: Static Pages

| ID | Description | Priority |
|---|---|---|
| FR-7.1 | Landing page describes GeoTracker and includes a CTA | P0 |
| FR-7.2 | Pricing page shows free vs paid tiers | P1 |
| FR-7.3 | Services page describes what Iozera GeoTracker offers | P1 |
| FR-7.4 | FAQs page answers common questions | P1 |

## 4. Non-Functional Requirements

### NFR-1: Performance

| ID | Description | Target |
|---|---|---|
| NFR-1.1 | Quick Scan completes within 20 seconds for 5 providers | < 20s P95 |
| NFR-1.2 | First SSE byte reaches client within 3 seconds of submission | < 3s |
| NFR-1.3 | Page load time (static pages) | < 1.5s |
| NFR-1.4 | API response time (non-scan endpoints) | < 500ms |

### NFR-2: Reliability

| ID | Description | Target |
|---|---|---|
| NFR-2.1 | Provider call success rate | > 99% |
| NFR-2.2 | Scan completes successfully (no critical errors) | > 95% |
| NFR-2.3 | Zero failed scans due to a single provider outage | Always |
| NFR-2.4 | System available during provider API degradation | Always |

### NFR-3: Security

| ID | Description | Priority |
|---|---|---|
| NFR-3.1 | API keys are stored as environment variables, never in code | P0 |
| NFR-3.2 | API keys are never exposed to the frontend | P0 |
| NFR-3.3 | All endpoints behind auth (except static pages) | P0 |
| NFR-3.4 | Input validation and sanitization on all user-supplied fields | P0 |
| NFR-3.5 | Rate limiting on scan submissions per user | P1 |

### NFR-4: Scalability

| ID | Description | Target |
|---|---|---|
| NFR-4.1 | System handles concurrent scans from multiple users | > 10 concurrent |
| NFR-4.2 | System handles burst of 50 concurrent scans | Graceful degradation |
| NFR-4.3 | Database queries complete in < 100ms under load | < 100ms P95 |

### NFR-5: Observability

| ID | Description | Priority |
|---|---|---|
| NFR-5.1 | Every scan generates a unique trace ID | P0 |
| NFR-5.2 | Provider latency is logged per-call | P0 |
| NFR-5.3 | Token usage is tracked per provider per scan | P1 |
| NFR-5.4 | Parse failures are logged with context | P1 |
| NFR-5.5 | Provider success/error rates are aggregated | P2 |

## 5. API Specification

### 5.1 Endpoints

#### POST /api/v1/auth/signup
Frontend delegates to Supabase Auth directly. No custom endpoint.

#### POST /api/v1/auth/signin
Frontend delegates to Supabase Auth directly. No custom endpoint.

#### POST /api/v1/auth/signout
Frontend delegates to Supabase Auth directly. No custom endpoint.

#### GET /api/v1/user/me
Returns current user profile and scan credits.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "auth_provider": "google",
  "scans_remaining": null,
  "tier": "free"
}
```

#### POST /api/v1/scan
Initiates a Quick Scan. Returns SSE stream.

**Request:**
```json
{
  "business_name": "Example Dental",
  "domain": "exampledental.com",
  "industry": "dentist",
  "primary_city": "Houston",
  "primary_state": "Texas",
  "country": "USA",
  "service_focuses": ["Invisalign", "Dental Implants"],
  "target_suburbs": ["Katy", "Sugar Land"]
}
```

**Response:** `text/event-stream`

SSE events:

```
event: progress
data: {"stage": "geocoding", "status": "starting"}

event: progress
data: {"stage": "geocoding", "status": "complete", "lat": 29.76, "lng": -95.37}

event: progress
data: {"stage": "prompts", "count": 12}

event: provider_start
data: {"provider": "gemini", "prompts": 12}

event: provider_result
data: {"provider": "gemini", "status": "green", "score": 78, "rank": 2, "domain_match": true}

event: provider_result
data: {"provider": "perplexity", "status": "red", "score": 0, "mentioned": false}

event: complete
data: {"overall_score": 62, "summary": {"green": 1, "yellow": 2, "red": 2}}
```

#### GET /api/v1/scans
Returns scan history for the current user.

**Response:**
```json
{
  "scans": [
    {
      "id": "uuid",
      "business_name": "Example Dental",
      "overall_score": 62,
      "status": "partial_visibility",
      "created_at": "2026-05-20T12:00:00Z"
    }
  ]
}
```

#### GET /api/v1/scans/{id}
Returns full details of a specific scan.

**Response:**
```json
{
  "id": "uuid",
  "business_name": "Example Dental",
  "domain": "exampledental.com",
  "overall_score": 62,
  "status": "partial_visibility",
  "summary": {"green": 1, "yellow": 2, "red": 2},
  "results": [
    {
      "provider": "gemini",
      "status": "green",
      "score": 78,
      "rank_position": 2,
      "mentioned": true,
      "actionable": true,
      "domain_match": true,
      "reason": "Business appears in top 3 with actionable info"
    }
  ],
  "recommendations": [
    {
      "severity": "high",
      "issue": "No service pages for Invisalign",
      "recommendation": "Create a dedicated Invisalign service page"
    }
  ],
  "created_at": "2026-05-20T12:00:00Z"
}
```

## 6. Data Model

### User
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  auth_provider TEXT,  -- 'google' | 'linkedin'
  tier TEXT DEFAULT 'free',  -- 'free' | 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_scan_at TIMESTAMPTZ
);
```

### Scan
```sql
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  business_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT NOT NULL,
  primary_city TEXT NOT NULL,
  primary_state TEXT NOT NULL,
  country TEXT NOT NULL,
  service_focuses JSONB DEFAULT '[]',
  target_suburbs JSONB DEFAULT '[]',
  overall_score INTEGER,
  status TEXT DEFAULT 'pending',  -- 'pending' | 'running' | 'complete' | 'partial' | 'failed'
  summary JSONB,
  recommendations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### ScanResult (per-provider)
```sql
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) NOT NULL,
  provider TEXT NOT NULL,  -- 'gemini' | 'perplexity' | 'groq' | 'deepseek' | 'mistral'
  status TEXT NOT NULL,  -- 'green' | 'yellow' | 'red'
  score INTEGER,
  rank_position INTEGER,
  mentioned BOOLEAN DEFAULT FALSE,
  actionable BOOLEAN DEFAULT FALSE,
  domain_match BOOLEAN DEFAULT FALSE,
  reason TEXT,
  prompt_count INTEGER,
  tokens_used INTEGER,
  latency_ms INTEGER,
  error TEXT,
  raw_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 7. LangGraph Graph Specification

### Graph Structure

```
Nodes:
  N1: validate_input
      Input: raw scan request
      Output: validated business data or error
      Deterministic: Yes

  N2: classify_and_geo
      Sub-steps:
        1. Map industry → radius, prompt templates, default services
        2. Geocode via Nominatim
        3. Expand to nearby suburbs
      Output: enriched business data with suburb list + prompt config

  N3: generate_prompts
      Input: enriched business data
      Output: list of prompt strings (12-20 prompts)

  N4: parallel_llm_calls
      Fan-out to sub-nodes per provider:
        - query_{provider}: litellm call with timeout + retry
        - parse_{provider}: structured output extraction
      Each sub-node fails independently
      Output: list of per-provider results

  N5: score_and_return
      Input: all provider results
      Compute: overall score, summary, recommendations
      Output: SSE stream final event + persist to DB
```

### Error Handling

- validate_input failure → return 4xx to client, no scan started
- classify_and_geo failure → fall back to city-only prompts (no suburb expansion)
- Individual provider failure → continue with remaining providers; mark failed in results
- All providers fail → mark scan status = 'failed', return error to client
- Timeout at LangGraph level → return partial results if any exist, else error

## 8. LLM Provider Configuration

### Default Provider Set (Quick Scan)
| Provider | Model | Fallback | Timeout |
|---|---|---|---|
| Perplexity | sonar-pro | None (direct) | 15s |
| Gemini | gemini-2.0-flash | None (direct) | 15s |
| Groq | llama-3.3-70b | OpenRouter | 15s |
| DeepSeek | deepseek-chat | OpenRouter | 15s |
| Mistral | mistral-small | OpenRouter | 15s |

### OpenRouter Fallback
If a direct API is unavailable, the request is routed through OpenRouter using the same model via openrouter/{model}. OpenRouter is not used as the primary route to avoid per-token markup on every call.

## 9. SSE Contract

### Event Types

| Event | Payload | When |
|---|---|---|
| `progress` | `{"stage": str, "status": str}` | Stage transitions (geocoding, prompts, querying) |
| `provider_start` | `{"provider": str, "prompts": int}` | Provider query begins |
| `provider_result` | `{"provider": str, "status": str, "score": int, ...}` | Provider result available |
| `complete` | `{"overall_score": int, "summary": {...}}` | All providers done |
| `error` | `{"message": str, "code": str}` | Fatal error |

## 10. Acceptance Criteria

### AC-1: Authentication Flow
- User can sign up with Google OAuth
- User can sign up with LinkedIn OAuth
- Authenticated user persists across page navigation
- Sign out clears session

### AC-2: Quick Scan Flow
- User fills form with valid data → scan starts
- SSE stream displays progress events
- Per-provider results appear as they arrive
- Final score and summary displayed
- Results saved in dashboard

### AC-3: Error Handling
- Invalid domain → error message shown before submission
- One provider fails → scan continues, failed provider marked
- All providers fail → error shown, scan marked failed
- Network disconnect during scan → user can retry from dashboard

### AC-4: Dashboard
- Scan history shows most recent first
- Click past scan → full results displayed
- Results match what was shown at scan time

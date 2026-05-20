# Iozera GeoTracker — Business Requirements Document

## 1. Executive Summary

Iozera GeoTracker is a multi-LLM visibility auditing platform that lets local business owners check how visible their business is across modern AI ecosystems (ChatGPT, Gemini, Perplexity, and others). Users enter their business details and receive a scored visibility report showing where they appear (or don't) in LLM recommendations.

The product serves as a lead generation funnel for Iozera's broader product ecosystem (e.g., Upserv). The free Quick Scan demonstrates value; the paid Full Audit converts users to subscribers.

## 2. Business Objectives

- **Lead generation**: Capture local business owners actively seeking to improve their online presence
- **Product upsell**: Convert Quick Scan users into Upserv or monthly subscription customers
- **Market differentiation**: Be the first tool that audits LLM visibility specifically for local businesses
- **Data moat**: Accumulate audit data across industries, geographies, and providers to improve recommendations over time

## 3. Target Users

### Primary: Local Business Owners / Marketers
- Own or market a business with a physical location
- Want to know if customers can find them via AI recommendations
- Not technically sophisticated — the tool must be self-service and intuitive
- Motivated by: "Are my competitors showing up in ChatGPT and I'm not?"

### Secondary: Internal Operators
- Review flagged audits
- Handle escalations
- Manual intervention when automated results are ambiguous

## 4. User Stories

### Authentication & Onboarding
- As a business owner, I can sign up with Google or LinkedIn so I don't need another password
- As a business owner, I can see pricing before I sign up

### Quick Scan (Freemium)
- As a business owner, I can enter my business name, website, industry, and location
- As a business owner, I see scan progress streaming in so I don't feel left waiting
- As a business owner, I receive a visibility score for each LLM provider
- As a business owner, I see an overall visibility score
- As a business owner, I see which providers mention my business and which don't

### Full Audit (Paid)
- As a paying subscriber, I get competitor comparison reports
- As a paying subscriber, I get actionable SEO recommendations
- As a paying subscriber, I can run unlimited audits
- As a paying subscriber, I can track visibility changes over time
- As a paying subscriber, I get monthly visibility reports sent to my email

### Upsell / Conversion
- As a non-paying user, I see what the Full Audit includes and a prompt to upgrade
- As a non-paying user, I can retry my Quick Scan after 30 days (or similar cooldown)

## 5. Scope

### In Scope (MVP)
- User authentication (Google + LinkedIn OAuth via Supabase)
- Quick Scan: business submission, multi-provider scan, streaming results, visibility score
- Public landing page, pricing page, services page, FAQs page
- Dashboard showing scan history
- Basic scanning credit/boundary to prevent API abuse

### In Scope (Post-MVP)
- Full Audit with competitor analysis
- Subscription management
- Admin dashboard for operators
- User settings page
- Historical trend tracking
- Batch/agency workflows

### Out of Scope
- Direct integration with business listing platforms (Google Business Profile, Yelp)
- Automated SEO action execution
- Multi-user/team accounts within a single business
- White-label / reseller features

## 6. Success Metrics

| Metric | Target |
|---|---|
| Quick Scan completion rate | > 90% initiated scans complete |
| Scan-to-signup conversion | > 5% of scan users create account |
| Free-to-paid conversion | > 3% of free users upgrade |
| Scan latency (Quick Scan) | < 20 seconds for 5 providers |
| Provider reliability | > 99% of provider calls succeed |

## 7. Constraints & Assumptions

### Constraints
- Backend deploys on FastAPI Cloud (serverless)
- Frontend deploys on Vercel
- Prototype uses Supabase (may migrate to standalone PostgreSQL)
- No real-time infrastructure (WebSocket) — SSE over HTTP only

### Assumptions
- Business owners can articulate their industry and location accurately
- Nominatim geocoding is sufficient for US metro areas
- LLM providers remain available at their current pricing tiers
- Users have a modern browser (SSE support)

## 8. Timeline / Phasing

### Phase 1 — Prototype (Current)
- Core Quick Scan workflow functional
- Auth + basic dashboard
- 3–5 LLM providers integrated
- Deployed and testable with real businesses

### Phase 2 — Production Polish
- Full Audit functionality
- Subscription billing
- Admin dashboard
- Performance optimization
- Error handling edge cases

### Phase 3 — Scale
- Multi-region support
- Agency/white-label
- Batch scanning
- API for third-party integration

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM API rate limits | Scans fail or slow | Retry policies, queue system, provider fallbacks |
| LLM provider outages | Partial scan results | Graceful degradation, mark provider unavailable |
| Nominatim rate limits | Geospatial fails | Cache lookups, fallback to city-only prompts |
| False positives in LLM parsing | Wrong visibility credit | Generic name protection, domain verification |
| API abuse by malicious users | Cost overrun | Auth gating, per-user rate limits, cooldown periods |

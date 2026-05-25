# Iozera GeoTracker — Glossary

## Product
- **Iozera GeoTracker**: The product. Multi-LLM visibility auditing platform for local businesses.

## People
- **Client**: A business owner or potential customer who submits a business for visibility analysis via the website.
- **Agent**: An internal or external sales representative who belongs to a franchise team, manages visibility sales leads balanced to their team, and drives pipeline conversions.
- **Team Leader**: A manager who oversees a specific franchise team, manages balanced leads, and assigns leads to team Agents.
- **Operator**: An internal user who can manually review, escalate, or intervene in audit workflows.
- **Operator Settings Dashboard**: An exclusive configuration panel for the internal Operator team to manage, create, and delete global AI engines, connection endpoints, timeouts, and access keys.

## Actions
- **Quick Scan (freemium)**: A multi-provider LLM visibility check. Superficial analysis. Free tier.
- **Full Audit (paid)**: Comprehensive analysis including competitor benchmarking, recommendation engine, and in-depth scoring. Paid subscription.

## Entities
- **Business**: The entity being scanned/audited (has name, domain, industry, geography).
- **Search Grounding Engine**: The dedicated system provider configuration (defaulting to `gemini_grounding`) used for the initial business classification, web grounding, and metadata synthesis.
- **Auditing Engines**: The dynamically managed registry of active parallel AI engines used for the simulated visibility audits and citation tracking.
- **Search Provider**: A raw web search index interface (e.g., `serper`, `ddg`) used to retrieve organic search engine results.
- **Search Service**: The service that encapsulates query orchestration across different Search Providers.

## Auth
- **Supabase Auth**: Identity provider for the prototype. OAuth via Google.
- **Client Sign In Modal**: A premium, high-contrast overlay on the landing page presenting the secure Google OAuth option for Clients to authenticate and unlock premium access.
- **Rotating API Keys**: The system's ability to store multiple encrypted credentials for an Auditing Engine as a comma-separated list, dynamically rotating keys and retrying requests when encountering rate limit errors.
- **Subscription**: Not yet implemented — phase 1 is prototype with Quick Scan only.

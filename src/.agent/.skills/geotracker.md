# GEOTRACKER AI VISIBILITY AUDIT SKILL

Version: 1.0
Type: Production AI Orchestration Skill
Purpose: Multi-LLM Visibility Auditing and Scoring Engine

---

# 1. PURPOSE

The AI Visibility Audit Skill is responsible for determining whether a business is visible, recommendable, and actionable across modern large language model ecosystems.

The skill accepts:

* business metadata
* website/domain
* geographic context
* industry context

The skill then:

1. Generates industry-specific prompts
2. Expands geographic search coverage
3. Queries multiple LLM providers
4. Parses recommendation responses
5. Detects ranking and visibility
6. Scores recommendation quality
7. Produces normalized structured results
8. Returns UI-ready audit data

This skill is deterministic-first and AI-assisted second.

The skill MUST prioritize:

* reliability
* observability
* repeatability
* structured outputs
* cost efficiency
* latency optimization
* fault tolerance

---

# 2. CORE DESIGN PRINCIPLES

## 2.1 Deterministic Orchestration

The orchestration flow MUST remain deterministic.

LLMs may assist with:

* parsing nuance
* semantic ranking
* content analysis

But:

* workflow state
* scoring logic
* retries
* validation
* branching
* business rules

MUST remain deterministic.

---

## 2.2 Human-in-the-Loop Support

The skill MUST support:

* escalation
* manual review
* operator intervention
* human optimization workflows

---

## 2.3 Provider Independence

The orchestration layer MUST abstract provider implementations.

The system MUST NOT tightly couple logic to:

* OpenAI
* Anthropic
* Google
* Perplexity
* Grok

All providers MUST implement a shared adapter interface.

---

## 2.4 Structured Outputs Only

All internal outputs MUST be structured JSON objects.

No raw LLM prose should be relied upon internally.

---

# 3. INPUT CONTRACT

## Required Inputs

```json
{
  "business_name": "Example Dental",
  "domain": "exampledental.com",
  "industry": "dentist",
  "primary_city": "Houston",
  "primary_state": "Texas",
  "country": "USA"
}
```

---

## Optional Inputs

```json
{
  "target_suburbs": [],
  "custom_radius_miles": 50,
  "competitor_domains": [],
  "competitor_names": [],
  "service_focuses": [
    "Invisalign",
    "Dental Implants",
    "Emergency Dentistry"
  ],
  "max_prompts": 20,
  "llm_targets": [
    "chatgpt",
    "claude",
    "gemini",
    "perplexity",
    "grok"
  ]
}
```

---

# 4. OUTPUT CONTRACT

The skill MUST return normalized structured audit data.

## Example Output

```json
{
  "overall_visibility_score": 67,
  "status": "partial_visibility",
  "audit_summary": {
    "green_checks": 12,
    "yellow_warnings": 6,
    "red_xs": 7
  },
  "results": [
    {
      "prompt": "Best Invisalign dentist in Houston",
      "llm": "chatgpt",
      "status": "green",
      "rank_position": 2,
      "mentioned": true,
      "actionable": true,
      "domain_match": true,
      "reason": "Business appears in top 3 with actionable information."
    }
  ],
  "recommendations": [
    {
      "severity": "high",
      "issue": "Missing emergency dental service authority pages",
      "recommendation": "Create detailed emergency dentistry service pages."
    }
  ]
}
```

---

# 5. SYSTEM ARCHITECTURE

## Core Modules

The skill MUST be split into isolated modules.

### Required Modules

1. Input Validation Module
2. Business Classification Module
3. Prompt Generation Engine
4. Geospatial Expansion Engine
5. API Orchestrator
6. LLM Provider Adapters
7. Response Parser
8. Visibility Scoring Engine
9. Recommendation Engine
10. Competitor Comparison Engine
11. Retry and Failure Handler
12. Cache Layer
13. Observability Layer
14. Persistence Layer

---

# 6. EXECUTION FLOW

## Stage 1 — Input Validation

Validate:

* domain format
* industry type
* required geographic fields
* provider availability

Reject invalid requests early.

---

## Stage 2 — Business Classification

Map business industry to:

* radius defaults
* prompt templates
* service categories
* search intensity

Example:

```json
{
  "dentist": {
    "radius_miles": 50,
    "default_services": [
      "Invisalign",
      "Emergency Dentistry",
      "Dental Implants"
    ]
  }
}
```

---

## Stage 3 — Geospatial Expansion

The system MUST:

1. Resolve business coordinates
2. Fetch nearby suburbs/cities
3. Filter by population relevance
4. Rank by probable customer flow

Potential APIs:

* Google Maps
* Mapbox
* OpenStreetMap

Output:

```json
[
  "Houston",
  "Katy",
  "Spring",
  "Sugar Land"
]
```

---

# 7. PROMPT GENERATION ENGINE

## Responsibilities

Generate realistic human-like prompts.

Prompts MUST:

* mimic natural user behavior
* avoid robotic wording
* vary intent
* include services
* include geography

---

## Prompt Categories

### General Recommendation

Examples:

* Best dentist in Houston
* Recommended dentist near Katy
* Most trusted dentist in Houston

---

### Service-Specific

Examples:

* Best Invisalign dentist in Houston
* Affordable dental implants near Spring
* Same day emergency dentist Katy

---

### Trust-Based

Examples:

* Dentist for anxious patients Houston
* Highly rated cosmetic dentist Katy

---

## Prompt Rules

The engine MUST:

* deduplicate prompts
* avoid keyword stuffing
* randomize templates
* support localization
* support future multilingual expansion

---

# 8. API ORCHESTRATION

## Execution Strategy

ALL LLM requests MUST execute asynchronously.

Never sequentially.

---

## Required Features

### Timeout Management

Per provider:

* timeout ceiling
* cancellation support

---

### Retry Policies

Retry only:

* transient failures
* rate limits
* network issues

Do NOT retry:

* invalid requests
* auth failures

---

### Concurrency Controls

Prevent:

* API exhaustion
* burst overloads
* runaway loops

Use:

* semaphore limits
* queue systems

---

## Required Queue Support

Recommended:

* Redis Queue
* Celery
* RabbitMQ

---

# 9. PROVIDER ADAPTER DESIGN

Each LLM MUST implement:

```python
class LLMProviderAdapter:
    async def query(prompt: str) -> ProviderResponse:
        pass
```

Adapters MUST normalize:

* outputs
* metadata
* citations
* ranking indicators

---

# 10. RESPONSE PARSING ENGINE

## Responsibilities

Detect:

* mentions
* ranking
* recommendation strength
* actionable information
* sentiment quality
* competitor mentions

---

## Validation Rules

The parser MUST validate:

* business name
* matching domain
* location consistency

Prevent false positives.

---

## Generic Name Protection

Example:

If:

* "City Dental" appears

The parser MUST:

* verify linked domain
* verify city
* verify context

before granting visibility credit.

---

# 11. VISIBILITY SCORING ENGINE

## Green Check

Requirements:

* top 3 recommendation
* strong recommendation language
* actionable contact path

---

## Yellow Warning

Triggered if:

* weak mention
* non-top ranking
* lacks actionable info
* recommendation caveats exist

---

## Red X

Triggered if:

* no mention
* irrelevant mention
* competitor overshadowing

---

## Weighted Scoring

The engine SHOULD weight:

* ranking position
* prompt importance
* provider importance
* commercial intent

Example:

* “best emergency dentist near me”
  should weigh higher than:
* “good dentist”

---

# 12. RECOMMENDATION ENGINE

The recommendation engine MUST:

* identify missing content
* identify missing service pages
* identify weak FAQ coverage
* identify poor locality coverage

---

## Recommendation Rules

Recommendations MUST:

* be actionable
* be specific
* avoid generic SEO advice
* tie directly to audit failures

---

# 13. COMPETITOR ANALYSIS

The system SHOULD support:

* side-by-side competitor comparisons
* visibility benchmarking
* share-of-recommendation analysis

---

# 14. OBSERVABILITY

The skill MUST support:

## Metrics

* latency
* provider success rate
* token usage
* cost per audit
* parsing failures
* retry counts

---

## Tracing

Every audit MUST generate:

* trace IDs
* provider logs
* execution timeline

Recommended:

* LangSmith
* Langfuse
* OpenTelemetry

---

# 15. CACHING STRATEGY

The system SHOULD cache:

* prompt results
* geospatial lookups
* provider outputs

Cache TTL SHOULD be configurable.

---

# 16. SECURITY REQUIREMENTS

The system MUST:

* encrypt secrets
* isolate API keys
* validate user inputs
* sanitize outputs
* rate limit abuse
* prevent prompt injection

---

# 17. COST CONTROL

The orchestration layer MUST:

* track token costs
* support provider fallbacks
* support prompt batching
* support caching
* prevent recursive loops

---

# 18. LATENCY OPTIMIZATION

The system MUST:

* parallelize provider calls
* stream progress updates
* support partial result rendering
* avoid blocking operations

---

# 19. FRONTEND CONTRACT

The skill MUST return:

* UI-ready structured results
* progress states
* severity indicators
* recommendation metadata

No frontend parsing of raw LLM text should be required.

---

# 20. FAILURE STRATEGY

The system MUST degrade gracefully.

If one provider fails:

* continue execution
* mark provider unavailable
* preserve remaining audit results

Never fail the entire audit because of one provider outage.

---

# 21. RECOMMENDED STACK

## Recommended Production Stack

### Backend

* FastAPI

### Orchestration

* LangGraph

### Async Runtime

* asyncio

### Queue System

* Celery + Redis

### Database

* PostgreSQL

### Observability

* LangSmith or Langfuse

### Deployment

* Docker + Kubernetes

---

# 22. NON-GOALS

This skill is NOT:

* a fully autonomous AI agent
* a chatbot
* an uncontrolled agent swarm
* a freeform reasoning system

The skill is:

* deterministic
* structured
* observable
* production-oriented

---

# 23. SUCCESS CRITERIA

The skill is considered production-ready when it:

* successfully audits businesses across all providers
* maintains stable latency under load
* produces consistent scoring
* prevents false positives
* gracefully handles provider failures
* returns actionable recommendations
* supports horizontal scaling
* supports observability and debugging


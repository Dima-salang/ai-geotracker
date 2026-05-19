# Iozera GeoTracker — Design Tree

## Product
│
├── Quick Scan (freemium)
│   ├── Multi-provider LLM visibility check
│   ├── Superficial analysis
│   └── Free tier
│
└── Full Audit (paid subscription)
    ├── Comprehensive competitor benchmarking
    ├── In-depth scoring + recommendations
    └── Repeat access

## Architecture
│
├── Frontend (Vercel)
│   ├── Next.js 16 + Tailwind v4
│   ├── Supabase Auth (Google + LinkedIn OAuth)
│   └── 7 MVP pages: Landing, Auth, Dashboard, Results, Pricing, Services, FAQs
│
├── Backend (FastAPI Cloud)
│   ├── FastAPI (HTTP entrypoint)
│   ├── LangGraph (orchestration graph)
│   └── litellm (unified LLM provider interface)
│
├── Data
│   ├── Supabase PostgreSQL (prototype DB)
│   ├── Supabase Auth (identity provider)
│   └── Nominatim API (geospatial)
│
└── Integration
    ├── SSE streaming (scan progress → frontend)
    ├── Direct HTTP (no proxy via Next.js API routes)
    └── CORS configured for frontend origin

## LangGraph Graph
│
├── [validate_input]
│   ├── Domain format
│   ├── Industry type
│   ├── Required geo fields
│   └── Provider availability
│
├── [classify + geo_expand]
│   ├── Map industry → radius defaults, prompt templates, service categories
│   ├── Resolve business coordinates (Nominatim)
│   ├── Fetch nearby suburbs
│   └── Filter by population relevance
│
├── [parallel_llm_calls]
│   ├── Fan-out to providers: Perplexity, Gemini, Groq, DeepSeek, Mistral
│   ├── OpenRouter as fallback/router
│   ├── Per-provider timeout + retry
│   └── Independent failure (don't fail all on one outage)
│
└── [score + return]
    ├── Parse results
    ├── Detect mentions, ranking, recommendation strength
    ├── Compute visibility score (green/yellow/red)
    └── SSE stream back to client

## Provider Access
│
├── Perplexity — direct API
├── Gemini — direct API
├── Groq — direct API (free)
├── DeepSeek — direct API (cheap)
├── Mistral — direct API (free credits)
└── OpenRouter — fallback for any model without direct API

## Design Decisions (ADRs)
│
├── ADR-0001: Supabase Auth + PostgreSQL
└── ADR-0002: SSE over WebSockets

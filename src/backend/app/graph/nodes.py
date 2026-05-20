import asyncio
import json
import random
import re
from typing import Optional

import litellm

from app.graph.state import ProviderResult, ScanState

DOMAIN_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,}$")

CLASSIFY_PROMPT = """You are a business research assistant. Research this business online and return structured data in JSON only.

Business Name: {business_name}
Domain: {domain}
Industry (user-specified): {industry}
Location: {city}, {state}, {country}

Use Google Search to verify this business and understand its market. Return ONLY valid JSON:
{{
  "domain_verified": true/false,
  "industry": "refined industry category",
  "radius_miles": integer,
  "default_services": ["service1", "service2"],
  "business_alias": "alternative name or empty",
  "prompts": ["prompt1", "prompt2", "prompt3"]
}}

Rules:
- domain_verified: does domain match business name?
- industry: refine user-specified industry. broad but accurate.
- radius_miles: typical local search radius. 5-100.
- default_services: 3-8 common services for this business type.
- prompts: generate 8-15 realistic human search prompts. MUST:
  * Vary intent (general recommendation, service-specific, trust-based)
  * Use natural human language (not robotic)
  * Include geography (city + nearby suburbs/areas)
  * Include specific services from default_services
  * Avoid keyword stuffing
  * Example: "Best Invisalign dentist in Houston", "Trusted dental implants near Katy"
"""

PROVIDER_CONFIG: list[dict] = [
    {"name": "gemini", "model": "gemini/gemini-2.0-flash", "fallback": None},
    {"name": "perplexity", "model": "perplexity/sonar-pro", "fallback": None},
    {"name": "groq", "model": "groq/llama-3.3-70b-versatile", "fallback": "openrouter/groq/llama-3.3-70b-versatile"},
    {"name": "deepseek", "model": "deepseek/deepseek-chat", "fallback": "openrouter/deepseek/deepseek-chat"},
    {"name": "mistral", "model": "mistral/mistral-small", "fallback": "openrouter/mistral/mistral-small"},
]


def validate_input(state: ScanState) -> dict:
    errors = []
    req = state.request

    if not DOMAIN_RE.match(req.domain):
        errors.append(f"Invalid domain format: {req.domain}")

    if not req.business_name.strip():
        errors.append("Business name is required")

    if not req.industry.strip():
        errors.append("Industry is required")

    if not req.primary_city.strip():
        errors.append("Primary city is required")

    if not req.country.strip():
        errors.append("Country is required")

    return {"errors": errors}


def _fallback_prompts(industry: str, city: str, services: list[str]) -> list[str]:
    templates = [
        "Best {industry} in {city}",
        "Recommended {industry} near {city}",
        "Top rated {industry} in {city}",
        "Most trusted {industry} in {city}",
        "{industry} for anxious patients {city}",
        "Highly rated {industry} {city}",
        "Trusted {industry} in {city}",
        "Best reviewed {industry} near {city}",
    ]
    service_templates = [
        "Best {service} {industry} in {city}",
        "Affordable {service} near {city}",
        "Top rated {service} {industry} in {city}",
        "Same day {service} {city}",
    ]

    prompts = []
    for t in templates:
        p = t.format(industry=industry, city=city)
        if p not in prompts:
            prompts.append(p)

    for svc in services:
        for t in service_templates:
            p = t.format(service=svc, industry=industry, city=city)
            if p not in prompts:
                prompts.append(p)

    random.seed(city + industry)
    random.shuffle(prompts)
    return prompts


async def classify_business(state: ScanState) -> dict:
    req = state.request
    prompt = CLASSIFY_PROMPT.format(
        business_name=req.business_name,
        domain=req.domain,
        industry=req.industry,
        city=req.primary_city,
        state=req.primary_state,
        country=req.country,
    )

    try:
        response = await litellm.acompletion(
            model="gemini/gemini-2.0-flash",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2048,
            extra_body={"google_search": {}},
        )

        content = response.choices[0].message.content or ""

        json_match = re.search(r"\{.*\}", content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(content)

        industry = data.get("industry", req.industry.lower())
        services = data.get("default_services", [])
        llm_prompts = data.get("prompts", [])

        return {
            "classification": {
                "industry": industry,
                "radius_miles": data.get("radius_miles", 25),
                "default_services": services,
                "domain_verified": data.get("domain_verified", False),
            },
            "prompts": llm_prompts if llm_prompts else _fallback_prompts(industry, req.primary_city, services),
        }

    except Exception:
        fb_services = req.service_focuses.copy()
        return {
            "classification": {
                "industry": req.industry.lower(),
                "radius_miles": 25,
                "default_services": fb_services,
                "domain_verified": False,
            },
            "prompts": _fallback_prompts(req.industry.lower(), req.primary_city, fb_services),
        }


def geo_expand(state: ScanState) -> dict:
    return {"coordinates": None, "suburbs": []}


def _parse_response(content: str, business_name: str, domain: str) -> dict:
    content_lower = content.lower()
    name_lower = business_name.lower()

    mentioned = name_lower in content_lower
    domain_match = domain.lower() in content_lower if domain else False

    rank_position = None
    for i, line in enumerate(content.split("\n")[:20], 1):
        if name_lower in line.lower():
            rank_position = i
            break

    has_contact = any(
        kw in content_lower for kw in ["website", "visit", "contact", "call", "book", "schedule"]
    )

    score = 0
    if mentioned:
        score = 60
    if rank_position and rank_position <= 3:
        score = 80
    if domain_match:
        score = 100

    actionable = bool(has_contact and score >= 60)

    if mentioned and rank_position and rank_position <= 3:
        status = "green"
    elif mentioned:
        status = "yellow"
    else:
        status = "red"

    return {
        "status": status,
        "score": score,
        "rank_position": rank_position,
        "mentioned": mentioned,
        "actionable": actionable,
        "domain_match": domain_match,
        "reason": (
            f"Business mentioned in top {rank_position}" if mentioned and rank_position
            else "Business mentioned but not in top results" if mentioned
            else "No mention found"
        ),
    }


async def query_single_provider(
    provider_cfg: dict,
    prompts: list[str],
    business_name: str,
    domain: str,
) -> ProviderResult:
    model = provider_cfg["model"]
    provider_name = provider_cfg["name"]

    try:
        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": prompts[0] if prompts else ""}],
            temperature=0.1,
            max_tokens=512,
        )

        content = response.choices[0].message.content or ""
        parsed = _parse_response(content, business_name, domain)

        return ProviderResult(
            provider=provider_name,
            status=parsed["status"],
            score=parsed["score"],
            rank_position=parsed["rank_position"],
            mentioned=parsed["mentioned"],
            actionable=parsed["actionable"],
            domain_match=parsed["domain_match"],
            reason=parsed["reason"],
        )

    except Exception as e:
        return ProviderResult(
            provider=provider_name,
            status="red",
            score=0,
            mentioned=False,
            error=str(e),
            reason=f"Provider query failed: {e}",
        )


async def query_providers(state: ScanState) -> dict:
    req = state.request
    prompts = state.prompts

    tasks = [
        query_single_provider(cfg, prompts, req.business_name, req.domain)
        for cfg in PROVIDER_CONFIG
    ]

    results = await asyncio.gather(*tasks)

    return {"provider_results": [r.model_dump() for r in results]}


def score_results(state: ScanState) -> dict:
    results = state.provider_results
    scores = [r.score for r in results]
    overall = int(sum(scores) / len(scores)) if scores else 0

    green = sum(1 for r in results if r.status == "green")
    yellow = sum(1 for r in results if r.status == "yellow")
    red = sum(1 for r in results if r.status == "red")

    recommendations = []
    if overall < 50:
        recommendations.append({
            "severity": "high",
            "issue": "Low visibility across LLM providers",
            "recommendation": "Improve online presence with service pages and local SEO",
        })

    return {
        "overall_score": overall,
        "summary": {"green": green, "yellow": yellow, "red": red},
        "recommendations": recommendations,
    }

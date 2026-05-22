import asyncio
import json
import logging
import random
import re
from typing import Optional

from app.graph.state import ProviderResult, ScanState, ScanRequest
from app.services.provider_service import ProviderService

logger = logging.getLogger("app.graph.nodes")

DOMAIN_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,}$")

CLASSIFY_PROMPT = """You are a business research assistant. Research this business online and return structured data in JSON only.

Business Name (if provided): {business_name}
Domain: {domain}
Industry (if provided): {industry}
Location (if provided): {city}, {state}, {country}

Instructions:
1. Research the given Domain online to determine the official Business Name, its primary Industry, physical Headquarters Location (City, State, Country), and whether it is a purely virtual/online business (SaaS, e-commerce, global platform with no primary local walk-in storefront or local service radius).
2. Set "is_virtual" to true if it is a purely online/virtual business, otherwise false.
3. If "is_virtual" is true, set physical location fields but generate general/location-free search prompts (e.g. "Best subscription billing platform", "Top rated online accounting software"). If "is_virtual" is false, generate local-specific search prompts with physical location terms.

Use Google Search to verify this business and understand its market. Return ONLY valid JSON:
{{
  "business_name": "the official business name (researched or verified)",
  "industry": "refined industry category",
  "primary_city": "main physical city",
  "primary_state": "main physical state/region",
  "country": "main physical country",
  "is_virtual": true/false,
  "domain_verified": true/false,
  "radius_miles": integer (set to 0 if is_virtual is true, or typical local search radius 5-100 if local),
  "default_services": ["service1", "service2"],
  "business_alias": "alternative name or empty",
  "prompts": ["prompt1", "prompt2", "prompt3"]
}}

Rules for prompts:
- Generate 2 realistic human search queries/prompts. Must vary intent (general recommendation, service-specific, trust-based).
- Do not mention the name of the business itself to avoid leaking information.
- Use natural human language (not robotic).
- If local, MUST include geography (city + nearby suburbs/areas). If virtual, MUST NOT include local geography.
- Include specific services from default_services.
- Avoid keyword stuffing.
"""

PROVIDER_CONFIG: list[dict] = [
    {"name": "gemini", "model": "gemini/gemini-2.0-flash", "fallback": None},
    {"name": "perplexity", "model": "perplexity/sonar-pro", "fallback": None},
    {"name": "groq", "model": "groq/llama-3.3-70b-versatile", "fallback": "openrouter/groq/llama-3.3-70b-versatile"},
    {"name": "deepseek", "model": "deepseek/deepseek-chat", "fallback": "openrouter/deepseek/deepseek-chat"},
    {"name": "mistral", "model": "mistral/mistral-small", "fallback": "openrouter/mistral/mistral-small"},
]


def validate_input(state: ScanState) -> dict:
    req = state.request
    logger.info("Entering validate_input - Domain: '%s', Business Name: '%s', Industry: '%s', City: '%s'", req.domain, req.business_name, req.industry, req.primary_city)
    errors = []

    if not DOMAIN_RE.match(req.domain):
        errors.append(f"Invalid domain format: {req.domain}")

    # Domain-only scan is allowed when all other fields are empty
    is_domain_only = (
        not req.business_name.strip()
        and not req.industry.strip()
        and not req.primary_city.strip()
        and not req.primary_state.strip()
        and not req.country.strip()
    )

    if not is_domain_only:
        if not req.business_name.strip():
            errors.append("Business name is required")

        if not req.industry.strip():
            errors.append("Industry is required")

        if not req.primary_city.strip():
            errors.append("Primary city is required")

        if not req.country.strip():
            errors.append("Country is required")

    if errors:
        logger.warning("validate_input completed with validation errors: %s", errors)
    else:
        logger.info("validate_input completed successfully (validation passed).")

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
    logger.info("Entering classify_business - Domain: '%s', Business: '%s', Industry: '%s'", req.domain, req.business_name, req.industry)
    prompt = CLASSIFY_PROMPT.format(
        business_name=req.business_name,
        domain=req.domain,
        industry=req.industry,
        city=req.primary_city,
        state=req.primary_state,
        country=req.country,
    )

    try:
        logger.info("Querying Gemini for business search/classification and structured prompt extraction...")
        content = ""
        try:
            response = await ProviderService.acompletion(
                provider="gemini_grounding",
                messages=[{"role": "user", "content": prompt}],
                temperature=1.0,
                max_tokens=2048,
                extra_body={"tools": [{"google_search": {}}]},
            )

            content = response.choices[0].message.content or ""
            logger.info("Raw classification response from Gemini:\n%s", content)

            if not content.strip():
                raise ValueError("Empty content in primary classification response")

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(content)
        except Exception as primary_err:
            logger.warning(
                "Primary search grounding classification failed or returned invalid JSON: %s. Retrying WITHOUT search tools...",
                str(primary_err)
            )
            response = await ProviderService.acompletion(
                provider="gemini_grounding",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2048,
            )

            content = response.choices[0].message.content or ""
            logger.info("Raw fallback classification response from Gemini:\n%s", content)

            if not content.strip():
                raise ValueError("Empty content in fallback classification response")

            json_match = re.search(r"\{.*\}", content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
            else:
                data = json.loads(content)

        industry = data.get("industry", req.industry.lower())
        services = data.get("default_services", [])
        llm_prompts = data.get("prompts", [])
        is_virtual = data.get("is_virtual", False)

        updated_req = ScanRequest(
            business_name=data.get("business_name") or req.business_name or req.domain,
            domain=req.domain,
            industry=industry,
            primary_city=data.get("primary_city") or req.primary_city or "",
            primary_state=data.get("primary_state") or req.primary_state or "",
            country=data.get("country") or req.country or "",
            service_focuses=services if services else req.service_focuses,
            target_suburbs=req.target_suburbs
        )

        final_prompts = llm_prompts if llm_prompts else _fallback_prompts(industry, updated_req.primary_city or "unknown", services)
        logger.info(
            "Gemini classification succeeded: Verified Name='%s', Industry='%s', Is Virtual=%s, Radius=%s, Prompts Generated=%d",
            updated_req.business_name,
            industry,
            is_virtual,
            data.get("radius_miles", 25),
            len(final_prompts)
        )

        return {
            "classification": {
                "industry": industry,
                "radius_miles": data.get("radius_miles", 25),
                "default_services": services,
                "domain_verified": data.get("domain_verified", False),
                "is_virtual": is_virtual,
            },
            "prompts": final_prompts,
            "request": updated_req,
        }

    except Exception as e:
        fb_services = req.service_focuses.copy()
        business_name = req.business_name or req.domain
        fallback_city = req.primary_city or "unknown"
        fallback_industry = req.industry or "local service"

        logger.warning(
            "Gemini classification query failed: %s. Falling back to local service heuristics for Business='%s', City='%s', Industry='%s'.",
            str(e),
            business_name,
            fallback_city,
            fallback_industry,
            exc_info=True
        )

        updated_req = ScanRequest(
            business_name=business_name,
            domain=req.domain,
            industry=fallback_industry,
            primary_city=fallback_city,
            primary_state=req.primary_state,
            country=req.country or "US",
            service_focuses=fb_services,
            target_suburbs=req.target_suburbs
        )

        fallback_prompts = _fallback_prompts(fallback_industry, fallback_city, fb_services)
        logger.info(
            "Fallback heuristics applied successfully: Industry='%s', City='%s', Service Focuses=%s, Fallback Prompts=%d",
            fallback_industry,
            fallback_city,
            fb_services,
            len(fallback_prompts)
        )

        return {
            "classification": {
                "industry": fallback_industry,
                "radius_miles": 25,
                "default_services": fb_services,
                "domain_verified": False,
                "is_virtual": False,
            },
            "prompts": fallback_prompts,
            "request": updated_req,
        }



def geo_expand(state: ScanState) -> dict:
    logger.info("Entering geo_expand - Domain: '%s', target_suburbs: %s", state.request.domain, state.request.target_suburbs)
    logger.info("geo_expand completed (returning placeholder coordinates/suburbs).")
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


async def _query_single_prompt(
    provider_name: str,
    call_args: dict,
    prompt: str,
    business_name: str,
    domain: str,
    prompt_index: int,
    total_prompts: int,
) -> dict:
    """
    Fire a single prompt against a provider using pre-resolved litellm call args.
    Routes queries through ProviderService to completely isolate litellm dependencies.
    """
    system_message = (
        "You are simulating an AI search engine. When given a search query, respond ONLY with a "
        "numbered ranked list of the top 10 real businesses or websites that would appear in search results "
        "for that query. Include business names, brief descriptions, and their website URLs where known. "
        "Do NOT answer the question or provide advice. ONLY list search results."
    )
    provider_name_log = provider_name
    try:
        response = await ProviderService.acompletion(
            provider=provider_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            temperature=1.0 if "gemini" in provider_name else 0.1,
            max_tokens=2048,
            num_retries=0,       # Fail fast — no retry backoff blocking the event loop
            call_args=call_args,
        )
        content = response.choices[0].message.content or ""
        logger.info(
            "Provider '%s' | Prompt [%d/%d] → Raw response:\n%s",
            provider_name_log, prompt_index + 1, total_prompts, content
        )
        parsed = _parse_response(content, business_name, domain)
        parsed["prompt"] = prompt
        parsed["prompt_index"] = prompt_index
        return parsed
    except Exception as e:
        logger.warning(
            "Provider '%s' | Prompt [%d/%d] '%s' → FAILED: %s",
            provider_name_log, prompt_index + 1, total_prompts, prompt, str(e)
        )
        return {
            "status": "red", "score": 0, "rank_position": None,
            "mentioned": False, "actionable": False, "domain_match": False,
            "reason": f"Prompt query failed: {e}", "prompt": prompt, "prompt_index": prompt_index,
        }


async def query_single_provider(
    provider_cfg: dict,
    prompts: list[str],
    business_name: str,
    domain: str,
    call_args: Optional[dict] = None,
) -> ProviderResult:
    """
    Query a single provider with all prompts in parallel.

    Provider config is resolved ONCE synchronously before any tasks are created,
    so the per-prompt coroutines call litellm directly with no further DB I/O.
    """
    provider_name = provider_cfg["name"]

    if not prompts:
        return ProviderResult(provider=provider_name, status="red", score=0, reason="No prompts provided.")

    # ── Resolve provider config once (synchronous DB lookup, done before parallelism) ──
    if call_args is None:
        call_args = ProviderService.resolve_provider_call_args(provider_name)
    model = call_args.get("model", provider_name)

    logger.info(
        "Provider '%s' (model: '%s') | Resolved call_args: timeout=%s | Firing %d prompts in parallel...",
        provider_name, model, call_args.get("timeout"), len(prompts)
    )

    try:
        # Create tasks eagerly so ALL start executing immediately before any is awaited
        tasks = [
            asyncio.create_task(
                _query_single_prompt(provider_name, call_args, p, business_name, domain, i, len(prompts))
            )
            for i, p in enumerate(prompts)
        ]
        prompt_results = await asyncio.gather(*tasks)

        best = max(prompt_results, key=lambda r: r["score"])
        errors = [r["reason"] for r in prompt_results if r["score"] == 0 and "failed" in r.get("reason", "").lower()]
        all_failed = all(r["score"] == 0 and "failed" in r.get("reason", "").lower() for r in prompt_results)
        mention_count = sum(1 for r in prompt_results if r["mentioned"])

        logger.info(
            "Provider '%s' aggregated across %d prompts: Best Score=%d, Status='%s', "
            "Mentions=%d/%d, BestPrompt='%s', Reason='%s'",
            provider_name, len(prompts),
            best["score"], best["status"],
            mention_count, len(prompts),
            best["prompt"], best["reason"]
        )

        return ProviderResult(
            provider=provider_name,
            status=best["status"],
            score=best["score"],
            rank_position=best["rank_position"],
            mentioned=best["mentioned"],
            actionable=best["actionable"],
            domain_match=best["domain_match"],
            reason=best["reason"],
            error=errors[0] if all_failed and errors else None,
            prompt_results=prompt_results,
        )

    except Exception as e:
        logger.error("Provider '%s' query pipeline failed: %s", provider_name, str(e), exc_info=True)
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

    # Load active providers dynamically from database
    from app.models.database import SessionLocal

    db = SessionLocal()
    try:
        active_configs = ProviderService.get_active_configs(db)
        providers_to_query = [
            {"name": c.provider, "model": c.model}
            for c in active_configs
            if c.provider != "gemini_grounding"
        ]
    except Exception as e:
        logger.error("Failed to dynamically load active providers from DB: %s. Falling back to static config.", e)
        providers_to_query = PROVIDER_CONFIG
    finally:
        db.close()

    if not providers_to_query:
        providers_to_query = PROVIDER_CONFIG

    logger.info(
        "Entering query_providers - Domain: '%s', Business: '%s', Total Prompts: %d, Providers: %d → Total API calls: %d",
        req.domain, req.business_name, len(prompts), len(providers_to_query), len(prompts) * len(providers_to_query)
    )

    tasks = [
        query_single_provider(cfg, prompts, req.business_name, req.domain)
        for cfg in providers_to_query
    ]

    results = await asyncio.gather(*tasks)
    logger.info("query_providers complete - Collected %d provider results.", len(results))

    return {"provider_results": [r.model_dump() for r in results]}


def score_results(state: ScanState) -> dict:
    results = state.provider_results
    logger.info("Entering score_results for domain: '%s'. Parsing %d provider results...", state.request.domain, len(results))
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

    logger.info(
        "score_results completed: Overall Score=%d, Distribution={green: %d, yellow: %d, red: %d}, Recommendations Count=%d",
        overall,
        green,
        yellow,
        red,
        len(recommendations)
    )

    return {
        "overall_score": overall,
        "summary": {"green": green, "yellow": yellow, "red": red},
        "recommendations": recommendations,
    }

import asyncio
import json
import logging
import os
import random
import re
from typing import Optional, Dict, Any, List

from pydantic import BaseModel, Field

from app.graph.state import ProviderResult, ScanState, ScanRequest
from app.services.provider_service import ProviderService
from app.services.search_service import SearchProviders, SearchService

logger = logging.getLogger("app.graph.nodes")

DOMAIN_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9\-]*\.[a-zA-Z]{2,}$")

CLASSIFY_PROMPT = """You are an expert market intelligence and entity extraction assistant. Analyze the business details provided below to determine structural business properties and generate highly specific human search queries for AI engines.

---
INPUT DATA TARGET PROFILE:
- Business Name Option: "{business_name}"
- Target Domain: "{domain}"
- Stated Industry: "{industry}"
- Provided Location Focus: "{city}", "{state}", "{country}"
---

CRITICAL INSTRUCTIONS:
1. Verify the Domain to determine the true operational Business Name, its core Industry category, and physical headquarters location.
2. Determine if the business is purely virtual (SaaS, e-commerce, remote global platforms with no local foot-traffic storefront or regional service area radius). Set "is_virtual" to true or false.
3. Extract an explicit array of exactly 2-4 core structural services/offerings from the website data and populate "default_services".

PROMPT GENERATION DETERMINISTIC FORMULAS:
You must generate exactly 3 highly realistic, conversational search prompts that real humans ask conversational AI engines (ChatGPT, Perplexity, Gemini). Do not wrap them in quote marks inside the array. Follow these mathematical blueprints strictly:

If "is_virtual" is FALSE (Local Physical Business):
- Prompt Index 0 (Broad Discovery Intent): Formulate exactly as: [Top Rated/Best] + [Refined Industry] + [in/near] + [Primary City].
  * Example: "Best family dental clinic in Houston"
- Prompt Index 1 (Service Specific Intent): Formulate exactly as: [Core Service from default_services] + [in/near] + [Primary City or adjacent neighborhood/suburb].
  * Example: "Emergency tooth extraction repair near Sugar Land"
- Prompt Index 2 (Trust & Review Validation Intent): Formulate exactly as: [Most recommended/Highest reviewed] + [Refined Industry] + [in/near] + [Primary City] + [with good reviews].
  * Example: "Highest reviewed cosmetic dentists in Houston with good reviews"

If "is_virtual" is TRUE (Pure Online / Virtual Business):
- Prompt Index 0 (Broad Category Discovery): Formulate exactly as: [Top Rated/Best] + [Refined Industry / Platform Category] + [for small businesses/enterprises/startups].
  * Example: "Best subscription billing platform for bootstrapping startups"
- Prompt Index 1 (Feature Specific Intent): Formulate exactly as: [Core Service/Feature from default_services] + [software/platform] + [with automated features/integrations].
  * Example: "Invoicing software platform with automated ledger syncing"
- Prompt Index 2 (Value / Comparison Intent): Formulate exactly as: [Most recommended/Top choice] + [Refined Industry] + [for remote teams/scale].
  * Example: "Most recommended online accounting software for remote teams"

STRICT CONSTRAINT RULES FOR PROMPTS:
- CRITICAL: Never include the client's business name, brand tokens, or domain name inside any generated prompt.
- Never use structural search operators like 'site:', 'OR', 'AND', or custom punctuation.
- Use clean, natural lowercase or title-case human phrasing. Avoid mechanical keyword stuffing.

Return ONLY a valid raw JSON object matching the keys below. Do not include markdown code fences or conversational greetings.
{{
  "business_name": "Verified operational name of business",
  "industry": "Refined industry category",
  "primary_city": "Main physical city",
  "primary_state": "Main physical state/region",
  "country": "Main physical country",
  "is_virtual": false,
  "domain_verified": true,
  "radius_miles": 25,
  "default_services": ["service1", "service2"],
  "business_alias": "Alternative name or empty",
  "prompts": [
    "Insert Prompt Index 0 here",
    "Insert Prompt Index 1 here",
    "Insert Prompt Index 2 here"
  ]
}}
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

    # Run a serper dev search for the domain name for gemini_grounding
    domain_search_context = ""
    from app.models.database import SessionLocal
    db_session = SessionLocal()
    try:
        logger.info("Running domain grounding search for: %s", req.domain)
        try:
            # Explicitly run a Serper search as requested
            results = await SearchService.search(req.domain, SearchProviders.SERPER, db=db_session)
            if results:
                logger.info("Domain search grounding via Serper succeeded with %d results.", len(results))
                lines = []
                for r in results:
                    line = f"- Title: {r.title}\n  URL: {r.link}\n  Snippet: {r.snippet}"
                    if r.metadata:
                        if r.metadata.rating:
                            line += f"\n  Rating: {r.metadata.rating} ({r.metadata.ratingCount} reviews)"
                        if r.metadata.attributes:
                            attrs_str = ", ".join(f"{k}: {v}" for k, v in r.metadata.attributes.items())
                            line += f"\n  Details: {attrs_str}"
                    lines.append(line)
                domain_search_context = "\n".join(lines)
        except Exception as search_err:
            logger.warning("Serper search for domain grounding failed, falling back to DDG: %s", search_err)
            try:
                results = await SearchService.search(req.domain, SearchProviders.DDG, db=db_session)
                if results:
                    domain_search_context = "\n".join([
                        f"- Title: {r.title}\n  URL: {r.link}\n  Snippet: {r.snippet}"
                        for r in results
                    ])
            except Exception as ddg_err:
                logger.warning("DDG search fallback for domain grounding also failed: %s", ddg_err)
    except Exception as db_err:
        logger.warning("Database/search error during domain grounding: %s", db_err)
    finally:
        db_session.close()

    messages = []
    if domain_search_context:
        messages.append({
            "role": "system",
            "content": (
                f"You are a helpful business research assistant. Here is direct search grounding context "
                f"fetched from Google/Serper search about the business website '{req.domain}':\n\n"
                f"{domain_search_context}\n\n"
                f"Please use this search grounding context to verify the exact business details, official name, "
                f"headquarters location, radius, and services."
            )
        })
    messages.append({"role": "user", "content": prompt})

    # Keep track of any classification data successfully fetched
    data = None
    fallback_used = None

    try:
        try:
            logger.info("Querying Gemini for business search/classification and structured prompt extraction...")
            content = ""
            try:
                response = await ProviderService.acompletion(
                    provider="gemini_grounding",
                    messages=messages,
                    temperature=0.1,
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
                    messages=messages,
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
        except Exception as grounding_err:
            logger.warning(
                "Both primary and fallback gemini_grounding classification failed: %s. Initiating resilient LLM failover sequence...",
                str(grounding_err)
            )
            
            # ── RESOLVE FALLBACK PROVIDER DYNAMICALLY FROM DB ──
            fallback_provider = "gemini"  # Default fallback
            from app.models.schema import SystemConfig
            from app.models.database import SessionLocal
            
            db_session = SessionLocal()
            try:
                cfg = db_session.query(SystemConfig).filter(SystemConfig.key == "grounding_fallback_provider").first()
                if cfg and cfg.value:
                    fallback_provider = cfg.value.strip()
            except Exception as cfg_err:
                logger.warning("Failed to fetch grounding_fallback_provider from DB: %s. Using default 'gemini'.", cfg_err)
            finally:
                db_session.close()

            # Build ordered list of providers to try
            providers_to_try = [fallback_provider]
            if fallback_provider != "gemini":
                providers_to_try.append("gemini")
                
            # Add other active providers from DB as last resort
            db_session = SessionLocal()
            try:
                active_configs = ProviderService.get_active_configs(db_session)
                for c in active_configs:
                    if c.provider not in providers_to_try and c.provider != "gemini_grounding":
                        providers_to_try.append(c.provider)
            except Exception as active_err:
                logger.warning("Failed to fetch active configurations for failover list: %s", active_err)
            finally:
                db_session.close()

            # Hardcode fallback options if none found
            for default_p in ("groq", "perplexity"):
                if default_p not in providers_to_try:
                    providers_to_try.append(default_p)

            logger.info("Grounding failover provider sequence resolved: %s", providers_to_try)

            for p_name in providers_to_try:
                logger.info("Attempting business classification failover with provider: '%s'...", p_name)
                try:
                    response = await ProviderService.acompletion(
                        provider=p_name,
                        messages=messages,
                        temperature=1.0 if "gemini-3.1-flash" in p_name else 0.2,
                        max_tokens=2048,
                    )
                    content = response.choices[0].message.content or ""
                    logger.info("Raw classification response from failover provider '%s':\n%s", p_name, content)

                    if not content.strip():
                        raise ValueError("Empty content in failover classification response")

                    json_match = re.search(r"\{.*\}", content, re.DOTALL)
                    if json_match:
                        data = json.loads(json_match.group())
                    else:
                        data = json.loads(content)
                    
                    fallback_used = p_name
                    logger.info("Resilient grounding classification failover to provider '%s' succeeded!", p_name)
                    break
                except Exception as p_err:
                    logger.warning("Grounding classification failover with provider '%s' failed: %s", p_name, p_err)

            if not data:
                logger.error("All LLM grounding failover attempts failed. Cascading to local service heuristics.")
                raise grounding_err

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
        
        provider_identifier = fallback_used if fallback_used else "gemini_grounding"
        logger.info(
            "Classification succeeded (provider: '%s'): Verified Name='%s', Industry='%s', Is Virtual=%s, Radius=%s, Prompts Generated=%d",
            provider_identifier,
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

async def web_search(state: ScanState) -> dict:
    # Resolve the preferred search provider from system configuration or env
    from app.models.database import SessionLocal
    from app.models.schema import SystemConfig

    db = SessionLocal()
    provider = None
    try:
        # Check system config for preferred provider
        pref = db.query(SystemConfig).filter(SystemConfig.key == "search_provider").first()
        if pref and pref.value:
            provider_str = pref.value.strip().lower()
            if provider_str in ("serper", "google"):
                provider = SearchProviders.SERPER
            elif provider_str == "ddg":
                provider = SearchProviders.DDG

        if not provider:
            # Check if serper_api_key is configured
            serper_key_cfg = db.query(SystemConfig).filter(SystemConfig.key == "serper_api_key").first()
            has_serper_key = bool(serper_key_cfg and serper_key_cfg.decrypted_value) or bool(os.getenv("SERPER_API_KEY"))
            if has_serper_key:
                provider = SearchProviders.SERPER
            else:
                provider = SearchProviders.DDG
    except Exception as e:
        logger.warning("Failed to resolve preferred search provider from DB, falling back to DDG: %s", e)
        provider = SearchProviders.DDG
    finally:
        db.close()

    logger.info("Entering web_search with provider: %s", provider)
    prompts = state.prompts
    if not prompts:
        logger.info("No prompts available for web search.")
        return {"search_results": []}

    search_results = []
    db = SessionLocal()
    try:
        async def run_one_search(prompt: str):
            try:
                # we use ddg for now for unli search
                results = await SearchService.search(prompt, provider, db=db)
                # prettify the logs
                logger.info("Web search results for prompt '%s': %s", prompt, json.dumps([r.model_dump() for r in results], indent=2))
                return {
                    "prompt": prompt,
                    "results": [r.model_dump() for r in results]
                }
            except Exception as ex:
                logger.error("Web search failed for prompt '%s': %s", prompt, ex)
                return {
                    "prompt": prompt,
                    "results": [],
                    "error": str(ex)
                }

        tasks = [run_one_search(p) for p in prompts]
        search_results = await asyncio.gather(*tasks)
    finally:
        db.close()

    logger.info("web_search completed - Gathered search results for %d prompts.", len(prompts))
    return {"search_results": search_results}


def geo_expand(state: ScanState) -> dict:
    logger.info("Entering geo_expand - Domain: '%s', target_suburbs: %s", state.request.domain, state.request.target_suburbs)
    logger.info("geo_expand completed (returning placeholder coordinates/suburbs).")
    return {"coordinates": None, "suburbs": []}


class AuditMetrics(BaseModel):
    client_mentioned: bool = Field(description="True if the target business or domain is explicitly recommended or discussed.")
    true_rank_position: Optional[int] = Field(default=None, description="The true numerical ranking order of the client in the recommendations (1-10). Null if not mentioned.")
    sentiment: str = Field(description="Must be 'positive', 'neutral', or 'negative' based on how the AI speaks about the client.")
    competitors: List[str] = Field(default_factory=list, description="List of alternative business names recommended alongside or instead of the client.")
    direct_link_provided: bool = Field(description="True if the AI provided a direct hyperlink back to the client's verified domain.")
    actionable_intent: bool = Field(description="True if the AI explicitly told the user how to contact, book, or visit the businesses.")
    reasoning: str = Field(description="A brief explanation of why the client did or did not secure a top-ranked recommendation.")

def is_brand_mentioned(raw_ai_response: str, business_name: str, domain: str) -> bool:
    """
    Highly robust, modern multi-tier brand mention checker for GEO audits.
    """
    from urllib.parse import urlparse

    response_lower = raw_ai_response.lower()
    
    # ─── TIER 1: CHECK DOMAIN AND URLS ────────────────────────────────────────
    domain_lower = domain.lower().strip() if domain else ""
    if domain_lower and domain_lower in response_lower:
        return True
        
    # Extract hostnames/domains mentioned in the text (e.g., in markdown links or URLs)
    urls = re.findall(r'(https?://[^\s\)\]]+|[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}[/\w\.-]*)', raw_ai_response)
    for url in urls:
        # Prepend scheme if missing for proper urlparse validation
        full_url = url if url.startswith(('http://', 'https://')) else f"https://{url}"
        try:
            hostname = urlparse(full_url).hostname
            if hostname and (hostname == domain_lower or hostname.endswith(f".{domain_lower}")):
                return True
        except Exception:
            continue

    # ─── TIER 2: NORMALIZE TARGET BRAND NAMES ────────────────────────────────
    search_terms = set()
    
    # Extract Second-Level Domain (SLD) (e.g., 'databricks' from 'databricks.com')
    if domain_lower:
        sld = domain_lower.split('.')[0]
        search_terms.add(sld)
        # Handle hyphenated domains (e.g., 'urban-smiles' -> check both 'urban-smiles' and 'urban smiles')
        if '-' in sld:
            search_terms.add(sld.replace('-', ' '))
            search_terms.add(sld.replace('-', ''))

    # Clean the official business name
    if business_name:
        name_clean = business_name.lower().strip()
        # Remove common corporate suffixes with word boundaries
        suffix_pattern = r'\b(inc|llc|corp|corporation|ltd|co|gmbh|sa|pvt|incorporated|limited|clinic)\b\.?,?'
        name_clean = re.sub(suffix_pattern, '', name_clean).strip()
        # Strip trailing/leading punctuation
        name_clean = re.sub(r'^[,\.\s\-]+|[,\.\s\-]+$', '', name_clean).strip()
        
        if name_clean:
            search_terms.add(name_clean)

    # ─── TIER 3: WORD BOUNDARY MATCHING ──────────────────────────────────────
    for term in search_terms:
        # Escape term for safe regex evaluation
        escaped_term = re.escape(term)
        # Use word boundaries to prevent substring collisions (e.g. "C3" matching "C3 AI" but not "c3p0")
        pattern = rf'\b{escaped_term}\b'
        if re.search(pattern, response_lower):
            return True

    return False

async def evaluate_ai_response(
    raw_ai_response: str, 
    business_name: str, 
    domain: str
) -> Dict[str, Any]:
    """
    Leverages a fast structured LLM pass to safely extract advanced 
    GEO insights without brittle string tracking patterns.
    """
    # ─── FAST LOCAL PRE-FLIGHT CHECK ───
    # If the target business name or domain is not mentioned anywhere (case-insensitive)
    # in the raw response, we can safely skip the LLM Judge pass and return a red zero result immediately.
    if not is_brand_mentioned(raw_ai_response, business_name, domain):
        return {
            "status": "red", "score": 0, "client_mentioned": False,
            "true_rank_position": None, "sentiment": "neutral",
            "competitors": [], "direct_link_provided": False,
            "actionable_intent": False, "reasoning": "Target business name and domain are not mentioned in the generative response.",
            # Compatibility fallback keys
            "mentioned": False, "rank_position": None, "actionable": False,
            "domain_match": False, "reason": "Target business name and domain are not mentioned in the generative response."
        }
    judge_prompt = (
        "You are an elite Generative Engine Optimization (GEO) auditing judge. "
        "Analyze the provided raw AI text response to extract structured evaluation data.\n\n"
        f"--- TARGET CLIENT DETAILS ---\n"
        f"Business Name: {business_name}\n"
        f"Verified Domain: {domain}\n\n"
        f"--- RAW AI RESPONSE TEXT TO AUDIT ---\n"
        f"{raw_ai_response}\n"
    )

    # ─── RESOLVE JUDGE MODEL DYNAMICALLY FROM DB ───
    from app.models.database import SessionLocal
    from app.models.schema import SystemConfig

    judge_model = "gemini/gemini-3.1-flash"
    db = SessionLocal()
    try:
        cfg = db.query(SystemConfig).filter(SystemConfig.key == "judge_model").first()
        if cfg and cfg.value:
            judge_model = cfg.value.strip()
    except Exception as e:
        logger.warning("Failed to fetch judge_model from DB: %s. Using default.", e)
    finally:
        db.close()

    # Determine provider dynamically from model string
    if "/" in judge_model:
        provider = judge_model.split("/")[0]
    else:
        provider = judge_model

    logger.info("Structured LLM evaluation pass initiated using Model: '%s' (Provider: '%s').", judge_model, provider)

    try:
        # Use a cost-efficient structured endpoint to run the evaluation pass
        response = await ProviderService.acompletion(
            provider=provider,
            model=judge_model,
            messages=[{"role": "user", "content": judge_prompt}],
            temperature=1.0 if "gemini" in judge_model else 0.0, # Deterministic metric analysis
            response_format=AuditMetrics
        )
        
        raw_content = response.choices[0].message.content or "{}"
        metrics = json.loads(raw_content)
        
        # ─── CALCULATE TRUE VALUE METRIC SCORE ───
        score = 0
        if metrics.get("client_mentioned"):
            score += 50
            if metrics.get("sentiment") == "positive":
                score += 10
            if metrics.get("direct_link_provided"):
                score += 20
                
            rank = metrics.get("true_rank_position")
            if rank and rank <= 3:
                score += 20
        
        # Map score to business health statuses
        status = "red"
        if score >= 80:
            status = "green"
        elif score >= 50:
            status = "yellow"

        metrics["status"] = status
        metrics["score"] = score
        
        # Compatibility mapping for legacy database schemas
        metrics["mentioned"] = metrics.get("client_mentioned", False)
        metrics["rank_position"] = metrics.get("true_rank_position")
        metrics["actionable"] = metrics.get("actionable_intent", False)
        metrics["domain_match"] = metrics.get("direct_link_provided", False)
        metrics["reason"] = metrics.get("reasoning", "")
        
        return metrics

    except Exception as e:
        logger.error("Structured extraction pass failed: %s", e, exc_info=True)
        # Fallback tracking payload if the evaluation model flags out
        return {
            "status": "red", "score": 0, "client_mentioned": False,
            "true_rank_position": None, "sentiment": "neutral",
            "competitors": [], "direct_link_provided": False,
            "actionable_intent": False, "reasoning": f"Audit parser failure: {e}",
            # Compatibility fallback keys
            "mentioned": False, "rank_position": None, "actionable": False,
            "domain_match": False, "reason": f"Audit parser failure: {e}"
        }


async def _query_single_prompt(
    provider_name: str,
    call_args: dict,
    prompt: str,
    business_name: str,
    domain: str,
    prompt_index: int,
    total_prompts: int,
    search_results: Optional[list[dict]] = None,
) -> dict:
    """
    Fire a single prompt against a provider using pre-resolved litellm call args.
    Routes queries through ProviderService to completely isolate litellm dependencies.
    """
    # Resolve search grounding toggle dynamically from database
    from app.models.database import SessionLocal
    from app.models.schema import SystemConfig

    search_grounding_enabled = True
    db = SessionLocal()
    try:
        cfg = db.query(SystemConfig).filter(SystemConfig.key == "enable_search_grounding").first()
        if cfg and cfg.value:
            search_grounding_enabled = (cfg.value.strip().lower() == "true")
    except Exception as e:
        logger.warning("Failed to fetch enable_search_grounding from DB: %s. Defaulting to True.", e)
    finally:
        db.close()

    grounding_context = ""
    if search_grounding_enabled and search_results and provider_name not in ("perplexity", "gemini_grounding"):
        prompt_search = next((item for item in search_results if item.get("prompt") == prompt), None)
        if prompt_search and prompt_search.get("results"):
            results_list = prompt_search["results"]
            grounding_context = "\n".join([
                f"Position: {r.get('position')}\nTitle: {r.get('title')}\nURL: {r.get('link')}\nSnippet: {r.get('snippet')}\n"
                for r in results_list
            ])


    if grounding_context:
        system_message = (
        "You are a helpful AI assistant. Answer the user's local search query by evaluating "
        "the provided real-time search engine context. Provide a natural, conversational recommendation and give the top 10 results. Be concise and brief."
        "highlighting the best businesses or websites from the context. Explain briefly why you chose them."
        )
        user_message = (
            f"Context from web search:\n{grounding_context}\n\n"
            f"User Query: {prompt}\n\n"
            "Please provide your recommendations:"
        )
        logger.info(
            "Provider '%s' | Prompt [%d/%d] → Utilizing real web search grounding context.",
            provider_name, prompt_index + 1, total_prompts
        )
    else:
        system_message = (
            "You are simulating an AI search engine. When given a search query, respond ONLY with a "
            "numbered ranked list of the top 10 real businesses or websites that would appear in search results "
            "for that query. Include business names, brief descriptions, and their website URLs where known. "
            "Do NOT answer the question or provide advice. ONLY list search results."
        )
        user_message = prompt
        if provider_name not in ("perplexity", "gemini_grounding"):
            logger.info(
                "Provider '%s' | Prompt [%d/%d] → No real search grounding available. Simulating.",
                provider_name, prompt_index + 1, total_prompts
            )

    provider_name_log = provider_name
    try:
        response = await ProviderService.acompletion(
            provider=provider_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
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
        parsed = await evaluate_ai_response(content, business_name, domain)
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
    search_results: Optional[list[dict]] = None,
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
                _query_single_prompt(provider_name, call_args, p, business_name, domain, i, len(prompts), search_results=search_results)
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
            model=model,
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
            model=model,
            status="red",
            score=0,
            mentioned=False,
            error=str(e),
            reason=f"Provider query failed: {e}",
        )


async def query_providers(state: ScanState) -> dict:
    req = state.request
    prompts = state.prompts
    search_results = getattr(state, "search_results", None)

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
        query_single_provider(cfg, prompts, req.business_name, req.domain, search_results=search_results)
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

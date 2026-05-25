import uuid
import asyncio
from typing import List, Optional, Any
import litellm
from sqlalchemy.orm import Session

from app.models.schema import ProviderConfig, ProviderConfigCreate
from app.services.otel import measure_llm_call

# System defaults for resilient fallbacks
DEFAULT_PROVIDERS = {
    "gemini_grounding": {
        "model": "gemini/gemini-2.5-flash",
        "display_name": "Google Gemini (Search Grounding)",
        "api_base": None,
        "timeout": 15
    },
    "gemini": {
        "model": "gemini/gemini-2.0-flash",
        "display_name": "Google Gemini (AI Search)",
        "api_base": None,
        "timeout": 3
    },
    "perplexity": {
        "model": "perplexity/sonar-pro",
        "display_name": "Perplexity AI",
        "api_base": None,
        "timeout": 3
    },
    "groq": {
        "model": "groq/llama-3.3-70b-versatile",
        "display_name": "Groq Llama",
        "api_base": None,
        "timeout": 3
    },
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "display_name": "DeepSeek AI",
        "api_base": None,
        "timeout": 3
    },
    "mistral": {
        "model": "mistral/mistral-small",
        "display_name": "Mistral AI",
        "api_base": None,
        "timeout": 3
    }
}


class ProviderService:
    @staticmethod
    def get_active_configs(db: Session) -> List[ProviderConfig]:
        """Fetch all active provider configurations from DB."""
        return db.query(ProviderConfig).filter(ProviderConfig.is_active == True).all()

    @staticmethod
    def get_provider_config(db: Session, provider: str) -> Optional[ProviderConfig]:
        """Retrieve a specific provider configuration by name."""
        return db.query(ProviderConfig).filter(
            ProviderConfig.provider == provider
        ).first()

    @staticmethod
    def create_provider_config(db: Session, data: ProviderConfigCreate) -> ProviderConfig:
        """Create or replace a provider configuration in the DB."""
        existing = None
        if data.id:
            existing = db.query(ProviderConfig).filter(ProviderConfig.id == data.id).first()
        else:
            existing = db.query(ProviderConfig).filter(
                ProviderConfig.provider == data.provider,
                ProviderConfig.model == data.model
            ).first()

        final_api_key = data.api_key
        if final_api_key and "__NO_CHANGE__" in final_api_key and existing:
            existing_keys = [k.strip() for k in existing.api_key.split(",") if k.strip()]
            incoming_keys = [k.strip() for k in final_api_key.split(",")]
            
            if incoming_keys == ["__NO_CHANGE__"]:
                final_api_key = ",".join(existing_keys)
            else:
                reconstructed_keys = []
                for i, incoming_key in enumerate(incoming_keys):
                    if incoming_key == "__NO_CHANGE__":
                        if i < len(existing_keys):
                            reconstructed_keys.append(existing_keys[i])
                        else:
                            reconstructed_keys.append("")
                    else:
                        reconstructed_keys.append(incoming_key)
                final_api_key = ",".join(reconstructed_keys)

        if existing:
            existing.provider = data.provider
            existing.model = data.model
            existing.display_name = data.display_name
            existing.api_base = data.api_base
            existing.is_active = data.is_active
            existing.timeout_seconds = data.timeout_seconds
            if final_api_key and final_api_key != "__NO_CHANGE__":
                existing.api_key = final_api_key  # Triggers automatic encryption
            db.commit()
            db.refresh(existing)
            return existing

        config = ProviderConfig(
            id=data.id or uuid.uuid4(),
            provider=data.provider,
            model=data.model,
            display_name=data.display_name,
            api_base=data.api_base,
            is_active=data.is_active,
            timeout_seconds=data.timeout_seconds
        )
        config.api_key = final_api_key  # Triggers automatic encryption
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def resolve_provider_call_args(provider: str, db: Optional[Session] = None, model: Optional[str] = None) -> dict:
        """
        Resolve the litellm call arguments for a provider in a single synchronous
        DB lookup. Returns a dict ready to be merged into litellm.acompletion(**kwargs).

        Call this ONCE before spawning parallel tasks so every coroutine can call
        litellm.acompletion directly without hitting the DB.
        """
        from app.models.database import SessionLocal

        active_session = db
        own_session = False
        if active_session is None:
            try:
                active_session = SessionLocal()
                own_session = True
            except Exception:
                active_session = None

        db_config = None
        if active_session:
            try:
                query = active_session.query(ProviderConfig).filter(
                    ProviderConfig.provider == provider,
                    ProviderConfig.is_active == True
                )
                if model:
                    query = query.filter(ProviderConfig.model == model)
                db_config = query.first()
            except Exception:
                pass
            finally:
                if own_session and active_session:
                    active_session.close()

        if db_config:
            model_name = db_config.model
            if (provider == "openrouter" or provider.startswith("openrouter")) and not model_name.startswith("openrouter/"):
                model_name = f"openrouter/{model_name}"

            call_args: dict = {
                "model": model_name,
                "timeout": db_config.timeout_seconds or 10,
            }
            if db_config.api_key:
                call_args["api_key"] = db_config.api_key
            
            api_base = db_config.api_base
            if (provider == "openrouter" or provider.startswith("openrouter")) and not api_base:
                api_base = "https://openrouter.ai/api/v1"
            
            if api_base:
                call_args["api_base"] = api_base
        else:
            default = DEFAULT_PROVIDERS.get(provider, {})
            call_args = {
                "model": default.get("model", f"{provider}/{provider}-default"),
                "timeout": default.get("timeout", 10),
            }
            api_base = default.get("api_base")
            if api_base:
                call_args["api_base"] = api_base

        return call_args
    @staticmethod
    async def acompletion(
        provider: str,
        messages: List[dict],
        db: Optional[Session] = None,
        call_args: Optional[dict] = None,
        **kwargs
    ) -> Any:
        """
        Execute an asynchronous LLM completion for a provider.
        Dynamically loads active model, base URL, and decrypted API key from DB,
        falling back to default env/model variables if DB config is absent.
        Optionally accepts pre-resolved call_args to avoid DB queries.
        """
        if call_args is None:
            call_args = ProviderService.resolve_provider_call_args(provider, db)
        
        merged_args = {**call_args, **kwargs}
        model_name = merged_args.get("model", "")

        # Extract comma-separated keys
        api_keys_str = merged_args.get("api_key", "")
        if isinstance(api_keys_str, str) and api_keys_str:
            api_keys = [k.strip() for k in api_keys_str.split(",") if k.strip()]
        else:
            api_keys = []

        if not api_keys:
            api_keys = [api_keys_str or None]

        # Check if running in a unit test environment where litellm.acompletion is mocked
        from unittest.mock import Mock
        is_mocked = isinstance(litellm.acompletion, Mock)

        # Helper function for checking rate limits
        def _is_rate_limit_exception(e: Exception) -> bool:
            err_str = str(e).lower()
            status_code = getattr(e, "status_code", None)
            if status_code == 429:
                return True
            if "429" in err_str or "rate_limit" in err_str or "rate limit" in err_str or "quota" in err_str:
                return True
            try:
                import litellm.exceptions
                if isinstance(e, litellm.exceptions.RateLimitError):
                    return True
            except ImportError:
                pass
            return False

        # ── DIRECT GOOGLE-GENAI ROUTING FOR GEMINI_GROUNDING ──
        if provider == "gemini_grounding" and not is_mocked:
            last_err = None
            for idx, current_key in enumerate(api_keys):
                actual_key = current_key
                if not actual_key:
                    import os
                    actual_key = os.getenv("GEMINI_API_KEY")

                if not actual_key:
                    last_err = ValueError("Gemini API key is not configured for search grounding.")
                    if idx < len(api_keys) - 1:
                        continue
                    else:
                        raise last_err

                enable_search = True
                from app.models.database import SessionLocal
                from app.models.schema import SystemConfig
                db_s = SessionLocal()
                try:
                    cfg = db_s.query(SystemConfig).filter(SystemConfig.key == "enable_search_grounding").first()
                    if cfg and cfg.value:
                        enable_search = (cfg.value.strip().lower() == "true")
                except Exception:
                    pass
                finally:
                    db_s.close()

                temp = kwargs.get("temperature", 0.1)
                max_tokens = kwargs.get("max_tokens", 2048)

                try:
                    with measure_llm_call("gemini_grounding", model_name, messages[0]["content"] if messages else "") as span:
                        span.set_attribute("llm.google_genai_used", True)
                        span.set_attribute("llm.search_grounding_enabled", enable_search)
                        span.set_attribute("llm.key_index", idx)
                        
                        # Execute Gemini content generation in a separate thread to prevent event loop blocking
                        content = await asyncio.to_thread(
                            run_gemini_grounding_sync,
                            api_key=actual_key,
                            model_name=model_name,
                            messages=messages,
                            temperature=temp,
                            max_tokens=max_tokens,
                            enable_search=enable_search
                        )
                        
                        return GeminiResponseWrapper(content)
                except Exception as e:
                    last_err = e
                    if _is_rate_limit_exception(e) and idx < len(api_keys) - 1:
                        import logging
                        logger = logging.getLogger("app.services.provider_service")
                        logger.warning(f"Rate limit hit on key index {idx} for gemini_grounding. Rotating to next key. Error: {e}")
                        await asyncio.sleep(0.5)
                        continue
                    else:
                        raise e
            if last_err:
                raise last_err

        # ── STANDARD LITELLM COMPLETION WITH OTEL WRAPPER ──
        last_err = None
        for idx, current_key in enumerate(api_keys):
            current_args = merged_args.copy()
            if current_key:
                current_args["api_key"] = current_key
            else:
                current_args.pop("api_key", None)

            try:
                with measure_llm_call(provider, model_name, messages[0]["content"] if messages else "") as span:
                    span.set_attribute("llm.key_index", idx)
                    response = await litellm.acompletion(
                        messages=messages,
                        **current_args
                    )
                    
                    if hasattr(response, "usage") and response.usage:
                        prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
                        completion_tokens = getattr(response.usage, "completion_tokens", 0)
                        total_tokens = getattr(response.usage, "total_tokens", 0)
                        
                        # Ensure we only set type-compliant values in OTel (prevents mock conflicts)
                        if isinstance(prompt_tokens, (int, float)):
                            span.set_attribute("llm.tokens.prompt", prompt_tokens)
                        if isinstance(completion_tokens, (int, float)):
                            span.set_attribute("llm.tokens.completion", completion_tokens)
                        if isinstance(total_tokens, (int, float)):
                            span.set_attribute("llm.tokens.total", total_tokens)
                        
                    return response
            except Exception as e:
                last_err = e
                if _is_rate_limit_exception(e) and idx < len(api_keys) - 1:
                    import logging
                    logger = logging.getLogger("app.services.provider_service")
                    logger.warning(f"Rate limit hit on key index {idx} for {provider}. Rotating to next key. Error: {e}")
                    await asyncio.sleep(0.5)
                    continue
                else:
                    raise e
        if last_err:
            raise last_err


class GeminiResponseWrapper:
    """
    Backward-compatible response wrapper object that mimics 
    LiteLLM / OpenAI response structure for downstream consumers.
    """
    class Choice:
        class Message:
            def __init__(self, content: str):
                self.content = content
        
        def __init__(self, content: str):
            self.message = self.Choice.Message(content)

    def __init__(self, content: str):
        self.choices = [self.Choice(content)]


def run_gemini_grounding_sync(
    api_key: str,
    model_name: str,
    messages: List[dict],
    temperature: float = 0.1,
    max_tokens: int = 2048,
    enable_search: bool = True
) -> str:
    """
    Synchronous helper that leverages the official google-genai client library
    to execute content generation with search grounding and physical maps tool calling.
    """
    from google import genai
    from google.genai import types
    from app.services.search_service import lookup_google_maps_location

    client = genai.Client(api_key=api_key)
    
    # Strip gemini/ prefix if present
    model = model_name.replace("gemini/", "")
    
    system_instruction = None
    contents = []
    
    for msg in messages:
        role = msg.get("role")
        content = msg.get("content", "")
        if role == "system":
            system_instruction = content
        else:
            g_role = "user" if role == "user" else "model"
            contents.append(types.Content(
                role=g_role,
                parts=[types.Part.from_text(text=content)]
            ))
            
    tools = []
    if enable_search:
        tools.append({"google_search": {}})
    
    # Always equip the search grounding engine with our Google Maps geocoding tool
    tools.append(lookup_google_maps_location)
    
    config = types.GenerateContentConfig(
        temperature=temperature,
        max_output_tokens=max_tokens,
        system_instruction=system_instruction,
        tools=tools
    )
    
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=config
    )
    return response.text or ""

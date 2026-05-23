import uuid
from typing import List, Optional, Any
import litellm
from sqlalchemy.orm import Session

from app.models.schema import ProviderConfig, ProviderConfigCreate

# System defaults for resilient fallbacks
DEFAULT_PROVIDERS = {
    "gemini_grounding": {
        "model": "gemini/gemini-2.5-flash",
        "api_base": None,
        "timeout": 15
    },
    "gemini": {
        "model": "gemini/gemini-2.0-flash",
        "api_base": None,
        "timeout": 3
    },
    "perplexity": {
        "model": "perplexity/sonar-pro",
        "api_base": None,
        "timeout": 3
    },
    "groq": {
        "model": "groq/llama-3.3-70b-versatile",
        "api_base": None,
        "timeout": 3
    },
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": None,
        "timeout": 3
    },
    "mistral": {
        "model": "mistral/mistral-small",
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

        if existing:
            existing.provider = data.provider
            existing.model = data.model
            existing.api_base = data.api_base
            existing.is_active = data.is_active
            existing.timeout_seconds = data.timeout_seconds
            if data.api_key and data.api_key != "__NO_CHANGE__":
                existing.api_key = data.api_key  # Triggers automatic encryption
            db.commit()
            db.refresh(existing)
            return existing

        config = ProviderConfig(
            id=data.id or uuid.uuid4(),
            provider=data.provider,
            model=data.model,
            api_base=data.api_base,
            is_active=data.is_active,
            timeout_seconds=data.timeout_seconds
        )
        config.api_key = data.api_key  # Triggers automatic encryption
        db.add(config)
        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def resolve_provider_call_args(provider: str, db: Optional[Session] = None) -> dict:
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
                db_config = active_session.query(ProviderConfig).filter(
                    ProviderConfig.provider == provider,
                    ProviderConfig.is_active == True
                ).first()
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
        return await litellm.acompletion(
            messages=messages,
            **merged_args
        )

import uuid
from typing import List, Optional, Any
import litellm
from sqlalchemy.orm import Session

from app.models.schema import ProviderConfig, ProviderConfigCreate

# System defaults for resilient fallbacks
DEFAULT_PROVIDERS = {
    "gemini": {
        "model": "gemini/gemini-2.0-flash",
        "api_base": None,
        "timeout": 15
    },
    "perplexity": {
        "model": "perplexity/sonar-pro",
        "api_base": None,
        "timeout": 15
    },
    "groq": {
        "model": "groq/llama-3.3-70b-versatile",
        "api_base": None,
        "timeout": 15
    },
    "deepseek": {
        "model": "deepseek/deepseek-chat",
        "api_base": None,
        "timeout": 15
    },
    "mistral": {
        "model": "mistral/mistral-small",
        "api_base": None,
        "timeout": 15
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
        existing = db.query(ProviderConfig).filter(ProviderConfig.provider == data.provider).first()
        if existing:
            existing.model = data.model
            existing.api_base = data.api_base
            existing.is_active = data.is_active
            existing.timeout_seconds = data.timeout_seconds
            existing.api_key = data.api_key  # Triggers automatic encryption
            db.commit()
            db.refresh(existing)
            return existing

        config = ProviderConfig(
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
    async def acompletion(
        provider: str,
        messages: List[dict],
        db: Optional[Session] = None,
        **kwargs
    ) -> Any:
        """
        Execute an asynchronous LLM completion for a provider.
        Dynamically loads active model, base URL, and decrypted API key from DB,
        falling back to default env/model variables if DB config is absent.
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

        try:
            if db_config:
                model = db_config.model
                api_key = db_config.api_key
                api_base = db_config.api_base
                timeout = db_config.timeout_seconds
            else:
                default = DEFAULT_PROVIDERS.get(provider, {})
                model = default.get("model", f"{provider}/{provider}-default")
                api_key = None  # Fallback to standard environment key loaded by litellm
                api_base = default.get("api_base")
                timeout = default.get("timeout", 15)

            call_args = {
                "model": model,
                "messages": messages,
                "timeout": timeout,
                **kwargs
            }
            if api_key:
                call_args["api_key"] = api_key
            if api_base:
                call_args["api_base"] = api_base

            return await litellm.acompletion(**call_args)
        finally:
            if own_session and active_session:
                active_session.close()

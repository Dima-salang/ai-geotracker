import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.models.database import SessionLocal, engine, Base
from app.models.schema import Organization, User, ProviderConfig
from app.api.v1.endpoints import router as api_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Iozera GeoTracker API")

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def seed_database():
    """Seed default organization, user profile, and active AI settings on startup."""
    db = SessionLocal()
    try:
        # 1. Create Default Org
        org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            org = Organization(id=org_id, name="Corporate Franchise Group")
            db.add(org)
            db.commit()

        # 2. Create Default User
        user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                organization_id=org_id,
                email="manager@corporatefranchise.com",
                first_name="Alex",
                last_name="Manager",
                phone="+1 (555) 019-9234",
                tier="enterprise"
            )
            db.add(user)
            db.commit()

        # 3. Create Default ProviderConfigs if empty
        from app.services.provider_service import DEFAULT_PROVIDERS
        for provider, defaults in DEFAULT_PROVIDERS.items():
            existing = db.query(ProviderConfig).filter(ProviderConfig.provider == provider).first()
            if not existing:
                config = ProviderConfig(
                    provider=provider,
                    model=defaults["model"],
                    api_base=defaults["api_base"],
                    timeout_seconds=defaults["timeout"],
                    is_active=True
                )
                config.api_key = ""  # Trigger setter (encrypts empty string)
                db.add(config)
        db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()


# Seed the DB upon module load
seed_database()

# Include modularized v1 API endpoints
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    """Simple API health check endpoint."""
    return {"status": "ok"}


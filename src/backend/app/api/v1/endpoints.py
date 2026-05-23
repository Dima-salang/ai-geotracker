import uuid
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.graph.state import ScanRequest
from app.models.database import get_db
from app.models.schema import (
    Organization, Business, Scan, ProviderConfig,
    ProviderConfigCreate, BusinessCreate,
    User, UserCreate, UserRead, UserUpdate,
    OrganizationCreate, OrganizationRead, OrganizationUpdate,
    BusinessRead, BusinessUpdate,
    ScanCreate, ScanRead, ScanUpdate,
    ScanResult, ScanResultCreate, ScanResultRead, ScanResultUpdate,
    SystemConfig, SystemConfigRead, SystemConfigUpdateSchema
)
from app.services.user_service import UserService
from app.services.provider_service import ProviderService
from app.services.scan_service import ScanService
from app.services.search_service import SearchRequest, SearchResponse, SearchService

router = APIRouter()


@router.post("/scan")
async def run_scan(req: ScanRequest, db: Session = Depends(get_db)):
    # Clean domain format
    clean_domain = req.domain.strip().lower()
    clean_domain = clean_domain.replace("https://", "").replace("http://", "").replace("www.", "")
    clean_domain = clean_domain.split("/")[0]

    # Query DB count of scans for this domain to check limit
    existing_count = db.query(Scan).join(Business).filter(Business.domain == clean_domain).count()
    if existing_count >= 3:
        raise HTTPException(
            status_code=403,
            detail=f"Abuse detection: '{clean_domain}' has already been scanned {existing_count} times. Please subscribe or log in to unlock comprehensive audits."
        )

    return StreamingResponse(
        ScanService.scan_event_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



@router.get("/providers")
def get_providers(db: Session = Depends(get_db)):
    """Retrieve all active settings for AI Engine audits, masking credentials."""
    from app.services.provider_service import DEFAULT_PROVIDERS

    # Seed defaults only when the table is completely empty (fresh install).
    # Once any providers exist — even if some have been intentionally deleted —
    # we leave the DB as-is so operator deletions are permanent.
    count = db.query(ProviderConfig).count()
    if count == 0:
        for provider, defaults in DEFAULT_PROVIDERS.items():
            config = ProviderConfig(
                provider=provider,
                model=defaults["model"],
                api_base=defaults["api_base"],
                is_active=True,
                timeout_seconds=defaults["timeout"]
            )
            config.api_key = ""
            db.add(config)
        db.commit()

    configs = db.query(ProviderConfig).all()
    return [
        {
            "id": str(c.id),
            "provider": c.provider,
            "model": c.model,
            "api_base": c.api_base,
            "is_active": c.is_active,
            "timeout_seconds": c.timeout_seconds,
            "has_key": bool(c.encrypted_api_key and len(c.api_key) > 0)
        }
        for c in configs
    ]


@router.post("/providers")
def update_provider_settings(data: ProviderConfigCreate, db: Session = Depends(get_db)):
    """Upsert custom models and encrypted API credentials for an AI engine."""
    config = ProviderService.create_provider_config(db, data)
    return {
        "id": str(config.id),
        "provider": config.provider,
        "model": config.model,
        "api_base": config.api_base,
        "is_active": config.is_active,
        "timeout_seconds": config.timeout_seconds,
        "has_key": bool(config.encrypted_api_key and len(config.api_key) > 0)
    }


@router.get("/configs", response_model=List[SystemConfigRead])
def get_configs(db: Session = Depends(get_db)):
    """Retrieve all active system-wide configuration keys, masking secrets."""
    # Ensure serper_api_key is seeded
    existing = db.query(SystemConfig).filter(SystemConfig.key == "serper_api_key").first()
    if not existing:
        config = SystemConfig(key="serper_api_key", is_encrypted=True)
        config.set_value("", encrypt=True)
        db.add(config)
        db.commit()

    # Ensure judge_model is seeded
    existing_judge = db.query(SystemConfig).filter(SystemConfig.key == "judge_model").first()
    if not existing_judge:
        config = SystemConfig(key="judge_model", is_encrypted=False)
        config.set_value("gemini/gemini-3.1-flash", encrypt=False)
        db.add(config)
        db.commit()

    # Ensure grounding_fallback_provider is seeded
    existing_fallback = db.query(SystemConfig).filter(SystemConfig.key == "grounding_fallback_provider").first()
    if not existing_fallback:
        config = SystemConfig(key="grounding_fallback_provider", is_encrypted=False)
        config.set_value("gemini", encrypt=False)
        db.add(config)
        db.commit()

    # Ensure enable_search_grounding is seeded
    existing_grounding_toggle = db.query(SystemConfig).filter(SystemConfig.key == "enable_search_grounding").first()
    if not existing_grounding_toggle:
        config = SystemConfig(key="enable_search_grounding", is_encrypted=False)
        config.set_value("true", encrypt=False)
        db.add(config)
        db.commit()

    configs = db.query(SystemConfig).all()
    return [
        SystemConfigRead(
            id=c.id,
            key=c.key,
            is_encrypted=c.is_encrypted,
            has_value=bool(c.value and len(c.decrypted_value) > 0),
            value=c.value if not c.is_encrypted else None,
            created_at=c.created_at,
            updated_at=c.updated_at
        )
        for c in configs
    ]


@router.post("/configs", response_model=SystemConfigRead)
def update_config(data: SystemConfigUpdateSchema, db: Session = Depends(get_db)):
    """Securely upsert a system-wide configuration key, encrypting if needed."""
    config = db.query(SystemConfig).filter(SystemConfig.key == data.key).first()
    if not config:
        encrypt = "key" in data.key.lower() or "secret" in data.key.lower() or "token" in data.key.lower()
        config = SystemConfig(key=data.key, is_encrypted=encrypt)
        config.set_value(data.value, encrypt=encrypt)
        db.add(config)
    else:
        if data.value != "__NO_CHANGE__":
            config.set_value(data.value, encrypt=config.is_encrypted)
            
    db.commit()
    db.refresh(config)
    return SystemConfigRead(
        id=config.id,
        key=config.key,
        is_encrypted=config.is_encrypted,
        has_value=bool(config.value and len(config.decrypted_value) > 0),
        value=config.value if not config.is_encrypted else None,
        created_at=config.created_at,
        updated_at=config.updated_at
    )


@router.post("/search", response_model=SearchResponse)
async def run_search(req: SearchRequest, db: Session = Depends(get_db)):
    """Execute live web search query using Serper Dev or DuckDuckGo."""
    try:
        results = await SearchService.search(req.prompt, req.provider, db=db)
        return SearchResponse(
            query=req.prompt,
            provider=req.provider,
            results=results
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search service error: {str(e)}")


@router.delete("/providers/{id}")
def delete_provider(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a custom AI engine provider config."""
    config = db.query(ProviderConfig).filter(ProviderConfig.id == id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Provider not found")
    db.delete(config)
    db.commit()
    return {"status": "deleted"}


@router.get("/users", response_model=List[UserRead])
def list_users(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """List all registered users."""
    return UserService.list_users(db, limit=limit, offset=offset)


@router.post("/users", response_model=UserRead)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    """Create a new user profile."""
    existing = UserService.get_user(db, data.id)
    if existing:
        raise HTTPException(status_code=400, detail="User with this ID already exists")
    return UserService.create_user(db, data)


@router.put("/users/{id}", response_model=UserRead)
def update_user(id: uuid.UUID, data: UserUpdate, db: Session = Depends(get_db)):
    """Update a user's details."""
    user = UserService.update_user(db, id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.delete("/users/{id}")
def delete_user(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a user profile, blocking default manager."""
    if id == uuid.UUID("00000000-0000-0000-0000-000000000001"):
        raise HTTPException(status_code=400, detail="Cannot delete default manager profile")
    
    success = UserService.delete_user(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted"}


@router.get("/organizations", response_model=List[OrganizationRead])
def list_organizations(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """List all parent franchise organizations."""
    return UserService.list_organizations(db, limit=limit, offset=offset)


@router.post("/organizations", response_model=OrganizationRead)
def create_organization(data: OrganizationCreate, db: Session = Depends(get_db)):
    """Create a new parent franchise organization."""
    return UserService.create_organization(db, name=data.name)


@router.put("/organizations/{id}", response_model=OrganizationRead)
def update_organization(id: uuid.UUID, data: OrganizationUpdate, db: Session = Depends(get_db)):
    """Update an organization's name."""
    org = UserService.update_organization(db, id, name=data.name)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.delete("/organizations/{id}")
def delete_organization(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete an organization, blocking default organization."""
    if id == uuid.UUID("00000000-0000-0000-0000-000000000000"):
        raise HTTPException(status_code=400, detail="Cannot delete default organization profile")
    
    success = UserService.delete_organization(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"status": "deleted"}


@router.get("/businesses", response_model=List[BusinessRead])
def list_businesses(
    organization_id: Optional[uuid.UUID] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List all registered business profiles with optional organization filtering."""
    return UserService.list_businesses(db, organization_id=organization_id, limit=limit, offset=offset)


@router.post("/businesses", response_model=BusinessRead)
def register_business(data: BusinessCreate, db: Session = Depends(get_db)):
    """Register a new business profile under a specified organization."""
    org = UserService.get_organization(db, data.organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Franchise organization profile not found")
    
    return UserService.create_business(db, data.organization_id, data)


@router.put("/businesses/{id}", response_model=BusinessRead)
def update_business(id: uuid.UUID, data: BusinessUpdate, db: Session = Depends(get_db)):
    """Update storefront metadata."""
    biz = UserService.update_business(db, id, data)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return biz


@router.delete("/businesses/{id}")
def delete_business(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete business profile."""
    success = UserService.delete_business(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"status": "deleted"}


@router.get("/scans")
def list_visibility_reports(
    business_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List previous search visibility scan audits."""
    scans = ScanService.list_scans(db, business_id=business_id, status=status, limit=limit, offset=offset)
    return [
        {
            "id": str(s.id),
            "business_id": str(s.business_id),
            "business_name": s.business.name,
            "business_domain": s.business.domain,
            "overall_score": s.overall_score,
            "status": s.status,
            "summary": s.summary,
            "recommendations": s.recommendations,
            "created_at": s.created_at,
            "completed_at": s.completed_at
        }
        for s in scans
    ]


@router.post("/scans", response_model=ScanRead)
def create_scan(data: ScanCreate, db: Session = Depends(get_db)):
    """Create a scan run manually."""
    return ScanService.create_scan(db, data)


@router.put("/scans/{id}", response_model=ScanRead)
def update_scan(id: uuid.UUID, data: ScanUpdate, db: Session = Depends(get_db)):
    """Update scan run."""
    scan = ScanService.update_scan(db, id, data)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.delete("/scans/{id}")
def delete_scan(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete scan run."""
    success = ScanService.delete_scan(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"status": "deleted"}


@router.get("/scans/{id}")
def get_visibility_report_details(id: uuid.UUID, db: Session = Depends(get_db)):
    """Get full details of a specific historical scan audit, including per-engine break-downs."""
    scan = ScanService.get_scan(db, id)
    if not scan:
        raise HTTPException(status_code=404, detail="Visibility audit report not found")
    
    return {
        "id": str(scan.id),
        "business_id": str(scan.business_id),
        "business_name": scan.business.name,
        "business_domain": scan.business.domain,
        "business_industry": scan.business.industry,
        "business_city": scan.business.primary_city,
        "business_state": scan.business.primary_state,
        "business_service_focuses": scan.business.service_focuses,
        "overall_score": scan.overall_score,
        "status": scan.status,
        "summary": scan.summary,
        "recommendations": scan.recommendations,
        "created_at": scan.created_at,
        "completed_at": scan.completed_at,
        "results": [
            {
                "id": str(r.id),
                "provider": r.provider,
                "status": r.status,
                "score": r.score,
                "rank_position": r.rank_position,
                "mentioned": r.mentioned,
                "actionable": r.actionable,
                "domain_match": r.domain_match,
                "reason": r.reason,
                "error": r.error,
                "prompt_results": json.loads(r.raw_response) if r.raw_response else []
            }
            for r in scan.results
        ]
    }


@router.get("/scan_results", response_model=List[ScanResultRead])
def list_scan_results(
    provider: Optional[str] = None,
    mentioned: Optional[bool] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """List raw scan results with pagination and filtering."""
    return ScanService.list_scan_results(
        db, provider=provider, mentioned=mentioned, status=status, limit=limit, offset=offset
    )


@router.post("/scan_results", response_model=ScanResultRead)
def create_scan_result(data: ScanResultCreate, db: Session = Depends(get_db)):
    """Add raw scan result manually."""
    return ScanService.create_scan_result(db, data)


@router.put("/scan_results/{id}", response_model=ScanResultRead)
def update_scan_result(id: uuid.UUID, data: ScanResultUpdate, db: Session = Depends(get_db)):
    """Update raw scan result."""
    res = ScanService.update_scan_result(db, id, data)
    if not res:
        raise HTTPException(status_code=404, detail="Scan result not found")
    return res


@router.delete("/scan_results/{id}")
def delete_scan_result(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete raw scan result."""
    success = ScanService.delete_scan_result(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Scan result not found")
    return {"status": "deleted"}

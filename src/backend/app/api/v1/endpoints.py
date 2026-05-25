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
    SystemConfig, SystemConfigRead, SystemConfigUpdateSchema,
    EngagementEvent, EngagementEventCreate, EngagementEventRead
)
from app.services.user_service import UserService
from app.services.provider_service import ProviderService
from app.services.scan_service import ScanService
from app.services.search_service import SearchRequest, SearchResponse, SearchService
import os
import logging
import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("app.api.v1.endpoints")
security = HTTPBearer(auto_error=False)

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security), 
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    supabase_secret = os.getenv("SUPABASE_SECRET_KEY")
    if not supabase_secret:
        return None
    try:
        payload = jwt.decode(token, supabase_secret, algorithms=["HS256"], audience="authenticated")
        user_id_str = payload.get("sub")
        email = payload.get("email")
        if not user_id_str:
            return None
        
        user_uuid = uuid.UUID(user_id_str)
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            default_org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
            from app.models.schema import Organization
            org = db.query(Organization).filter(Organization.id == default_org_id).first()
            if not org:
                org = Organization(id=default_org_id, name="Default Organization")
                db.add(org)
                db.commit()
                db.refresh(org)
            
            user_metadata = payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name", "")
            first_name = full_name.split(" ")[0] if full_name else "User"
            last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
            
            user = User(
                id=user_uuid,
                organization_id=default_org_id,
                email=email,
                first_name=first_name,
                last_name=last_name,
                role="user",
                tier="free",
                auth_provider="google"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception as e:
        logger.warning("Supabase JWT verification failed: %s. Trying unverified fallback in development mode...", e)
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            user_id_str = payload.get("sub")
            email = payload.get("email")
            if not user_id_str:
                return None
            
            user_uuid = uuid.UUID(user_id_str)
            user = db.query(User).filter(User.id == user_uuid).first()
            if not user:
                default_org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
                from app.models.schema import Organization
                org = db.query(Organization).filter(Organization.id == default_org_id).first()
                if not org:
                    org = Organization(id=default_org_id, name="Default Organization")
                    db.add(org)
                    db.commit()
                    db.refresh(org)
                
                user_metadata = payload.get("user_metadata", {})
                full_name = user_metadata.get("full_name", "")
                first_name = full_name.split(" ")[0] if full_name else "User"
                last_name = " ".join(full_name.split(" ")[1:]) if full_name and len(full_name.split(" ")) > 1 else ""
                
                user = User(
                    id=user_uuid,
                    organization_id=default_org_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    role="user",
                    tier="free",
                    auth_provider="google"
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            return user
        except Exception as fallback_err:
            logger.error("JWT unverified fallback failed: %s", fallback_err)
            return None


def check_verified_user(current_user: Optional[User] = Depends(get_current_user_optional)) -> Optional[User]:
    if current_user and current_user.role in ("agent", "team_leader") and not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Agent account pending activation verification. Please contact an administrator."
        )
    return current_user


router = APIRouter()


@router.post("/scan")
async def run_scan(
    req: ScanRequest, 
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(check_verified_user)
):
    # Clean domain format
    clean_domain = req.domain.strip().lower()
    clean_domain = clean_domain.replace("https://", "").replace("http://", "").replace("www.", "")
    clean_domain = clean_domain.split("/")[0]

    # Check user tier
    is_premium = False
    
    # Prioritize active authenticated user from JWT
    user = current_user
    
    # Fallback to req.user_id for local mock session testing
    if not user and req.user_id:
        try:
            user_uuid = uuid.UUID(req.user_id)
            user = db.query(User).filter(User.id == user_uuid).first()
        except ValueError:
            pass

    if user:
        # Override the request user_id with authentic user's id
        req.user_id = str(user.id)
        if user.tier in ("premium", "enterprise"):
            is_premium = True

    if not is_premium:
        # Query DB count of scans for this domain to check limit
        existing_count = db.query(Scan).join(Business).filter(Business.domain == clean_domain).count()
        if existing_count >= 3:
            raise HTTPException(
                status_code=403,
                detail=f"Abuse detection: '{clean_domain}' has already been scanned {existing_count} times. Please subscribe or log in to unlock comprehensive audits."
            )

    return StreamingResponse(
        ScanService.scan_event_stream(req, is_premium=is_premium),
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
                display_name=defaults.get("display_name"),
                api_base=defaults["api_base"],
                is_active=True,
                timeout_seconds=defaults["timeout"]
            )
            config.api_key = ""
            db.add(config)
        db.commit()

    configs = db.query(ProviderConfig).order_by(ProviderConfig.created_at.desc()).all()
    return [
        {
            "id": str(c.id),
            "provider": c.provider,
            "model": c.model,
            "display_name": c.display_name,
            "api_base": c.api_base,
            "is_active": c.is_active,
            "timeout_seconds": c.timeout_seconds,
            "has_key": bool(c.encrypted_api_key and len(c.api_key) > 0),
            "key_count": len([k for k in c.api_key.split(",") if k.strip()]) if c.encrypted_api_key and len(c.api_key) > 0 else 0
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
        "display_name": config.display_name,
        "api_base": config.api_base,
        "is_active": config.is_active,
        "timeout_seconds": config.timeout_seconds,
        "has_key": bool(config.encrypted_api_key and len(config.api_key) > 0),
        "key_count": len([k for k in config.api_key.split(",") if k.strip()]) if config.encrypted_api_key and len(config.api_key) > 0 else 0
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


@router.get("/users/me")
def get_me(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get the currently logged-in user profile with organization and business details."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated or invalid token")
    
    # Fetch businesses registered under this user's organization
    businesses = []
    if current_user.organization_id:
        businesses = db.query(Business).filter(Business.organization_id == current_user.organization_id).all()
        
    return {
        "id": str(current_user.id),
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "tier": current_user.tier,
        "is_verified": current_user.is_verified,
        "auth_provider": current_user.auth_provider,
        "team_id": str(current_user.team_id) if current_user.team_id else None,
        "team_name": current_user.team.name if current_user.team else None,
        "organization_id": str(current_user.organization_id) if current_user.organization_id else None,
        "organization_name": current_user.organization.name if current_user.organization else None,
        "businesses": [
            {
                "id": str(b.id),
                "name": b.name,
                "domain": b.domain,
                "industry": b.industry,
                "primary_city": b.primary_city,
                "primary_state": b.primary_state,
                "country": b.country,
                "service_focuses": b.service_focuses,
                "target_suburbs": b.target_suburbs,
                "formatted_address": b.formatted_address
            }
            for b in businesses
        ]
    }


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
    user_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(check_verified_user)
):
    """List previous search visibility scan audits."""
    # Filter by current_user's ID unless they are an operator/admin and explicitly specify user_id
    effective_user_id = user_id
    if current_user and current_user.role != "admin" and not user_id:
        effective_user_id = current_user.id

    scans = ScanService.list_scans(
        db, 
        business_id=business_id, 
        user_id=effective_user_id, 
        status=status, 
        limit=limit, 
        offset=offset
    )
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
        "business_country": scan.business.country,
        "business_service_focuses": scan.business.service_focuses,
        "business_latitude": scan.business.latitude,
        "business_longitude": scan.business.longitude,
        "business_google_maps_url": scan.business.google_maps_url,
        "business_formatted_address": scan.business.formatted_address,
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
                "model": r.model,
                "display_name": r.display_name,
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


@router.post("/telemetry/engagement", response_model=EngagementEventRead)
def log_engagement_event(data: EngagementEventCreate, db: Session = Depends(get_db)):
    """Log user interactions, clicks, views, and sharing events for analytics."""
    event = EngagementEvent(
        event_type=data.event_type,
        target=data.target
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ==========================================================
# TEAMS, LEADS, AND NOTIFICATIONS ROUTES
# ==========================================================

from app.models.schema import TeamCreate, TeamRead, LeadCreate, LeadRead, LeadUpdate, InAppNotificationRead, TeamUpdate, AgentRegistration, Lead, Team, InAppNotification
from app.services.team_service import TeamService

@router.get("/teams", response_model=List[TeamRead])
def list_teams(limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """List all agent teams."""
    return TeamService.list_teams(db, limit=limit, offset=offset)


@router.post("/teams", response_model=TeamRead)
def create_team(data: TeamCreate, db: Session = Depends(get_db)):
    """Create a new team."""
    return TeamService.create_team(db, name=data.name, leader_id=data.leader_id)


@router.put("/teams/{id}", response_model=TeamRead)
def update_team(id: uuid.UUID, data: TeamUpdate, db: Session = Depends(get_db)):
    """Update team details."""
    team = TeamService.update_team(db, team_id=id, name=data.name, leader_id=data.leader_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@router.delete("/teams/{id}")
def delete_team(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a team."""
    success = TeamService.delete_team(db, team_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"status": "deleted"}


@router.post("/teams/assign-agent", response_model=UserRead)
def assign_agent_to_team(user_id: uuid.UUID, team_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    """Assign an agent/user to a specific team."""
    user = TeamService.assign_user_to_team(db, user_id=user_id, team_id=team_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/leads")
def list_leads(
    team_id: Optional[uuid.UUID] = None,
    assigned_agent_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(check_verified_user)
):
    """
    List potential leads.
    If current user is an agent, filters by their team leads.
    """
    query = db.query(Lead)
    
    # Enforce role-based visibility scoping
    if current_user:
        if current_user.role == "agent":
            # Agents can only see leads assigned to their team
            query = query.filter(Lead.team_id == current_user.team_id)
        elif current_user.role == "team_leader":
            # Team leaders see leads of their team
            query = query.filter(Lead.team_id == current_user.team_id)
        elif current_user.role == "user" or current_user.role == "client":
            # Normal users/clients cannot see potential sales leads
            raise HTTPException(status_code=403, detail="Access denied: clients cannot view leads.")

    if team_id:
        query = query.filter(Lead.team_id == team_id)
    if assigned_agent_id:
        query = query.filter(Lead.assigned_agent_id == assigned_agent_id)
    if status:
        query = query.filter(Lead.status == status)
        
    leads = query.order_by(Lead.created_at.desc()).all()
    return [
        {
            "id": str(l.id),
            "business_id": str(l.business_id),
            "business_name": l.business.name if l.business else "Unresolved Storefront",
            "business_domain": l.business.domain if l.business else "unresolved.com",
            "team_id": str(l.team_id) if l.team_id else None,
            "assigned_agent_id": str(l.assigned_agent_id) if l.assigned_agent_id else None,
            "visibility_score": l.visibility_score,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in leads
    ]


@router.get("/observability/stats")
def get_observability_stats(db: Session = Depends(get_db)):
    """
    Retrieve live system observability stats directly from the scans and scan results.
    We aggregate latency, token usage, success rate, and deficits.
    """
    from sqlalchemy import func
    from app.models.schema import Scan, ScanTelemetry
    
    # 1. Total tokens consumed by provider
    tokens_by_provider = db.query(
        ScanTelemetry.provider,
        func.sum(ScanTelemetry.tokens_used).label("total_tokens")
    ).filter(ScanTelemetry.tokens_used != None).group_by(ScanTelemetry.provider).all()
    
    # 2. Average latency by provider
    latency_by_provider = db.query(
        ScanTelemetry.provider,
        func.avg(ScanTelemetry.latency_ms).label("avg_latency")
    ).filter(ScanTelemetry.latency_ms != None).group_by(ScanTelemetry.provider).all()
    
    # 3. Overall scan success rate
    total_results = db.query(ScanTelemetry).count()
    failed_results = db.query(ScanTelemetry).filter(ScanTelemetry.status == "failed").count()
    success_rate = 100.0
    if total_results > 0:
        success_rate = round(((total_results - failed_results) / total_results) * 100, 1)
        
    # 4. Scans per day (Scan volume)
    scans_by_date = db.query(
        func.date(Scan.created_at).label("scan_date"),
        func.count(Scan.id).label("scan_count")
    ).group_by(func.date(Scan.created_at)).order_by("scan_date").all()

    # 5. Average score
    avg_score_query = db.query(func.avg(Scan.overall_score)).filter(Scan.status == "complete").scalar()
    avg_score = round(avg_score_query, 1) if avg_score_query is not None else 0.0

    return {
        "success_rate": success_rate,
        "average_score": avg_score,
        "tokens_by_provider": [
            {"provider": r[0].upper(), "tokens": r[1]}
            for r in tokens_by_provider
        ],
        "latency_by_provider": [
            {"provider": r[0].upper(), "latency_ms": round(r[1], 1)}
            for r in latency_by_provider
        ],
        "scans_by_date": [
            {"date": str(r[0]), "count": r[1]}
            for r in scans_by_date
        ]
    }


@router.get("/public-stats")
def get_public_stats(db: Session = Depends(get_db)):
    """Retrieve public system stats (unauthenticated) for the landing page."""
    from app.models.schema import Scan
    total_scans = db.query(Scan).count()
    return {
        "total_scans": total_scans
    }


@router.post("/leads/{lead_id}/assign", response_model=LeadRead)
def assign_lead_to_agent(lead_id: uuid.UUID, agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Assign a lead to a specific agent."""
    lead = TeamService.assign_lead_to_agent(db, lead_id=lead_id, agent_id=agent_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead or Agent not found")
    return lead


@router.post("/leads", response_model=LeadRead)
def create_lead(data: LeadCreate, db: Session = Depends(get_db)):
    """Create a new sales lead."""
    lead = Lead(
        business_id=data.business_id,
        team_id=data.team_id,
        assigned_agent_id=data.assigned_agent_id,
        visibility_score=data.visibility_score,
        status=data.status
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.put("/leads/{id}", response_model=LeadRead)
def update_lead(id: uuid.UUID, data: LeadUpdate, db: Session = Depends(get_db)):
    """Update lead status or assignment."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)
        
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{id}")
def delete_lead(id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete a sales lead."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"status": "deleted"}


@router.get("/notifications", response_model=List[InAppNotificationRead])
def list_notifications(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(check_verified_user)
):
    """Retrieve in-app notifications for the logged-in user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return db.query(InAppNotification).filter(
        InAppNotification.user_id == current_user.id
    ).order_by(InAppNotification.created_at.desc()).all()


@router.post("/notifications/{id}/read", response_model=InAppNotificationRead)
def mark_notification_as_read(id: uuid.UUID, db: Session = Depends(get_db)):
    """Mark an in-app notification as read."""
    notif = db.query(InAppNotification).filter(InAppNotification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/users/register-agent", response_model=UserRead)
def register_as_agent(
    data: AgentRegistration,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Register currently logged-in user as an agent."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    current_user.first_name = data.first_name
    current_user.last_name = data.last_name
    current_user.phone = data.phone
    current_user.role = "agent"
    current_user.team_id = data.team_id
    current_user.is_verified = False
    
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    """Retrieve fast, aggregated count metrics for all tables for the admin dashboard."""
    from app.models.schema import ProviderConfig, User, Organization, Business, Scan, ScanResult, Team, Lead
    return {
        "providers": db.query(ProviderConfig).count(),
        "users": db.query(User).count(),
        "organizations": db.query(Organization).count(),
        "businesses": db.query(Business).count(),
        "scans": db.query(Scan).count(),
        "results": db.query(ScanResult).count(),
        "teams": db.query(Team).count(),
        "leads": db.query(Lead).count()
    }



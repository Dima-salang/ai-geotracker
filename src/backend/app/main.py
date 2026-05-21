import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.graph.graph import build_graph
from app.graph.state import ScanRequest, ScanState, ProviderResult
from app.models.database import SessionLocal, engine, Base, get_db
from app.models.schema import (
    Organization, User, Business, Scan, ScanResult, ProviderConfig,
    ProviderConfigCreate, BusinessCreate
)
from app.services.user_service import UserService
from app.services.provider_service import ProviderService

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Iozera GeoTracker API")
graph = build_graph()

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


async def scan_event_stream(req: ScanRequest) -> AsyncGenerator[str, None]:
    """
    Execute active LangGraph scanner pipeline and stream back progress milestones,
    automatically registering and persisting visibility results in the database.
    """
    db = SessionLocal()
    scan = None

    try:
        # 1. Resolve or register the Business target
        biz = db.query(Business).filter(
            Business.name == req.business_name,
            Business.domain == req.domain
        ).first()

        if not biz:
            default_org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
            biz = Business(
                organization_id=default_org_id,
                name=req.business_name,
                domain=req.domain,
                industry=req.industry,
                primary_city=req.primary_city,
                primary_state=req.primary_state,
                country=req.country,
                service_focuses=req.service_focuses,
                target_suburbs=req.target_suburbs
            )
            db.add(biz)
            db.commit()
            db.refresh(biz)

        # 2. Register the visibility Scan as running
        scan = Scan(
            business_id=biz.id,
            user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            status="running",
            overall_score=0,
            summary={},
            recommendations=[]
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)

        yield f"event: progress\ndata: {json.dumps({'stage': 'initiated', 'scan_id': str(scan.id), 'business_id': str(biz.id)})}\n\n"

        initial = ScanState(request=req)
        final_state = None

        # 3. Stream pipeline events
        async for step in graph.astream(initial):
            for node_name, output in step.items():
                # Capture the state at each milestone for final database preservation
                if "provider_results" in output:
                    initial.provider_results = [ProviderResult(**pr) for pr in output["provider_results"]]
                if "overall_score" in output:
                    initial.overall_score = output["overall_score"]
                if "summary" in output:
                    initial.summary = output["summary"]
                if "recommendations" in output:
                    initial.recommendations = output["recommendations"]

                if node_name == "validate":
                    if output.get("errors"):
                        yield f"event: error\ndata: {json.dumps({'message': output['errors'][0], 'code': 'validation_error'})}\n\n"
                        # Update scan as failed in DB
                        scan.status = "failed"
                        db.commit()
                        return
                    yield f"event: progress\ndata: {json.dumps({'stage': 'validated', 'status': 'ok'})}\n\n"

                elif node_name == "classify":
                    d = output.get("classification", {})
                    prompt_count = len(output.get("prompts", []))
                    yield f"event: progress\ndata: {json.dumps({'stage': 'classification', 'industry': d.get('industry'), 'radius_miles': d.get('radius_miles'), 'domain_verified': d.get('domain_verified'), 'prompts_generated': prompt_count})}\n\n"

                elif node_name == "geo_expand":
                    yield f"event: progress\ndata: {json.dumps({'stage': 'geocoding', 'status': 'complete'})}\n\n"

                elif node_name == "query_providers":
                    for pr in output.get("provider_results", []):
                        yield f"event: provider_result\ndata: {json.dumps(pr)}\n\n"

                elif node_name == "score":
                    final_state = output
                    yield f"event: complete\ndata: {json.dumps({'overall_score': output.get('overall_score'), 'summary': output.get('summary'), 'recommendations': output.get('recommendations', [])})}\n\n"

        # 4. Preserving the complete visibility report in database upon scan success
        if final_state and scan:
            scan.overall_score = final_state.get("overall_score", 0)
            scan.summary = final_state.get("summary", {})
            scan.recommendations = final_state.get("recommendations", [])
            scan.status = "complete"
            scan.completed_at = datetime.now(timezone.utc)

            # Persist provider-specific scores
            for pr in initial.provider_results:
                result = ScanResult(
                    scan_id=scan.id,
                    provider=pr.provider,
                    status=pr.status,
                    score=pr.score,
                    rank_position=pr.rank_position,
                    mentioned=pr.mentioned,
                    actionable=pr.actionable,
                    domain_match=pr.domain_match,
                    reason=pr.reason,
                    error=pr.error
                )
                db.add(result)

            db.commit()

    except Exception as e:
        if scan:
            scan.status = "failed"
            db.commit()
        yield f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'internal_error'})}\n\n"
    finally:
        db.close()


@app.post("/api/v1/scan")
async def run_scan(req: ScanRequest):
    return StreamingResponse(
        scan_event_stream(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# =====================================================================
# REST APIS FOR B2B SAAS INTERFACE
# =====================================================================

@app.get("/api/v1/providers")
def get_providers(db: Session = Depends(get_db)):
    """Retrieve all active settings for AI Engine audits, masking credentials."""
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


@app.post("/api/v1/providers")
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


@app.get("/api/v1/businesses")
def list_businesses(db: Session = Depends(get_db)):
    """List all registered business profiles."""
    return db.query(Business).order_by(Business.created_at.desc()).all()


@app.post("/api/v1/businesses")
def register_business(data: BusinessCreate, db: Session = Depends(get_db)):
    """Register a new business profile under a specified organization."""
    # Enforce organization existence
    org = db.query(Organization).filter(Organization.id == data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Franchise organization profile not found")
    
    biz = UserService.create_business(db, data.organization_id, data)
    return biz


@app.get("/api/v1/scans")
def list_visibility_reports(business_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    """List previous search visibility scan audits."""
    query = db.query(Scan)
    if business_id:
        query = query.filter(Scan.business_id == business_id)
    scans = query.order_by(Scan.created_at.desc()).all()
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


@app.get("/api/v1/scans/{id}")
def get_visibility_report_details(id: uuid.UUID, db: Session = Depends(get_db)):
    """Get full details of a specific historical scan audit, including per-engine break-downs."""
    scan = db.query(Scan).filter(Scan.id == id).first()
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
                "error": r.error
            }
            for r in scan.results
        ]
    }


@app.get("/health")
async def health():
    """Simple API health check endpoint."""
    return {"status": "ok"}

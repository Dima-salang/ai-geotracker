import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.graph.state import ScanRequest
from app.models.database import get_db
from app.models.schema import (
    Organization, Business, Scan, ProviderConfig,
    ProviderConfigCreate, BusinessCreate
)
from app.services.user_service import UserService
from app.services.provider_service import ProviderService
from app.services.scan_service import ScanService

router = APIRouter()


@router.post("/scan")
async def run_scan(req: ScanRequest):
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


@router.get("/businesses")
def list_businesses(db: Session = Depends(get_db)):
    """List all registered business profiles."""
    return db.query(Business).order_by(Business.created_at.desc()).all()


@router.post("/businesses")
def register_business(data: BusinessCreate, db: Session = Depends(get_db)):
    """Register a new business profile under a specified organization."""
    org = db.query(Organization).filter(Organization.id == data.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Franchise organization profile not found")
    
    biz = UserService.create_business(db, data.organization_id, data)
    return biz


@router.get("/scans")
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


@router.get("/scans/{id}")
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
                "error": r.error
            }
            for r in scan.results
        ]
    }

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator, List, Optional
from sqlalchemy.orm import Session

from app.graph.graph import build_graph
from app.graph.nodes import query_single_provider, score_results, PROVIDER_CONFIG
from app.services.provider_service import ProviderService
from app.graph.state import ScanRequest, ScanState, ProviderResult
from app.models.database import SessionLocal
from app.models.schema import (
    Business, Scan, ScanResult,
    ScanCreate, ScanUpdate, ScanResultCreate, ScanResultUpdate
)


class ScanService:
    graph = build_graph()

    @classmethod
    async def scan_event_stream(cls, req: ScanRequest) -> AsyncGenerator[str, None]:
        """
        Execute the scan pipeline and stream back results as they arrive.

        Phase 1 (LangGraph): validate → classify → geo_expand
        Phase 2 (async streaming): query each provider in parallel, yield each
                                   result the moment it finishes via asyncio.as_completed
        Phase 3: score aggregated results, persist, emit complete event
        """
        db = SessionLocal()
        scan = None

        try:
            # 1. Resolve or register the Business target
            if req.business_name:
                biz = db.query(Business).filter(
                    Business.name == req.business_name,
                    Business.domain == req.domain
                ).first()
            else:
                biz = db.query(Business).filter(
                    Business.domain == req.domain
                ).first()

            if not biz:
                default_org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
                biz = Business(
                    organization_id=default_org_id,
                    name=req.business_name if req.business_name else req.domain,
                    domain=req.domain,
                    industry=req.industry or "",
                    primary_city=req.primary_city or "",
                    primary_state=req.primary_state or "",
                    country=req.country or "",
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
            # ── PHASE 1: LangGraph (validate → classify → geo_expand → web_search) ──────────
            async for step in cls.graph.astream(initial):
                for node_name, output in step.items():
                    # Keep local state in sync with each node's output
                    if "request" in output:
                        initial.request = output["request"]
                    if "prompts" in output:
                        initial.prompts = output["prompts"]
                    if "classification" in output:
                        initial.classification = output["classification"]
                    if "search_results" in output:
                        initial.search_results = output["search_results"]

                    if node_name == "validate":
                        if output.get("errors"):
                            yield f"event: error\ndata: {json.dumps({'message': output['errors'][0], 'code': 'validation_error'})}\n\n"
                            scan.status = "failed"
                            db.commit()
                            return
                        yield f"event: progress\ndata: {json.dumps({'stage': 'validated', 'status': 'ok'})}\n\n"

                    elif node_name == "classify":
                        d = output.get("classification", {})
                        prompt_count = len(output.get("prompts", []))
                        yield f"event: progress\ndata: {json.dumps({'stage': 'classification', 'industry': d.get('industry'), 'radius_miles': d.get('radius_miles'), 'domain_verified': d.get('domain_verified'), 'is_virtual': d.get('is_virtual'), 'prompts_generated': prompt_count})}\n\n"

                        updated_req = output.get("request")
                        if updated_req and biz:
                            biz.name = updated_req.business_name
                            biz.industry = updated_req.industry
                            biz.primary_city = updated_req.primary_city
                            biz.primary_state = updated_req.primary_state
                            biz.country = updated_req.country
                            biz.service_focuses = updated_req.service_focuses
                            db.commit()
                            db.refresh(biz)

                    elif node_name == "geo_expand":
                        yield f"event: progress\ndata: {json.dumps({'stage': 'geocoding', 'status': 'complete'})}\n\n"

                    elif node_name == "web_search":
                        yield f"event: progress\ndata: {json.dumps({'stage': 'web_search', 'status': 'complete'})}\n\n"

            # ── PHASE 2: Provider queries – stream each result as it arrives ───
            prompts = initial.prompts
            business_name = initial.request.business_name
            domain = initial.request.domain

            # Load active providers dynamically from database
            try:
                active_configs = ProviderService.get_active_configs(db)
                providers_to_query = [
                    {"name": c.provider, "model": c.model}
                    for c in active_configs
                    if c.provider != "gemini_grounding"
                ]
            except Exception:
                providers_to_query = PROVIDER_CONFIG

            if not providers_to_query:
                providers_to_query = PROVIDER_CONFIG

            yield f"event: progress\ndata: {json.dumps({'stage': 'querying_providers', 'provider_count': len(providers_to_query), 'providers': [p['name'] for p in providers_to_query], 'prompt_count': len(prompts)})}\n\n"

            # Resolve ALL provider configs synchronously before spawning tasks.
            # This keeps the synchronous DB lookup out of the parallel hot path so
            # it can't block the event loop mid-flight and serialize the providers.
            resolved = [
                (cfg, ProviderService.resolve_provider_call_args(cfg["name"], db))
                for cfg in providers_to_query
            ]

            # Create Tasks eagerly — all providers start executing immediately.
            # asyncio.as_completed then fires for whichever task finishes first.
            provider_tasks = [
                asyncio.create_task(
                    query_single_provider(cfg, prompts, business_name, domain, call_args=call_args, search_results=initial.search_results)
                )
                for cfg, call_args in resolved
            ]

            collected_results: list[ProviderResult] = []
            for coro in asyncio.as_completed(provider_tasks):
                result: ProviderResult = await coro
                collected_results.append(result)
                pr_dict = result.model_dump()
                yield f"event: provider_result\ndata: {json.dumps(pr_dict)}\n\n"


            # ── PHASE 3: Score aggregated results and emit complete event ───────
            final_scan_state = ScanState(
                request=initial.request,
                prompts=prompts,
                search_results=initial.search_results,
                provider_results=collected_results,
            )
            score_output = score_results(final_scan_state)

            scan.overall_score = score_output.get("overall_score", 0)
            scan.summary = score_output.get("summary", {})
            scan.recommendations = score_output.get("recommendations", [])
            scan.status = "complete"
            scan.completed_at = datetime.now(timezone.utc)

            for pr in collected_results:
                db.add(ScanResult(
                    scan_id=scan.id,
                    provider=pr.provider,
                    model=pr.model,
                    status=pr.status,
                    score=pr.score,
                    rank_position=pr.rank_position,
                    mentioned=pr.mentioned,
                    actionable=pr.actionable,
                    domain_match=pr.domain_match,
                    reason=pr.reason,
                    error=pr.error,
                    raw_response=json.dumps(pr.prompt_results) if pr.prompt_results else None,
                ))

            db.commit()

            yield f"event: complete\ndata: {json.dumps({'overall_score': scan.overall_score, 'summary': scan.summary, 'recommendations': scan.recommendations})}\n\n"

        except Exception as e:
            if scan:
                scan.status = "failed"
                db.commit()
            yield f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'internal_error'})}\n\n"
        finally:
            db.close()

    @staticmethod
    def list_scans(
        db: Session, 
        business_id: Optional[uuid.UUID] = None, 
        status: Optional[str] = None, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[Scan]:
        """List historical scan runs with optional filters and pagination."""
        query = db.query(Scan)
        if business_id:
            query = query.filter(Scan.business_id == business_id)
        if status:
            query = query.filter(Scan.status == status)
        return query.order_by(Scan.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_scan(db: Session, id: uuid.UUID) -> Optional[Scan]:
        """Retrieve a specific scan by ID."""
        return db.query(Scan).filter(Scan.id == id).first()

    @staticmethod
    def create_scan(db: Session, data: ScanCreate) -> Scan:
        """Create a new scan run manually."""
        default_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        scan = Scan(
            business_id=data.business_id,
            user_id=default_user_id,
            status="pending"
        )
        db.add(scan)
        db.commit()
        db.refresh(scan)
        return scan

    @staticmethod
    def update_scan(db: Session, id: uuid.UUID, data: ScanUpdate) -> Optional[Scan]:
        """Update a scan run."""
        scan = db.query(Scan).filter(Scan.id == id).first()
        if not scan:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(scan, key, value)
        db.commit()
        db.refresh(scan)
        return scan

    @staticmethod
    def delete_scan(db: Session, id: uuid.UUID) -> bool:
        """Delete a scan run."""
        scan = db.query(Scan).filter(Scan.id == id).first()
        if not scan:
            return False
        db.delete(scan)
        db.commit()
        return True

    @staticmethod
    def list_scan_results(
        db: Session,
        provider: Optional[str] = None,
        mentioned: Optional[bool] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[ScanResult]:
        """List raw scan results with pagination and filtering."""
        query = db.query(ScanResult)
        if provider:
            query = query.filter(ScanResult.provider == provider)
        if mentioned is not None:
            query = query.filter(ScanResult.mentioned == mentioned)
        if status:
            query = query.filter(ScanResult.status == status)
        return query.order_by(ScanResult.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def create_scan_result(db: Session, data: ScanResultCreate) -> ScanResult:
        """Add a raw scan result manually."""
        res = ScanResult(
            scan_id=data.scan_id,
            provider=data.provider,
            status=data.status,
            score=data.score,
            rank_position=data.rank_position,
            mentioned=data.mentioned,
            actionable=data.actionable,
            domain_match=data.domain_match,
            reason=data.reason,
            prompt_count=data.prompt_count,
            tokens_used=data.tokens_used,
            latency_ms=data.latency_ms,
            error=data.error,
            raw_response=data.raw_response
        )
        db.add(res)
        db.commit()
        db.refresh(res)
        return res

    @staticmethod
    def update_scan_result(db: Session, id: uuid.UUID, data: ScanResultUpdate) -> Optional[ScanResult]:
        """Update raw scan result."""
        res = db.query(ScanResult).filter(ScanResult.id == id).first()
        if not res:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(res, key, value)
        db.commit()
        db.refresh(res)
        return res

    @staticmethod
    def delete_scan_result(db: Session, id: uuid.UUID) -> bool:
        """Delete raw scan result."""
        res = db.query(ScanResult).filter(ScanResult.id == id).first()
        if not res:
            return False
        db.delete(res)
        db.commit()
        return True


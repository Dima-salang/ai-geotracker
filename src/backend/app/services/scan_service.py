import json
import uuid
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.graph.graph import build_graph
from app.graph.state import ScanRequest, ScanState, ProviderResult
from app.models.database import SessionLocal
from app.models.schema import Business, Scan, ScanResult


class ScanService:
    graph = build_graph()

    @classmethod
    async def scan_event_stream(cls, req: ScanRequest) -> AsyncGenerator[str, None]:
        """
        Execute active LangGraph scanner pipeline and stream back progress milestones,
        automatically registering and persisting visibility results in the database.
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
            final_state = None

            # 3. Stream pipeline events
            async for step in cls.graph.astream(initial):
                for node_name, output in step.items():
                    # Capture the state at each milestone for final database preservation
                    if "request" in output:
                        initial.request = output["request"]
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
                        yield f"event: progress\ndata: {json.dumps({'stage': 'classification', 'industry': d.get('industry'), 'radius_miles': d.get('radius_miles'), 'domain_verified': d.get('domain_verified'), 'is_virtual': d.get('is_virtual'), 'prompts_generated': prompt_count})}\n\n"

                        # Update Business record with researched details
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

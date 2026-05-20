import json
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from app.graph.graph import build_graph
from app.graph.state import ScanRequest, ScanState

app = FastAPI(title="Iozera GeoTracker")
graph = build_graph()


async def scan_event_stream(req: ScanRequest) -> AsyncGenerator[str, None]:
    initial = ScanState(request=req)

    try:
        async for step in graph.astream(initial):
            for node_name, output in step.items():
                if node_name == "validate":
                    if output.get("errors"):
                        yield f"event: error\ndata: {json.dumps({'message': output['errors'][0], 'code': 'validation_error'})}\n\n"
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
                    yield f"event: complete\ndata: {json.dumps({'overall_score': output.get('overall_score'), 'summary': output.get('summary'), 'recommendations': output.get('recommendations', [])})}\n\n"

    except Exception as e:
        yield f"event: error\ndata: {json.dumps({'message': str(e), 'code': 'internal_error'})}\n\n"


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


@app.get("/health")
async def health():
    return {"status": "ok"}

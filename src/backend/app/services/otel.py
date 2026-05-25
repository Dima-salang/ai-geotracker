import time
import logging
import contextvars
from contextlib import contextmanager
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter

logger = logging.getLogger("app.services.otel")

current_scan_id = contextvars.ContextVar("current_scan_id", default=None)

# Initialize global tracer provider and simple console exporter
try:
    provider = TracerProvider()
    processor = SimpleSpanProcessor(ConsoleSpanExporter())
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
except Exception as e:
    logger.debug("OTel TracerProvider already initialized or failed to initialize: %s", e)

tracer = trace.get_tracer("iozera.geotracker")

@contextmanager
def measure_llm_call(provider_name: str, model_name: str, prompt: str = ""):
    """
    A context manager to wrap and measure an LLM tool call using OpenTelemetry.
    Captures latency, provider, model name, and input sample as span attributes.
    """
    span_name = f"llm_call.{provider_name}"
    with tracer.start_as_current_span(span_name) as span:
        span.set_attribute("llm.provider", provider_name)
        span.set_attribute("llm.model", model_name)
        if prompt:
            span.set_attribute("llm.prompt_sample", prompt[:300])
            
        start_time = time.perf_counter()
        try:
            yield span
            span.set_attribute("llm.status", "success")
        except Exception as e:
            span.set_attribute("llm.status", "error")
            span.record_exception(e)
            raise
        finally:
            latency_ms = (time.perf_counter() - start_time) * 1000
            span.set_attribute("llm.latency_ms", int(latency_ms))
            logger.info(
                "OTel Span Resolved: %s | Model: %s | Latency: %dms",
                span_name, model_name, int(latency_ms)
            )

            # --- DIRECT DATABASE TELEMETRY LOGGING ---
            try:
                # Read attributes from span
                attrs = getattr(span, "attributes", {})
                tokens_used = attrs.get("llm.tokens.total", 0)
                llm_status = attrs.get("llm.status", "error")
                
                # Get the active scan ID from context var
                scan_id = current_scan_id.get()
                if scan_id:
                    from app.models.database import SessionLocal
                    from app.models.schema import ScanResult
                    
                    db = SessionLocal()
                    try:
                        # Write the raw telemetry directly to the DB!
                        db.add(ScanResult(
                            scan_id=scan_id,
                            provider=provider_name,
                            model=model_name,
                            display_name=provider_name.capitalize(),
                            status="complete" if llm_status == "success" else "failed",
                            score=0,
                            mentioned=False,
                            actionable=False,
                            domain_match=False,
                            latency_ms=int(latency_ms),
                            tokens_used=tokens_used,
                            error=str(span.status.description) if (hasattr(span, "status") and span.status and getattr(span.status, "description", None)) else None,
                        ))
                        db.commit()
                    except Exception as db_err:
                        logger.warning("Failed to save OTel telemetry to DB: %s", db_err)
                    finally:
                        db.close()
            except Exception as tel_err:
                logger.warning("Failed to process OTel telemetry: %s", tel_err)


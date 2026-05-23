import time
import logging
from contextlib import contextmanager
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, ConsoleSpanExporter

logger = logging.getLogger("app.services.otel")

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

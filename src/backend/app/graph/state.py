from typing import Optional
from pydantic import BaseModel, field_validator


class ScanRequest(BaseModel):
    domain: str
    business_name: str = ""
    industry: str = ""
    primary_city: str = ""
    primary_state: str = ""
    country: str = ""
    service_focuses: list[str] = []
    target_suburbs: list[str] = []
    user_id: Optional[str] = None

    @field_validator("domain", mode="before")
    @classmethod
    def clean_domain(cls, v: str) -> str:
        if not isinstance(v, str):
            return v
        v = v.strip().lower()
        v = v.replace("https://", "").replace("http://", "").replace("www.", "")
        return v.split("/")[0]



class ProviderResult(BaseModel):
    provider: str
    model: Optional[str] = None
    display_name: Optional[str] = None
    config_id: Optional[str] = None
    status: str = "red"
    score: int = 0
    rank_position: Optional[int] = None
    mentioned: bool = False
    actionable: bool = False
    domain_match: bool = False
    reason: str = ""
    error: Optional[str] = None
    prompt_results: list[dict] = []
    latency_ms: Optional[int] = None
    tokens_used: Optional[int] = None



class ScanState(BaseModel):
    request: ScanRequest
    errors: list[str] = []
    classification: Optional[dict] = None
    coordinates: Optional[tuple[float, float]] = None
    suburbs: list[str] = []
    prompts: list[str] = []
    search_results: list[dict] = []
    provider_results: list[ProviderResult] = []
    overall_score: Optional[int] = None
    summary: dict = {}
    recommendations: list[dict] = []

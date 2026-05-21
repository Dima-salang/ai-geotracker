from typing import Optional
from pydantic import BaseModel


class ScanRequest(BaseModel):
    domain: str
    business_name: str = ""
    industry: str = ""
    primary_city: str = ""
    primary_state: str = ""
    country: str = ""
    service_focuses: list[str] = []
    target_suburbs: list[str] = []



class ProviderResult(BaseModel):
    provider: str
    status: str = "red"
    score: int = 0
    rank_position: Optional[int] = None
    mentioned: bool = False
    actionable: bool = False
    domain_match: bool = False
    reason: str = ""
    error: Optional[str] = None


class ScanState(BaseModel):
    request: ScanRequest
    errors: list[str] = []
    classification: Optional[dict] = None
    coordinates: Optional[tuple[float, float]] = None
    suburbs: list[str] = []
    prompts: list[str] = []
    provider_results: list[ProviderResult] = []
    overall_score: Optional[int] = None
    summary: dict = {}
    recommendations: list[dict] = []

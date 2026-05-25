import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Uuid
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.database import Base


# ==========================================
# ENUMS & CONSTANTS
# ==========================================

class UserRole(str, Enum):
    USER = "user"
    CLIENT = "client"
    AGENT = "agent"
    TEAM_LEADER = "team_leader"
    ADMIN = "admin"



# ==========================================
# SQLALCHEMY MODELS
# ==========================================

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    users: Mapped[List["User"]] = relationship("User", back_populates="organization")
    businesses: Mapped[List["Business"]] = relationship("Business", back_populates="organization", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("organizations.id"), nullable=True)
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("teams.id", use_alter=True, name="fk_users_team_id"), nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    auth_provider: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tier: Mapped[str] = mapped_column(String, default="free")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_scan_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="users")
    team: Mapped[Optional["Team"]] = relationship("Team", foreign_keys=[team_id], back_populates="members")
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    assigned_leads: Mapped[List["Lead"]] = relationship("Lead", foreign_keys="[Lead.assigned_agent_id]", back_populates="assigned_agent")


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    leader_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id", use_alter=True, name="fk_teams_leader_id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    leader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[leader_id], post_update=True)
    members: Mapped[List["User"]] = relationship("User", foreign_keys="[User.team_id]", back_populates="team")
    leads: Mapped[List["Lead"]] = relationship("Lead", back_populates="team", cascade="all, delete-orphan")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), nullable=False)
    team_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("teams.id"), nullable=True)
    assigned_agent_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("users.id"), nullable=True)
    visibility_score: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    business: Mapped["Business"] = relationship("Business")
    team: Mapped[Optional["Team"]] = relationship("Team", back_populates="leads")
    assigned_agent: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assigned_agent_id], back_populates="assigned_leads")


class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user: Mapped["User"] = relationship("User")



class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("organizations.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    industry: Mapped[str] = mapped_column(String, nullable=False)
    primary_city: Mapped[str] = mapped_column(String, nullable=False)
    primary_state: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    service_focuses: Mapped[List[str]] = mapped_column(JSON, default=list)
    target_suburbs: Mapped[List[str]] = mapped_column(JSON, default=list)
    latitude: Mapped[Optional[float]] = mapped_column(JSON, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(JSON, nullable=True)
    google_maps_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    formatted_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    organization: Mapped["Organization"] = relationship("Organization", back_populates="businesses")
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="business", cascade="all, delete-orphan")


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("businesses.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String, default="pending")
    summary: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    recommendations: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    business: Mapped["Business"] = relationship("Business", back_populates="scans")
    user: Mapped["User"] = relationship("User", back_populates="scans")
    results: Mapped[List["ScanResult"]] = relationship("ScanResult", back_populates="scan", cascade="all, delete-orphan")
    telemetries: Mapped[List["ScanTelemetry"]] = relationship("ScanTelemetry", back_populates="scan", cascade="all, delete-orphan")


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("scans.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    rank_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mentioned: Mapped[bool] = mapped_column(Boolean, default=False)
    actionable: Mapped[bool] = mapped_column(Boolean, default=False)
    domain_match: Mapped[bool] = mapped_column(Boolean, default=False)
    reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    prompt_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    tokens_used: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    raw_response: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    scan: Mapped["Scan"] = relationship("Scan", back_populates="results")
    telemetries: Mapped[List["ScanTelemetry"]] = relationship("ScanTelemetry", back_populates="scan_result")


class ScanTelemetry(Base):
    __tablename__ = "scan_telemetries"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("scans.id"), nullable=False)
    scan_result_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("scan_results.id"), nullable=True)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    scan: Mapped["Scan"] = relationship("Scan", back_populates="telemetries")
    scan_result: Mapped[Optional["ScanResult"]] = relationship("ScanResult", back_populates="telemetries")


class ProviderConfig(Base):
    __tablename__ = "provider_configs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    encrypted_api_key: Mapped[str] = mapped_column(String, nullable=False)
    api_base: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    timeout_seconds: Mapped[int] = mapped_column(Integer, default=15)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    @property
    def api_key(self) -> str:
        """Decrypts and returns the plain-text API key."""
        from app.models.encryption import decrypt_key
        return decrypt_key(self.encrypted_api_key)

    @api_key.setter
    def api_key(self, plain_text: str):
        """Encrypts and stores the plain-text API key."""
        from app.models.encryption import encrypt_key
        self.encrypted_api_key = encrypt_key(plain_text)


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False)
    is_encrypted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    @property
    def decrypted_value(self) -> str:
        """Helper to return decrypted value if encrypted, else raw."""
        if self.is_encrypted:
            from app.models.encryption import decrypt_key
            return decrypt_key(self.value)
        return self.value

    def set_value(self, plain_text: str, encrypt: bool = False):
        """Helper to set and optionally encrypt a value."""
        if encrypt:
            from app.models.encryption import encrypt_key
            self.value = encrypt_key(plain_text)
            self.is_encrypted = True
        else:
            self.value = plain_text
            self.is_encrypted = False


class EngagementEvent(Base):
    __tablename__ = "engagement_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    event_type: Mapped[str] = mapped_column(String, nullable=False) # e.g. "click_cta", "view_report", "copy_link"
    target: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g. "cta_check_visibility", "cta_unlock_full_audits", "scan_id"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ==========================================================
# PYDANTIC SCHEMAS
# ==========================================

class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationRead(OrganizationBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    auth_provider: Optional[str] = None
    tier: str = "free"
    organization_id: Optional[uuid.UUID] = None
    role: UserRole = UserRole.USER
    team_id: Optional[uuid.UUID] = None
    is_verified: bool = True



class UserCreate(UserBase):
    id: uuid.UUID


class UserRead(UserBase):
    id: uuid.UUID
    created_at: datetime
    last_scan_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BusinessBase(BaseModel):
    name: str
    domain: str
    industry: str
    primary_city: str
    primary_state: str
    country: str
    service_focuses: List[str] = Field(default_factory=list)
    target_suburbs: List[str] = Field(default_factory=list)


class BusinessCreate(BusinessBase):
    organization_id: uuid.UUID


class BusinessRead(BusinessBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanResultBase(BaseModel):
    provider: str
    model: Optional[str] = None
    display_name: Optional[str] = None
    status: str
    score: Optional[int] = None
    rank_position: Optional[int] = None
    mentioned: bool = False
    actionable: bool = False
    domain_match: bool = False
    reason: Optional[str] = None
    prompt_count: Optional[int] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None
    error: Optional[str] = None
    raw_response: Optional[str] = None


class ScanResultCreate(ScanResultBase):
    scan_id: uuid.UUID


class ScanResultRead(ScanResultBase):
    id: uuid.UUID
    scan_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScanBase(BaseModel):
    business_id: uuid.UUID


class ScanCreate(ScanBase):
    pass


class ScanRead(ScanBase):
    id: uuid.UUID
    user_id: uuid.UUID
    overall_score: Optional[int] = None
    status: str
    summary: Optional[Dict[str, Any]] = None
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    completed_at: Optional[datetime] = None
    results: List[ScanResultRead] = Field(default_factory=list)
    business: Optional[BusinessRead] = None

    model_config = ConfigDict(from_attributes=True)


class ProviderConfigBase(BaseModel):
    provider: str
    model: str
    display_name: Optional[str] = None
    api_base: Optional[str] = None
    is_active: bool = True
    timeout_seconds: int = 15


class ProviderConfigCreate(ProviderConfigBase):
    id: Optional[uuid.UUID] = None
    api_key: str  # Plain text during creation, will be encrypted in DB


class ProviderConfigRead(ProviderConfigBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tier: Optional[str] = None
    organization_id: Optional[uuid.UUID] = None
    role: Optional[UserRole] = None
    team_id: Optional[uuid.UUID] = None
    is_verified: Optional[bool] = None



class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    primary_city: Optional[str] = None
    primary_state: Optional[str] = None
    country: Optional[str] = None
    service_focuses: Optional[List[str]] = None
    target_suburbs: Optional[List[str]] = None


class ScanUpdate(BaseModel):
    overall_score: Optional[int] = None
    status: Optional[str] = None
    summary: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[Dict[str, Any]]] = None


class ScanResultUpdate(BaseModel):
    model: Optional[str] = None
    display_name: Optional[str] = None
    status: Optional[str] = None
    score: Optional[int] = None
    rank_position: Optional[int] = None
    mentioned: Optional[bool] = None
    actionable: Optional[bool] = None
    domain_match: Optional[bool] = None
    reason: Optional[str] = None
    error: Optional[str] = None


class SystemConfigBase(BaseModel):
    key: str
    is_encrypted: bool = False


class SystemConfigCreate(SystemConfigBase):
    value: str


class SystemConfigRead(SystemConfigBase):
    id: uuid.UUID
    has_value: bool
    value: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemConfigUpdateSchema(BaseModel):
    key: str
    value: str


class EngagementEventCreate(BaseModel):
    event_type: str
    target: Optional[str] = None


class EngagementEventRead(BaseModel):
    id: uuid.UUID
    event_type: str
    target: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# TEAMS, LEADS, AND NOTIFICATIONS SCHEMAS
# ==========================================

class TeamBase(BaseModel):
    name: str
    leader_id: Optional[uuid.UUID] = None


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    leader_id: Optional[uuid.UUID] = None


class AgentRegistration(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    team_id: uuid.UUID


class TeamRead(TeamBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadBase(BaseModel):
    business_id: uuid.UUID
    team_id: Optional[uuid.UUID] = None
    assigned_agent_id: Optional[uuid.UUID] = None
    visibility_score: int = 0
    status: str = "new"


class LeadCreate(LeadBase):
    pass


class LeadRead(LeadBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadUpdate(BaseModel):
    team_id: Optional[uuid.UUID] = None
    assigned_agent_id: Optional[uuid.UUID] = None
    status: Optional[str] = None


class InAppNotificationBase(BaseModel):
    user_id: uuid.UUID
    title: str
    message: str
    is_read: bool = False


class InAppNotificationCreate(InAppNotificationBase):
    pass


class InAppNotificationRead(InAppNotificationBase):
    id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessClassification(BaseModel):
    business_name: str = Field(default="", description="Verified operational name of business")
    industry: str = Field(default="", description="Refined industry category")
    primary_city: str = Field(default="", description="Main physical city")
    primary_state: str = Field(default="", description="Main physical state/region")
    country: str = Field(default="", description="Main physical country")
    is_virtual: bool = Field(default=False, description="Whether the business is purely virtual")
    domain_verified: bool = Field(default=False, description="Whether the domain is verified")
    radius_miles: int = Field(default=25, description="Search footprint index: radius of miles")
    default_services: List[str] = Field(default_factory=list, description="Array of exactly 2-4 core structural services/offerings")
    business_alias: str = Field(default="", description="Alternative name or empty")
    latitude: Optional[float] = Field(default=None, description="Latitude of physical location")
    longitude: Optional[float] = Field(default=None, description="Longitude of physical location")
    formatted_address: Optional[str] = Field(default=None, description="Street address, City, State, ZIP, Country")
    google_maps_url: Optional[str] = Field(default=None, description="Google Maps search URL")
    prompts: List[str] = Field(default_factory=list, description="Generated search prompts")



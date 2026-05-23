import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Uuid
from sqlalchemy.orm import relationship, Mapped, mapped_column

from app.models.database import Base


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
    role: Mapped[str] = mapped_column(String, default="user")
    first_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    auth_provider: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    tier: Mapped[str] = mapped_column(String, default="free")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_scan_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    organization: Mapped[Optional["Organization"]] = relationship("Organization", back_populates="users")
    scans: Mapped[List["Scan"]] = relationship("Scan", back_populates="user", cascade="all, delete-orphan")


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


class ScanResult(Base):
    __tablename__ = "scan_results"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    scan_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("scans.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[Optional[str]] = mapped_column(String, nullable=True)
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


class ProviderConfig(Base):
    __tablename__ = "provider_configs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    provider: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str] = mapped_column(String, nullable=False)
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


import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base
from app.models.schema import (
    Organization, User, Business, Scan, ScanResult, ProviderConfig,
    OrganizationRead, UserRead, BusinessRead, ScanRead, ScanResultRead, ProviderConfigRead
)

# Use in-memory SQLite for testing
DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_create_and_read_organization_and_user(db_session):
    # 1. Create Organization
    org_id = uuid.uuid4()
    db_org = Organization(
        id=org_id,
        name="Dental Empire LLC"
    )
    db_session.add(db_org)
    db_session.commit()
    db_session.refresh(db_org)

    assert db_org.id == org_id
    assert db_org.name == "Dental Empire LLC"
    assert db_org.created_at is not None

    # 2. Create User linked to Org
    user_id = uuid.uuid4()
    db_user = User(
        id=user_id,
        organization_id=org_id,
        first_name="John",
        last_name="Doe",
        phone="1234567890",
        email="john@dentalempire.com",
        auth_provider="google",
        tier="free"
    )
    db_session.add(db_user)
    db_session.commit()
    db_session.refresh(db_user)

    # Asserts
    assert db_user.id == user_id
    assert db_user.organization_id == org_id
    assert db_user.first_name == "John"
    assert db_user.last_name == "Doe"
    assert db_user.phone == "1234567890"
    assert db_user.email == "john@dentalempire.com"
    assert db_user.auth_provider == "google"
    assert db_user.tier == "free"
    assert db_user.created_at is not None

    # Relationship verification
    assert len(db_org.users) == 1
    assert db_org.users[0].id == user_id
    assert db_user.organization.name == "Dental Empire LLC"

    # Pydantic Serialization
    org_pydantic = OrganizationRead.model_validate(db_org)
    assert org_pydantic.id == org_id
    assert org_pydantic.name == "Dental Empire LLC"

    user_pydantic = UserRead.model_validate(db_user)
    assert user_pydantic.id == user_id
    assert user_pydantic.organization_id == org_id
    assert user_pydantic.email == "john@dentalempire.com"


def test_create_and_read_business_and_scan_with_results(db_session):
    # 1. Setup Org and User
    org_id = uuid.uuid4()
    db_org = Organization(id=org_id, name="Test Org")
    user_id = uuid.uuid4()
    db_user = User(id=user_id, organization_id=org_id, email="owner@example.com")
    db_session.add_all([db_org, db_user])
    db_session.commit()

    # 2. Create Business under Org
    biz_id = uuid.uuid4()
    db_biz = Business(
        id=biz_id,
        organization_id=org_id,
        name="Acme Dentistry",
        domain="acmedentistry.com",
        industry="dentist",
        primary_city="Houston",
        primary_state="Texas",
        country="USA",
        service_focuses=["Invisalign", "Cleanings"],
        target_suburbs=["Downtown", "Midtown"]
    )
    db_session.add(db_biz)
    db_session.commit()
    db_session.refresh(db_biz)

    assert db_biz.id == biz_id
    assert db_biz.organization_id == org_id
    assert db_biz.service_focuses == ["Invisalign", "Cleanings"]
    assert db_biz.target_suburbs == ["Downtown", "Midtown"]

    # 3. Create Scan for Business
    scan_id = uuid.uuid4()
    db_scan = Scan(
        id=scan_id,
        business_id=biz_id,
        user_id=user_id,
        overall_score=75,
        status="complete",
        summary={"green": 2, "yellow": 1, "red": 0},
        recommendations=[{"severity": "medium", "recommendation": "Improve Yelp presence"}]
    )
    db_session.add(db_scan)
    db_session.commit()
    db_session.refresh(db_scan)

    # 4. Create Scan Results
    result1 = ScanResult(
        scan_id=scan_id,
        provider="gemini",
        status="green",
        score=90,
        mentioned=True,
        actionable=True,
        domain_match=True,
        reason="Acme is highly ranked."
    )
    result2 = ScanResult(
        scan_id=scan_id,
        provider="perplexity",
        status="yellow",
        score=60,
        mentioned=True,
        actionable=False,
        domain_match=False,
        reason="Acme mentioned but low ranking."
    )
    db_session.add_all([result1, result2])
    db_session.commit()
    db_session.refresh(db_scan)

    # Relationship and integrity asserts
    assert len(db_scan.results) == 2
    providers = {r.provider for r in db_scan.results}
    assert providers == {"gemini", "perplexity"}
    assert db_scan.business.name == "Acme Dentistry"
    assert db_scan.user.email == "owner@example.com"
    assert len(db_biz.scans) == 1
    assert db_biz.scans[0].id == scan_id
    assert len(db_org.businesses) == 1
    assert db_org.businesses[0].id == biz_id

    # Pydantic validation
    biz_pydantic = BusinessRead.model_validate(db_biz)
    assert biz_pydantic.id == biz_id
    assert biz_pydantic.name == "Acme Dentistry"

    scan_pydantic = ScanRead.model_validate(db_scan)
    assert scan_pydantic.id == scan_id
    assert scan_pydantic.business_id == biz_id
    assert scan_pydantic.business.name == "Acme Dentistry"
    assert len(scan_pydantic.results) == 2


def test_provider_config_encryption(db_session):
    config_id = uuid.uuid4()
    db_config = ProviderConfig(
        id=config_id,
        provider="gemini",
        model="gemini-2.0-flash",
        api_base="https://api.gemini.com/v1",
        is_active=True,
        timeout_seconds=20
    )
    # Set plain-text key (calls setter -> encrypts)
    db_config.api_key = "secret_gemini_key_123"
    db_session.add(db_config)
    db_session.commit()

    # Assert raw key in DB is encrypted (not plain text)
    assert db_config.encrypted_api_key != "secret_gemini_key_123"
    assert "secret_gemini_key_123" not in db_config.encrypted_api_key

    # Assert getter decrypts successfully
    assert db_config.api_key == "secret_gemini_key_123"

    # Reload from DB session
    db_session.expire_all()
    reloaded_config = db_session.get(ProviderConfig, config_id)

    assert reloaded_config.encrypted_api_key != "secret_gemini_key_123"
    assert reloaded_config.api_key == "secret_gemini_key_123"

    # Pydantic Serialization
    config_pydantic = ProviderConfigRead.model_validate(reloaded_config)
    assert config_pydantic.id == config_id
    assert config_pydantic.provider == "gemini"
    assert config_pydantic.model == "gemini-2.0-flash"
    assert not hasattr(config_pydantic, "api_key")  # API key is never exposed via Pydantic Read model

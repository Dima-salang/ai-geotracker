import json
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from app.models.database import Base
from app.models.schema import Business, Scan, Organization, User
from app.graph.state import ScanRequest, ScanState

DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionTesting()
    try:
        # Seed default org and user to satisfy foreign keys
        org = Organization(id=uuid.UUID("00000000-0000-0000-0000-000000000000"), name="Default Org")
        user = User(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            organization_id=org.id,
            email="manager@corporatefranchise.com",
            first_name="Alex",
            last_name="Manager",
            tier="enterprise"
        )
        db.add(org)
        db.add(user)
        db.commit()
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.mark.asyncio
async def test_scan_event_stream_domain_only_enrichment(db_session, mocker):
    # Mock graph to return classification and prompts with updated request
    mock_resp = mocker.MagicMock()
    mock_resp.choices = [mocker.MagicMock()]
    mock_resp.choices[0].message.content = json.dumps({
        "business_name": "Stripe",
        "industry": "payment processing",
        "primary_city": "San Francisco",
        "primary_state": "California",
        "country": "USA",
        "is_virtual": True,
        "domain_verified": True,
        "radius_miles": 0,
        "default_services": ["payment gateway"],
        "prompts": ["Best payment processing api"],
    })

    mocker.patch(
        "app.services.provider_service.litellm.acompletion",
        return_value=mock_resp,
    )

    req = ScanRequest(
        business_name="",
        domain="stripe.com",
        industry="",
        primary_city="",
        primary_state="",
        country="",
    )

    # We import ScanService from app.services.scan_service
    from app.services.scan_service import ScanService

    # Patch SessionLocal in scan_service to use our in-memory test db session
    mocker.patch("app.services.scan_service.SessionLocal", return_value=db_session)

    events = []
    async for event in ScanService.scan_event_stream(req):
        events.append(event)


    # 1. Verify business was inserted and then updated with researched details
    biz = db_session.query(Business).filter(Business.domain == "stripe.com").first()
    assert biz is not None
    assert biz.name == "Stripe"
    assert biz.industry == "payment processing"
    assert biz.primary_city == "San Francisco"

    # 2. Verify scan was persisted and completed
    scan = db_session.query(Scan).filter(Scan.business_id == biz.id).first()
    assert scan is not None
    assert scan.status == "complete"

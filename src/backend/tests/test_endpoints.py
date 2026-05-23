import json
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from app.models.database import Base
from app.models.schema import Business, Scan, Organization, User, ScanResult, ProviderConfig
from app.graph.state import ScanRequest, ScanState

DATABASE_URL = "sqlite:///./test_temp.db"

@pytest.fixture(name="db_session")
def fixture_db_session():
    import os
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
        if os.path.exists("test_temp.db"):
            try:
                os.remove("test_temp.db")
            except Exception:
                pass


@pytest.mark.asyncio
async def test_scan_event_stream_domain_only_enrichment(db_session, mocker):
    mocker.patch(
        "app.services.search_service.SearchService.search",
        new_callable=mocker.AsyncMock,
        return_value=[]
    )
    # Mock graph to return classification and prompts with updated request
    mock_classify_resp = mocker.MagicMock()
    mock_classify_resp.choices = [mocker.MagicMock()]
    mock_classify_resp.choices[0].message.content = json.dumps({
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

    mock_provider_resp = mocker.MagicMock()
    mock_provider_resp.choices = [mocker.MagicMock()]
    mock_provider_resp.choices[0].message.content = (
        "1. Stripe (stripe.com) - Leading payment processor\n"
        "2. PayPal - Online payments\n"
    )

    # Route the mock response based on the active provider model being used:
    # - gemini_grounding model (grounding/classification) -> mock_classify_resp
    # - Other models (parallel auditing queries) -> mock_provider_resp
    from app.services.provider_service import ProviderService
    grounding_model = ProviderService.resolve_provider_call_args("gemini_grounding", db_session)["model"]

    def mock_acompletion_side_effect(*args, **kwargs):
        model = kwargs.get("model")
        if model == grounding_model:
            return mock_classify_resp
        return mock_provider_resp

    mocker.patch(
        "app.services.provider_service.litellm.acompletion",
        side_effect=mock_acompletion_side_effect,
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


from fastapi.testclient import TestClient
from app.main import app
from app.models.database import get_db

@pytest.fixture(name="client")
def fixture_client(db_session):
    def _get_db_override():
        return db_session
    app.dependency_overrides[get_db] = _get_db_override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_crud_users(client, db_session):
    # Fetch default
    res = client.get("/api/v1/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 1
    assert users[0]["email"] == "manager@corporatefranchise.com"

    # Create new user
    new_user_id = str(uuid.uuid4())
    create_payload = {
        "id": new_user_id,
        "first_name": "John",
        "last_name": "Staff",
        "email": "john@staff.com",
        "phone": "+12345",
        "tier": "free",
        "organization_id": "00000000-0000-0000-0000-000000000000"
    }
    res = client.post("/api/v1/users", json=create_payload)
    assert res.status_code == 200
    created = res.json()
    assert created["first_name"] == "John"
    assert created["id"] == new_user_id

    # Update user
    update_payload = {"first_name": "Johnny", "tier": "premium"}
    res = client.put(f"/api/v1/users/{new_user_id}", json=update_payload)
    assert res.status_code == 200
    updated = res.json()
    assert updated["first_name"] == "Johnny"
    assert updated["tier"] == "premium"

    # Delete default user -> Should be BLOCKED
    default_user_id = "00000000-0000-0000-0000-000000000001"
    res = client.delete(f"/api/v1/users/{default_user_id}")
    assert res.status_code == 400
    assert "default" in res.json()["detail"].lower()

    # Delete custom user -> Success
    res = client.delete(f"/api/v1/users/{new_user_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_crud_organizations(client, db_session):
    # List organizations
    res = client.get("/api/v1/organizations")
    assert res.status_code == 200
    orgs = res.json()
    assert len(orgs) == 1
    assert orgs[0]["name"] == "Default Org"

    # Create Org
    res = client.post("/api/v1/organizations", json={"name": "Smile Group"})
    assert res.status_code == 200
    created = res.json()
    new_org_id = created["id"]
    assert created["name"] == "Smile Group"

    # Update Org
    res = client.put(f"/api/v1/organizations/{new_org_id}", json={"name": "Smile Dental Co"})
    assert res.status_code == 200
    assert res.json()["name"] == "Smile Dental Co"

    # Delete default Org -> Should be BLOCKED
    default_org_id = "00000000-0000-0000-0000-000000000000"
    res = client.delete(f"/api/v1/organizations/{default_org_id}")
    assert res.status_code == 400
    assert "default" in res.json()["detail"].lower()

    # Delete custom Org -> Success
    res = client.delete(f"/api/v1/organizations/{new_org_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_crud_businesses(client, db_session):
    # Insert a business first
    biz = Business(
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        name="Test Biz",
        domain="testbiz.com",
        industry="medical",
        primary_city="Miami",
        primary_state="FL",
        country="US",
        service_focuses=["focus1"],
        target_suburbs=["suburb1"]
    )
    db_session.add(biz)
    db_session.commit()
    db_session.refresh(biz)

    # List businesses
    res = client.get("/api/v1/businesses")
    assert res.status_code == 200
    assert len(res.json()) == 1

    # Update business
    res = client.put(f"/api/v1/businesses/{biz.id}", json={
        "name": "Updated Test Biz",
        "service_focuses": ["focus1", "focus2"]
    })
    assert res.status_code == 200
    updated = res.json()
    assert updated["name"] == "Updated Test Biz"
    assert updated["service_focuses"] == ["focus1", "focus2"]

    # Delete business
    res = client.delete(f"/api/v1/businesses/{biz.id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_crud_scans(client, db_session):
    # Insert business
    biz = Business(
        id=uuid.uuid4(),
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        name="Scanned Shop",
        domain="shop.com",
        industry="retail",
        primary_city="Austin",
        primary_state="TX",
        country="US"
    )
    db_session.add(biz)
    db_session.commit()

    # Create scan manually
    res = client.post("/api/v1/scans", json={
        "business_id": str(biz.id)
    })
    assert res.status_code == 200
    scan_id = res.json()["id"]

    # Query scans with limits/offset
    res = client.get("/api/v1/scans?limit=5&offset=0")
    assert res.status_code == 200
    assert len(res.json()) == 1
    assert res.json()[0]["id"] == scan_id

    # Update scan
    res = client.put(f"/api/v1/scans/{scan_id}", json={
        "overall_score": 85,
        "status": "complete",
        "summary": {"score": 85},
        "recommendations": [{"issue": "no citation", "recommendation": "add schemas"}]
    })
    assert res.status_code == 200
    updated = res.json()
    assert updated["overall_score"] == 85
    assert updated["status"] == "complete"

    # Delete scan
    res = client.delete(f"/api/v1/scans/{scan_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_crud_scan_results(client, db_session):
    # Insert business and scan
    biz = Business(
        id=uuid.uuid4(),
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        name="Analyzed Shop",
        domain="analyzed.com",
        industry="retail",
        primary_city="Austin",
        primary_state="TX",
        country="US"
    )
    db_session.add(biz)
    db_session.commit()

    scan = Scan(
        business_id=biz.id,
        user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        status="complete",
        overall_score=70
    )
    db_session.add(scan)
    db_session.commit()

    # Create scan result manually
    res = client.post("/api/v1/scan_results", json={
        "scan_id": str(scan.id),
        "provider": "gemini",
        "status": "yellow",
        "score": 60,
        "rank_position": 2,
        "mentioned": True,
        "actionable": True,
        "domain_match": False,
        "reason": "somewhat present",
        "error": None
    })
    assert res.status_code == 200
    res_id = res.json()["id"]

    # Query scan results with pagination and filters
    res = client.get(f"/api/v1/scan_results?limit=10&provider=gemini&mentioned=true")
    assert res.status_code == 200
    results = res.json()
    assert len(results) == 1
    assert results[0]["id"] == res_id

    # Update result
    res = client.put(f"/api/v1/scan_results/{res_id}", json={
        "score": 90,
        "status": "green"
    })
    assert res.status_code == 200
    assert res.json()["score"] == 90
    assert res.json()["status"] == "green"

    # Delete result
    res = client.delete(f"/api/v1/scan_results/{res_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "deleted"


def test_crud_providers(client, db_session):
    # 1. Fetch initial providers
    res = client.get("/api/v1/providers")
    assert res.status_code == 200
    initial_configs = res.json()
    
    # 2. Register/Create a new custom provider
    payload = {
        "provider": "custom_openai",
        "model": "openai/gpt-4o",
        "api_base": "https://api.openai.com/v1",
        "is_active": True,
        "timeout_seconds": 25,
        "api_key": "sk-test-key-123"
    }
    res = client.post("/api/v1/providers", json=payload)
    assert res.status_code == 200
    created = res.json()
    assert created["provider"] == "custom_openai"
    assert created["model"] == "openai/gpt-4o"
    assert created["timeout_seconds"] == 25
    assert created["has_key"] is True
    provider_id = created["id"]

    # Verify listing includes the new provider
    res = client.get("/api/v1/providers")
    assert res.status_code == 200
    updated_configs = res.json()
    assert len(updated_configs) == len(initial_configs) + 1
    assert any(c["id"] == provider_id for c in updated_configs)

    # 3. Delete the custom provider
    res = client.delete(f"/api/v1/providers/{provider_id}")
    assert res.status_code == 200
    assert res.json() == {"status": "deleted"}

    # Verify listing no longer includes the deleted provider
    res = client.get("/api/v1/providers")
    assert res.status_code == 200
    post_delete_configs = res.json()
    assert len(post_delete_configs) == len(initial_configs)
    assert not any(c["id"] == provider_id for c in post_delete_configs)

    # 4. Deleting a non-existent UUID should return 404
    non_existent_id = "12345678-1234-5678-1234-567812345678"
    res = client.delete(f"/api/v1/providers/{non_existent_id}")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_scan_rate_limiting(client, db_session):
    # Create Business and 3 Scans for a single domain
    biz = Business(
        id=uuid.uuid4(),
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        name="Rate Limited Biz",
        domain="limited.com",
        industry="medical",
        primary_city="Dallas",
        primary_state="TX",
        country="US"
    )
    db_session.add(biz)
    db_session.commit()

    for _ in range(3):
        scan = Scan(
            business_id=biz.id,
            user_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            status="complete",
            overall_score=80
        )
        db_session.add(scan)
    db_session.commit()

    # Now make POST /api/v1/scan for limited.com
    res = client.post("/api/v1/scan", json={
        "domain": "limited.com",
        "business_name": "Rate Limited Biz"
    })
    
    assert res.status_code == 403
    assert "abuse detection" in res.json()["detail"].lower()



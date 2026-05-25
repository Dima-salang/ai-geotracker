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
        org_id = uuid.UUID("00000000-0000-0000-0000-000000000000")
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org:
            org = Organization(id=org_id, name="Default Org")
            db.add(org)
            db.commit()
            db.refresh(org)

        user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(
                id=user_id,
                organization_id=org.id,
                email="manager@corporatefranchise.com",
                first_name="Alex",
                last_name="Manager",
                tier="enterprise"
            )
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


def test_scan_rate_limiting_premium_bypass(client, db_session):
    # Create a premium user
    premium_user_id = uuid.uuid4()
    premium_user = User(
        id=premium_user_id,
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        email="premium@client.com",
        first_name="Premium",
        last_name="Client",
        tier="premium"
    )
    db_session.add(premium_user)
    db_session.commit()

    # Create Business and 3 Scans for limited_premium.com
    biz = Business(
        id=uuid.uuid4(),
        organization_id=uuid.UUID("00000000-0000-0000-0000-000000000000"),
        name="Rate Limited Biz",
        domain="limited_premium.com",
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
            user_id=premium_user_id,
            status="complete",
            overall_score=80
        )
        db_session.add(scan)
    db_session.commit()

    # Now make POST /api/v1/scan for limited_premium.com WITH premium user_id in payload
    with patch("app.services.scan_service.ScanService.scan_event_stream") as mock_stream:
        mock_stream.return_value = AsyncMock()
        res = client.post("/api/v1/scan", json={
            "domain": "limited_premium.com",
            "business_name": "Rate Limited Biz",
            "user_id": str(premium_user_id)
        })
        
        # Should NOT be blocked with 403 (should successfully call stream and return 200)
        assert res.status_code == 200


def test_team_crud_and_agent_registration_endpoints(db_session):
    from app.models.database import get_db
    from app.main import app
    
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    # 1. Create a Team
    res = client.post("/api/v1/teams", json={"name": "Initial Team"})
    assert res.status_code == 200
    team_data = res.json()
    team_id = team_data["id"]
    
    # 2. Update the Team
    res = client.put(f"/api/v1/teams/{team_id}", json={"name": "Renamed Team"})
    assert res.status_code == 200
    assert res.json()["name"] == "Renamed Team"
    
    # 3. Agent self-registration
    # Create the user to be logged in
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="new_agent@iozera.ai",
        role="user"
    )
    db_session.add(user)
    db_session.commit()
    
    # Mock authentication get_current_user_optional
    from app.api.v1.endpoints import get_current_user_optional
    def override_get_current_user_optional():
        return user
        
    app.dependency_overrides[get_current_user_optional] = override_get_current_user_optional
    
    res = client.post("/api/v1/users/register-agent", json={
        "first_name": "Jack",
        "last_name": "Agent",
        "phone": "555-0199",
        "team_id": team_id
    })
    
    assert res.status_code == 200
    updated_user = res.json()
    assert updated_user["role"] == "agent"
    assert updated_user["first_name"] == "Jack"
    assert updated_user["team_id"] == team_id
    assert updated_user["is_verified"] is False
    
    # Mock check_verified_user to return our actual unverified agent state
    from app.api.v1.endpoints import check_verified_user
    def override_check_verified_user():
        from app.models.schema import User
        db_user = db_session.query(User).filter(User.id == user_id).first()
        if db_user and db_user.role in ("agent", "team_leader") and not db_user.is_verified:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Unverified agent blocked")
        return db_user
    app.dependency_overrides[check_verified_user] = override_check_verified_user
    
    # 4. Request leads (should fail with 403 because agent is unverified)
    res = client.get("/api/v1/leads")
    assert res.status_code == 403
    
    # 5. Approve the agent (Admin PUT /users/{id})
    res = client.put(f"/api/v1/users/{user_id}", json={"is_verified": True})
    assert res.status_code == 200
    assert res.json()["is_verified"] is True
    
    # 6. Request leads again (should succeed with 200 now!)
    res = client.get("/api/v1/leads")
    assert res.status_code == 200
    
    # 7. Delete the Team
    res = client.delete(f"/api/v1/teams/{team_id}")
    assert res.status_code == 200
    
    app.dependency_overrides.clear()



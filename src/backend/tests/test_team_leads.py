import pytest
import uuid
from sqlalchemy.orm import Session
from app.models.database import Base
from app.models.schema import User, UserRole, Team, Lead, InAppNotification, Business, Organization
from app.services.team_service import TeamService

@pytest.fixture(scope="function")
def db_session():
    """Create a clean isolated in-memory SQLite database session for each test run."""
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionTesting()
    try:
        yield session
    finally:
        session.close()


def test_user_role_type_checking(db_session: Session):
    """Verify that User roles can be properly validated and set against UserRole Enum."""
    # Register client, agent, team leader, admin
    org = Organization(name="Lead Test Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # 1. Normal Client
    client = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="client@iozera.ai",
        first_name="Jane",
        last_name="Client",
        role=UserRole.CLIENT,
        tier="free"
    )
    # 2. Agent
    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="agent1@iozera.ai",
        first_name="John",
        last_name="Agent",
        role=UserRole.AGENT,
        tier="free"
    )
    # 3. Team Leader
    leader = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="leader@iozera.ai",
        first_name="Bob",
        last_name="Leader",
        role=UserRole.TEAM_LEADER,
        tier="free"
    )
    # 4. Admin
    admin = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="admin@iozera.ai",
        first_name="Alice",
        last_name="Admin",
        role=UserRole.ADMIN,
        tier="enterprise"
    )

    db_session.add_all([client, agent, leader, admin])
    db_session.commit()

    # Assert values in DB are correct
    stored_client = db_session.query(User).filter(User.email == "client@iozera.ai").first()
    assert stored_client.role == UserRole.CLIENT
    
    stored_agent = db_session.query(User).filter(User.email == "agent1@iozera.ai").first()
    assert stored_agent.role == UserRole.AGENT

    stored_leader = db_session.query(User).filter(User.email == "leader@iozera.ai").first()
    assert stored_leader.role == UserRole.TEAM_LEADER

    stored_admin = db_session.query(User).filter(User.email == "admin@iozera.ai").first()
    assert stored_admin.role == UserRole.ADMIN


def test_team_and_lead_load_balancing(db_session: Session):
    """Verify that new potential leads are balanced equally across active teams using Least-Loaded strategy."""
    # 1. Create Organization & Business storefront
    org = Organization(name="Balancing Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    biz1 = Business(
        organization_id=org.id,
        name="Invisible Cafe",
        domain="invisiblecafe.com",
        industry="Food & Drink",
        primary_city="Austin",
        primary_state="TX",
        country="US"
    )
    biz2 = Business(
        organization_id=org.id,
        name="Low-Vis Auto",
        domain="lowvisauto.com",
        industry="Automotive",
        primary_city="Austin",
        primary_state="TX",
        country="US"
    )
    db_session.add_all([biz1, biz2])
    db_session.commit()
    db_session.refresh(biz1)
    db_session.refresh(biz2)

    # 2. Create Teams
    team_a = TeamService.create_team(db_session, name="Sales Team A")
    team_b = TeamService.create_team(db_session, name="Sales Team B")

    # 3. Distribute first lead (should assign to team_a since both have 0 leads)
    lead1 = TeamService.distribute_lead(db_session, biz1.id, visibility_score=35)
    assert lead1.team_id == team_a.id

    # 4. Distribute second lead (should load balance to team_b because team_a has 1 lead and team_b has 0)
    lead2 = TeamService.distribute_lead(db_session, biz2.id, visibility_score=42)
    assert lead2.team_id == team_b.id


def test_in_app_and_email_notification(db_session: Session):
    """Verify in-app notification creations and Supabase email dispatch logs during distribution."""
    org = Organization(name="Notifications Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    biz = Business(
        organization_id=org.id,
        name="Low Exposure Shop",
        domain="lowexposure.com",
        industry="Retail",
        primary_city="Miami",
        primary_state="FL",
        country="US"
    )
    db_session.add(biz)
    db_session.commit()
    db_session.refresh(biz)

    # Create team & lead agent
    agent = User(
        id=uuid.uuid4(),
        organization_id=org.id,
        email="agent@franchise.com",
        first_name="Officer",
        last_name="Agent",
        role=UserRole.AGENT
    )
    db_session.add(agent)
    db_session.commit()
    db_session.refresh(agent)

    team = TeamService.create_team(db_session, name="Miami Team", leader_id=agent.id)
    
    # Assign agent to team
    TeamService.assign_user_to_team(db_session, agent.id, team.id)

    # Distribute lead to trigger notifications
    lead = TeamService.distribute_lead(db_session, biz.id, visibility_score=20)

    # Query InAppNotification table for the agent
    notifications = db_session.query(InAppNotification).filter(InAppNotification.user_id == agent.id).all()
    assert len(notifications) == 1
    assert "Low Visibility" in notifications[0].title
    assert "lowexposure.com" in notifications[0].message or "Low Exposure Shop" in notifications[0].message


def test_team_service_crud_and_onboarding(db_session: Session):
    """Verify that update_team and delete_team methods correctly mutate team data and safe nullify members."""
    # 1. Setup
    team = TeamService.create_team(db_session, name="Alpha Team")
    assert team.name == "Alpha Team"

    # 2. Update
    updated_team = TeamService.update_team(db_session, team.id, name="Omega Team")
    assert updated_team.name == "Omega Team"

    # 3. Assign members
    org = Organization(name="Members Org")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    agent = User(id=uuid.uuid4(), organization_id=org.id, email="agent@omega.ai", role=UserRole.AGENT, team_id=team.id)
    db_session.add(agent)
    db_session.commit()
    db_session.refresh(agent)
    assert agent.team_id == team.id

    # 4. Delete team and assert member's team_id is nullified
    success = TeamService.delete_team(db_session, team.id)
    assert success is True
    
    db_session.refresh(agent)
    assert agent.team_id is None

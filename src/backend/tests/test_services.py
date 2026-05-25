import uuid
import pytest
from unittest.mock import AsyncMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base
from app.models.schema import BusinessCreate, ProviderConfigCreate, ProviderConfig
from app.services.user_service import UserService
from app.services.provider_service import ProviderService, DEFAULT_PROVIDERS

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


def test_user_service_operations(db_session):
    # 1. Create Organization
    org = UserService.create_organization(db_session, "Services Dental Group")
    assert org.id is not None
    assert org.name == "Services Dental Group"

    # Get Organization
    fetched_org = UserService.get_organization(db_session, org.id)
    assert fetched_org is not None
    assert fetched_org.name == "Services Dental Group"

    # 2. Get/Create User
    user_id = uuid.uuid4()
    user = UserService.get_or_create_user(
        db=db_session,
        user_id=user_id,
        email="test_user@dental.com",
        auth_provider="google",
        first_name="Jane",
        last_name="Doe",
        phone="9876543210"
    )
    assert user.id == user_id
    assert user.email == "test_user@dental.com"
    assert user.first_name == "Jane"
    assert user.organization_id is None

    # Retrieve User
    fetched_user = UserService.get_user(db_session, user_id)
    assert fetched_user is not None
    assert fetched_user.email == "test_user@dental.com"

    # Assign User to Organization
    updated_user = UserService.assign_user_to_org(db_session, user_id, org.id)
    assert updated_user is not None
    assert updated_user.organization_id == org.id
    assert len(org.users) == 1

    # 3. Create Business under Organization
    biz_data = BusinessCreate(
        organization_id=org.id,
        name="Smile Center Dallas",
        domain="smilecenterdallas.com",
        industry="dentist",
        primary_city="Dallas",
        primary_state="Texas",
        country="USA",
        service_focuses=["Cleanings", "Orthodontics"],
        target_suburbs=["Plano", "Frisco"]
    )
    biz = UserService.create_business(db_session, org.id, biz_data)
    assert biz.id is not None
    assert biz.organization_id == org.id
    assert biz.name == "Smile Center Dallas"
    assert biz.service_focuses == ["Cleanings", "Orthodontics"]
    assert biz.target_suburbs == ["Plano", "Frisco"]

    # Get Business
    fetched_biz = UserService.get_business(db_session, biz.id)
    assert fetched_biz is not None
    assert fetched_biz.name == "Smile Center Dallas"

    # Get Businesses by Organization
    businesses = UserService.get_businesses_by_org(db_session, org.id)
    assert len(businesses) == 1
    assert businesses[0].id == biz.id


def test_provider_service_configs(db_session):
    # 1. Initially active configs list is empty
    configs = ProviderService.get_active_configs(db_session)
    assert len(configs) == 0

    # 2. Create provider configuration
    config_create = ProviderConfigCreate(
        provider="gemini",
        model="gemini/gemini-2.0-flash",
        api_base="https://custom.gemini.endpoint",
        api_key="super_secret_gemini_key",
        is_active=True,
        timeout_seconds=25
    )
    config = ProviderService.create_provider_config(db_session, config_create)
    assert config.provider == "gemini"
    assert config.model == "gemini/gemini-2.0-flash"
    assert config.api_base == "https://custom.gemini.endpoint"
    assert config.api_key == "super_secret_gemini_key"
    assert config.is_active is True
    assert config.timeout_seconds == 25

    # Get active configs
    active_configs = ProviderService.get_active_configs(db_session)
    assert len(active_configs) == 1
    assert active_configs[0].provider == "gemini"

    # Get specific provider config
    fetched_config = ProviderService.get_provider_config(db_session, "gemini")
    assert fetched_config is not None
    assert fetched_config.api_key == "super_secret_gemini_key"

    # 3. Update existing provider config
    update_data = ProviderConfigCreate(
        id=config.id,
        provider="gemini",
        model="gemini/gemini-2.0-pro",
        api_base="https://new.gemini.endpoint",
        api_key="updated_secret_key",
        is_active=True,
        timeout_seconds=30
    )
    updated = ProviderService.create_provider_config(db_session, update_data)
    assert updated.id == config.id  # Same record
    assert updated.model == "gemini/gemini-2.0-pro"
    assert updated.api_base == "https://new.gemini.endpoint"
    assert updated.api_key == "updated_secret_key"
    assert updated.timeout_seconds == 30


def test_provider_service_multiple_models_same_provider(db_session):
    # 1. Create first gemini model
    config1 = ProviderConfigCreate(
        provider="gemini",
        model="gemini/gemini-2.0-flash",
        api_key="key_1",
        is_active=True,
        timeout_seconds=15
    )
    res1 = ProviderService.create_provider_config(db_session, config1)
    assert res1.id is not None
    assert res1.provider == "gemini"
    assert res1.model == "gemini/gemini-2.0-flash"

    # 2. Create second gemini model (should create a new row since model is different and no id provided)
    config2 = ProviderConfigCreate(
        provider="gemini",
        model="gemini/gemma-2-27b-it",
        api_key="key_2",
        is_active=True,
        timeout_seconds=20
    )
    res2 = ProviderService.create_provider_config(db_session, config2)
    assert res2.id is not None
    assert res2.id != res1.id  # Must be a separate row!
    assert res2.provider == "gemini"
    assert res2.model == "gemini/gemma-2-27b-it"

    # 3. Update the second model using its id (should change the model name without replacing or clashing)
    update_config2 = ProviderConfigCreate(
        id=res2.id,
        provider="gemini",
        model="gemini/gemma-3-custom",
        api_key="key_2_updated",
        is_active=True,
        timeout_seconds=30
    )
    updated2 = ProviderService.create_provider_config(db_session, update_config2)
    assert updated2.id == res2.id
    assert updated2.model == "gemini/gemma-3-custom"

    # Verify first model is untouched
    fetched1 = db_session.query(ProviderConfig).filter(ProviderConfig.id == res1.id).first()
    assert fetched1.model == "gemini/gemini-2.0-flash"


@pytest.mark.asyncio
async def test_provider_service_acompletion_with_db_config(db_session):
    # 1. Create a ProviderConfig
    config_data = ProviderConfigCreate(
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="groq_secret_key",
        is_active=True,
        timeout_seconds=18
    )
    ProviderService.create_provider_config(db_session, config_data)

    messages = [{"role": "user", "content": "Hello!"}]
    mock_response = {"choices": [{"message": {"content": "Hello! I am Groq."}}]}

    with patch("app.services.provider_service.litellm.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = mock_response

        res = await ProviderService.acompletion(
            db=db_session,
            provider="groq",
            messages=messages,
            temperature=0.7
        )

        assert res == mock_response
        mock_acompletion.assert_called_once_with(
            model="groq/llama-3.3-70b-versatile",
            messages=messages,
            timeout=18,
            api_key="groq_secret_key",
            api_base="https://api.groq.com/v1",
            temperature=0.7
        )


@pytest.mark.asyncio
async def test_provider_service_acompletion_with_fallback(db_session):
    # No ProviderConfig in DB for perplexity
    messages = [{"role": "user", "content": "Hello perplexity"}]
    mock_response = {"choices": [{"message": {"content": "Hello! I am Perplexity."}}]}

    with patch("app.services.provider_service.litellm.acompletion", new_callable=AsyncMock) as mock_acompletion:
        mock_acompletion.return_value = mock_response

        res = await ProviderService.acompletion(
            db=db_session,
            provider="perplexity",
            messages=messages,
            max_tokens=100
        )

        assert res == mock_response
        default = DEFAULT_PROVIDERS["perplexity"]
        mock_acompletion.assert_called_once_with(
            model=default["model"],
            messages=messages,
            timeout=default["timeout"],
            max_tokens=100
        )


@pytest.mark.asyncio
async def test_provider_service_acompletion_key_rotation_success(db_session):
    # 1. Create a ProviderConfig with multiple comma-separated keys
    config_data = ProviderConfigCreate(
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="bad_key1, bad_key2, good_key",
        is_active=True,
        timeout_seconds=18
    )
    ProviderService.create_provider_config(db_session, config_data)

    messages = [{"role": "user", "content": "Hello!"}]
    mock_response = {"choices": [{"message": {"content": "Hello! I am Groq."}}]}

    # Mock litellm.acompletion to fail twice with rate limits then succeed
    call_count = 0
    async def mock_acompletion_side_effect(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Rate limit reached. Status 429.")
        elif call_count == 2:
            raise Exception("Quota exceeded on this key.")
        else:
            return mock_response

    with patch("app.services.provider_service.litellm.acompletion", side_effect=mock_acompletion_side_effect) as mock_acomp:
        res = await ProviderService.acompletion(
            db=db_session,
            provider="groq",
            messages=messages,
            temperature=0.7
        )

        assert res == mock_response
        assert call_count == 3
        # Check that it called with each of the keys sequentially
        assert mock_acomp.call_args_list[0][1]["api_key"] == "bad_key1"
        assert mock_acomp.call_args_list[1][1]["api_key"] == "bad_key2"
        assert mock_acomp.call_args_list[2][1]["api_key"] == "good_key"


@pytest.mark.asyncio
async def test_provider_service_acompletion_key_rotation_exhausted(db_session):
    # Create ProviderConfig with two keys
    config_data = ProviderConfigCreate(
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="bad_key1, bad_key2",
        is_active=True,
        timeout_seconds=18
    )
    ProviderService.create_provider_config(db_session, config_data)

    messages = [{"role": "user", "content": "Hello!"}]

    # Mock litellm.acompletion to always fail
    async def mock_acompletion_side_effect(*args, **kwargs):
        raise Exception("Rate limit reached. 429.")

    with patch("app.services.provider_service.litellm.acompletion", side_effect=mock_acompletion_side_effect) as mock_acomp:
        with pytest.raises(Exception) as exc_info:
            await ProviderService.acompletion(
                db=db_session,
                provider="groq",
                messages=messages
            )
        assert "429" in str(exc_info.value)
        assert mock_acomp.call_count == 2


def test_provider_service_key_reconstruction(db_session):
    # 1. Create a ProviderConfig with initial keys
    config_data = ProviderConfigCreate(
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="key1,key2,key3",
        is_active=True,
        timeout_seconds=18
    )
    res = ProviderService.create_provider_config(db_session, config_data)
    assert res.api_key == "key1,key2,key3"

    # 2. Update with mix of __NO_CHANGE__ and new keys
    update_data = ProviderConfigCreate(
        id=res.id,
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="__NO_CHANGE__,new_key2,__NO_CHANGE__",
        is_active=True,
        timeout_seconds=18
    )
    updated = ProviderService.create_provider_config(db_session, update_data)
    assert updated.api_key == "key1,new_key2,key3"

    # 3. Update with a single __NO_CHANGE__ meaning keep all existing keys
    update_data_all_no_change = ProviderConfigCreate(
        id=res.id,
        provider="groq",
        model="groq/llama-3.3-70b-versatile",
        api_base="https://api.groq.com/v1",
        api_key="__NO_CHANGE__",
        is_active=True,
        timeout_seconds=18
    )
    updated_all = ProviderService.create_provider_config(db_session, update_data_all_no_change)
    assert updated_all.api_key == "key1,new_key2,key3"


def test_apply_scan_tier_limits_free_tier():
    from app.services.scan_service import ScanService, FREE_MAX_PROMPTS, FREE_MAX_PROVIDERS

    prompts = ["p1", "p2", "p3"]
    providers = [{"name": f"p{i}"} for i in range(5)]
    limited_prompts, limited_providers = ScanService._apply_scan_tier_limits(
        prompts, providers, is_premium=False
    )
    assert len(limited_prompts) == FREE_MAX_PROMPTS
    assert limited_prompts == ["p1", "p2"]
    assert len(limited_providers) == FREE_MAX_PROVIDERS
    assert limited_providers[0]["name"] == "p0"


def test_apply_scan_tier_limits_premium_unlimited():
    from app.services.scan_service import ScanService

    prompts = ["p1", "p2", "p3"]
    providers = [{"name": "a"}, {"name": "b"}]
    out_prompts, out_providers = ScanService._apply_scan_tier_limits(
        prompts, providers, is_premium=True
    )
    assert out_prompts == prompts
    assert out_providers == providers

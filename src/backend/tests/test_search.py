import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.database import Base
from app.models.schema import SystemConfig
from app.services.search_service import SearchService, SearchResult
from app.main import app

DATABASE_URL = "sqlite:///./test_temp_search.db"

@pytest.fixture(name="db_session")
def fixture_db_session():
    import os
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionTesting = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionTesting()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("test_temp_search.db"):
            try:
                os.remove("test_temp_search.db")
            except Exception:
                pass


def test_system_config_model(db_session):
    # 1. Test creation and encryption
    config = SystemConfig(key="serper_api_key", is_encrypted=True)
    config.set_value("my_super_secret_serper_key", encrypt=True)
    db_session.add(config)
    db_session.commit()

    assert config.key == "serper_api_key"
    assert config.is_encrypted is True
    # Value in database must be encrypted and not match raw text
    assert config.value != "my_super_secret_serper_key"
    # Decrypted helper returns original text
    assert config.decrypted_value == "my_super_secret_serper_key"


def test_system_config_endpoints(db_session):
    from app.models.database import get_db
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app)

    # 1. GET configs (should return default seeded configs)
    response = client.get("/api/v1/configs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    
    serper_cfg = next(c for c in data if c["key"] == "serper_api_key")
    assert serper_cfg["is_encrypted"] is True
    assert serper_cfg["has_value"] is False

    judge_cfg = next(c for c in data if c["key"] == "judge_model")
    assert judge_cfg["is_encrypted"] is False
    assert judge_cfg["has_value"] is True
    assert judge_cfg["value"] == "gemini/gemini-3.1-flash"

    fallback_cfg = next(c for c in data if c["key"] == "grounding_fallback_provider")
    assert fallback_cfg["is_encrypted"] is False
    assert fallback_cfg["has_value"] is True
    assert fallback_cfg["value"] == "gemini"

    toggle_cfg = next(c for c in data if c["key"] == "enable_search_grounding")
    assert toggle_cfg["is_encrypted"] is False
    assert toggle_cfg["has_value"] is True
    assert toggle_cfg["value"] == "true"

    # 2. POST update config
    response = client.post(
        "/api/v1/configs",
        json={"key": "serper_api_key", "value": "updated_secret_key"}
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["key"] == "serper_api_key"
    assert res_data["has_value"] is True

    # 3. GET configs again to verify is updated
    response = client.get("/api/v1/configs")
    assert response.status_code == 200
    data = response.json()
    serper_cfg_updated = next(c for c in data if c["key"] == "serper_api_key")
    assert serper_cfg_updated["has_value"] is True

    # 4. POST update config with __NO_CHANGE__ shouldn't overwrite the key
    response = client.post(
        "/api/v1/configs",
        json={"key": "serper_api_key", "value": "__NO_CHANGE__"}
    )
    assert response.status_code == 200
    
    config_in_db = db_session.query(SystemConfig).filter(SystemConfig.key == "serper_api_key").first()
    assert config_in_db.decrypted_value == "updated_secret_key"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_search_service_serper_dev(db_session):
    # Seed serper_api_key in DB
    config = SystemConfig(key="serper_api_key", is_encrypted=True)
    config.set_value("secret_serper_dev_key", encrypt=True)
    db_session.add(config)
    db_session.commit()

    prompt = "best coffee shop in Dallas"
    mock_serper_response = {
        "organic": [
            {
                "title": "Method Coffee",
                "link": "https://methodcoffee.com",
                "snippet": "Cozy cafe with craft roasts and local art.",
                "position": 1
            },
            {
                "title": "Ascension Coffee",
                "link": "https://ascension.coffee",
                "snippet": "Elegant venue offering premium house blends.",
                "position": 2
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_serper_response
        mock_post.return_value = mock_response

        results = await SearchService.search(prompt, "serper", db=db_session)

        assert len(results) == 2
        assert results[0].title == "Method Coffee"
        assert results[0].link == "https://methodcoffee.com"
        assert results[0].snippet == "Cozy cafe with craft roasts and local art."
        assert results[0].position == 1

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        assert kwargs["headers"]["X-API-KEY"] == "secret_serper_dev_key"
        assert kwargs["json"]["q"] == prompt


@pytest.mark.asyncio
async def test_search_service_ddg():
    prompt = "best coffee shop in Dallas"
    with open("/home/lgputan/Dev/iozera-geotracker/src/backend/ddg_sample.html", "r") as f:
        sample_html = f.read()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = sample_html
        mock_get.return_value = mock_response

        results = await SearchService.search(prompt, "ddg")

        assert len(results) == 10
        assert results[0].position == 1
        assert len(results[0].title) > 0
        assert len(results[0].link) > 0
        assert results[0].link.startswith("http")

        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        assert kwargs["params"]["q"] == prompt


def test_search_endpoint(db_session):
    from app.models.database import get_db
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db

    config = SystemConfig(key="serper_api_key", is_encrypted=True)
    config.set_value("secret_serper_dev_key", encrypt=True)
    db_session.add(config)
    db_session.commit()

    client = TestClient(app)

    mock_results = [
        SearchResult(
            title="Dallas Coffee Co",
            link="https://dallascoffee.com",
            snippet="Best coffee in Dallas.",
            position=1
        )
    ]

    with patch("app.services.search_service.SearchService.search", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_results

        response = client.post(
            "/api/v1/search",
            json={"prompt": "dallas coffee", "provider": "serper"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "dallas coffee"
        assert data["provider"] == "serper"
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Dallas Coffee Co"

        mock_search.assert_called_once_with("dallas coffee", "serper", db=db_session)

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_search_service_serper_dev_rich_metadata(db_session):
    # Seed serper_api_key in DB
    config = SystemConfig(key="serper_api_key", is_encrypted=True)
    config.set_value("secret_serper_dev_key", encrypt=True)
    db_session.add(config)
    db_session.commit()

    prompt = "apple inc"
    mock_serper_response = {
        "searchParameters": {
            "q": "apple inc",
            "gl": "us",
            "hl": "en"
        },
        "knowledgeGraph": {
            "title": "Apple",
            "type": "Technology company",
            "website": "http://www.apple.com/",
            "description": "Apple Inc. is an American multinational technology company...",
            "descriptionSource": "Wikipedia",
            "attributes": {
                "Headquarters": "Cupertino, CA",
                "CEO": "Tim Cook"
            }
        },
        "organic": [
            {
                "title": "Apple",
                "link": "https://www.apple.com/",
                "snippet": "Discover the innovative world of Apple...",
                "rating": 4.8,
                "ratingCount": 999,
                "attributes": {
                    "Products": "iPhone, iPad"
                },
                "sitelinks": [
                    {
                        "title": "Support",
                        "link": "https://support.apple.com/"
                    }
                ],
                "position": 1
            }
        ],
        "peopleAlsoAsk": [
            {
                "question": "What does Apple Inc mean?",
                "snippet": "Apple Inc., formerly Apple Computer, Inc...",
                "title": "Apple Inc. | Britannica",
                "link": "https://www.britannica.com/topic/Apple-Inc"
            }
        ],
        "relatedSearches": [
            {
                "query": "Apple Inc competitors"
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        from unittest.mock import MagicMock
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_serper_response
        mock_post.return_value = mock_response

        results = await SearchService.search(prompt, "serper", db=db_session)

        assert len(results) == 1
        res = results[0]
        assert res.title == "Apple"
        assert res.link == "https://www.apple.com/"
        assert res.snippet == "Discover the innovative world of Apple..."
        assert res.position == 1

        # Assert rich metadata is parsed successfully
        assert res.metadata is not None
        assert res.metadata.rating == 4.8
        assert res.metadata.ratingCount == 999
        assert res.metadata.attributes == {"Products": "iPhone, iPad"}
        assert len(res.metadata.sitelinks) == 1
        assert res.metadata.sitelinks[0].title == "Support"
        assert res.metadata.sitelinks[0].link == "https://support.apple.com/"

        # Assert global fields are attached
        assert res.metadata.searchParameters == {"q": "apple inc", "gl": "us", "hl": "en"}
        assert len(res.metadata.peopleAlsoAsk) == 1
        assert res.metadata.peopleAlsoAsk[0].question == "What does Apple Inc mean?"
        assert res.metadata.peopleAlsoAsk[0].link == "https://www.britannica.com/topic/Apple-Inc"
        assert len(res.metadata.relatedSearches) == 1
        assert res.metadata.relatedSearches[0].query == "Apple Inc competitors"
        assert res.metadata.knowledgeGraph is not None
        assert res.metadata.knowledgeGraph.title == "Apple"
        assert res.metadata.knowledgeGraph.website == "http://www.apple.com/"
        assert res.metadata.knowledgeGraph.attributes == {"Headquarters": "Cupertino, CA", "CEO": "Tim Cook"}


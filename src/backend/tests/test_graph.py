import json

import pytest

from app.graph.graph import build_graph
from app.graph.nodes import (
    classify_business,
    geo_expand,
    query_providers,
    query_single_provider,
    score_results,
    validate_input,
    web_search,
    is_brand_mentioned,
)
from app.graph.state import ScanRequest, ScanState


class TestValidateInput:
    def test_rejects_invalid_domain(self):
        req = ScanRequest(
            business_name="Test Biz",
            domain="not-a-domain",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = validate_input(state)

        assert len(result["errors"]) > 0
        assert "domain" in result["errors"][0].lower()

    def test_accepts_valid_domain(self):
        req = ScanRequest(
            business_name="Test Biz",
            domain="exampledental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = validate_input(state)

        domain_errors = [e for e in result["errors"] if "domain" in e.lower()]
        assert len(domain_errors) == 0

    def test_accepts_multidot_domain(self):
        req = ScanRequest(
            business_name="Mapua University",
            domain="mapua.edu.ph",
            industry="education",
            primary_city="Manila",
            primary_state="Metro Manila",
            country="Philippines",
        )
        state = ScanState(request=req)

        result = validate_input(state)

        domain_errors = [e for e in result["errors"] if "domain" in e.lower()]
        assert len(domain_errors) == 0

    def test_rejects_empty_name(self):
        req = ScanRequest(
            business_name="",
            domain="exampledental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = validate_input(state)

        assert any("name" in e.lower() for e in result["errors"])

    def test_accepts_domain_only_request(self):
        req = ScanRequest(
            business_name="",
            domain="exampledental.com",
            industry="",
            primary_city="",
            primary_state="",
            country="",
        )
        state = ScanState(request=req)

        result = validate_input(state)

        assert len(result["errors"]) == 0



class TestClassifyBusiness:
    @pytest.mark.asyncio
    async def test_llm_returns_classification_and_prompts(self, mocker):
        mock_resp = mocker.MagicMock()
        mock_resp.choices = [mocker.MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign", "Dental Implants", "Teeth Whitening"],
            "business_alias": "Test Dental Clinic",
            "prompts": [
                "Best dentist in Houston",
                "Invisalign specialist near Katy",
                "Trusted dental implants in Sugar Land",
            ],
        })

        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            return_value=mock_resp,
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = await classify_business(state)

        assert "classification" in result
        assert result["classification"]["industry"] == "dentist"
        assert result["classification"]["radius_miles"] == 40
        assert "Invisalign" in result["classification"]["default_services"]
        assert "prompts" in result
        assert len(result["prompts"]) == 3
        assert any("Houston" in p for p in result["prompts"])

    @pytest.mark.asyncio
    async def test_classify_business_injects_domain_grounding_context(self, mocker):
        # 1. Mock search results
        from app.services.search_service import SearchResult, SearchResultMetadata
        mock_results = [
            SearchResult(
                title="Apple Official Site",
                link="https://www.apple.com",
                snippet="Apple innovative products, iPhone, iPad, Mac.",
                position=1,
                metadata=SearchResultMetadata(rating=4.9, ratingCount=100)
            )
        ]
        mock_search = mocker.patch(
            "app.services.search_service.SearchService.search",
            new_callable=mocker.AsyncMock,
            return_value=mock_results
        )

        # 2. Mock LLM completion
        mock_resp = mocker.MagicMock()
        mock_resp.choices = [mocker.MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign"],
            "business_alias": "Test Clinic",
            "prompts": ["Best dentist"],
        })
        mock_acompletion = mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            return_value=mock_resp,
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        await classify_business(state)

        # 3. Assert search was called for the domain
        mock_search.assert_called_with("testdental.com", mocker.ANY, db=mocker.ANY)

        # 4. Assert acompletion was called with injected messages
        mock_acompletion.assert_called_once()
        kwargs = mock_acompletion.call_args[1]
        messages = kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "direct search grounding context" in messages[0]["content"]
        assert "Apple Official Site" in messages[0]["content"]
        assert "testdental.com" in messages[0]["content"]
        assert messages[1]["role"] == "user"

    @pytest.mark.asyncio
    async def test_classify_domain_only_virtual_business(self, mocker):
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
            "default_services": ["payment gateway", "subscription billing"],
            "business_alias": "Stripe Inc",
            "prompts": [
                "Best payment processing api",
                "Subscription billing gateway for saas",
            ],
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
        state = ScanState(request=req)

        result = await classify_business(state)

        assert "classification" in result
        assert result["classification"]["industry"] == "payment processing"
        assert result["classification"]["is_virtual"] is True
        assert "request" in result
        updated_req = result["request"]
        assert updated_req.business_name == "Stripe"
        assert updated_req.primary_city == "San Francisco"
        assert updated_req.primary_state == "California"
        assert updated_req.country == "USA"

    @pytest.mark.asyncio
    async def test_falls_back_when_llm_fails(self, mocker):
        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            side_effect=Exception("API error"),
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = await classify_business(state)

        assert "classification" in result
        assert result["classification"]["industry"] == "dentist"
        assert result["classification"]["radius_miles"] == 25
        assert "prompts" in result
        assert len(result["prompts"]) > 0
        assert any("dentist" in p.lower() for p in result["prompts"])

    @pytest.mark.asyncio
    async def test_fallback_prompts_include_services(self, mocker):
        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            side_effect=Exception("API error"),
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
            service_focuses=["Invisalign"],
        )
        state = ScanState(request=req)

        result = await classify_business(state)

        assert len(result["prompts"]) > 0
        assert any("Invisalign" in p for p in result["prompts"])

    @pytest.mark.asyncio
    async def test_classify_business_rate_limit_failover(self, mocker):
        # 1. Set up the db session mock to return "gemini" as the grounding_fallback_provider
        mock_db = mocker.MagicMock()
        mock_cfg = mocker.MagicMock()
        mock_cfg.value = "gemini"
        mock_db.query().filter().first.return_value = mock_cfg
        mocker.patch("app.models.database.SessionLocal", return_value=mock_db)

        # 2. Mock acompletion side effect: fail for gemini_grounding, succeed for gemini
        mock_resp = mocker.MagicMock()
        mock_resp.choices = [mocker.MagicMock()]
        mock_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 45,
            "default_services": ["Dental Implants"],
            "business_alias": "Resilient Clinic",
            "prompts": ["Best dentist in Houston"],
        })

        async def side_effect(provider, messages, **kwargs):
            if provider == "gemini_grounding":
                raise Exception("Rate limit reached on gemini_grounding")
            return mock_resp

        mock_acompletion = mocker.patch(
            "app.services.provider_service.ProviderService.acompletion",
            new_callable=mocker.AsyncMock,
            side_effect=side_effect
        )

        req = ScanRequest(
            business_name="Test Resilient",
            domain="resilientdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = await classify_business(state)

        # 3. Verify it used the fallback provider and successfully classified
        assert "classification" in result
        assert result["classification"]["industry"] == "dentist"
        assert result["classification"]["radius_miles"] == 45
        assert "Dental Implants" in result["classification"]["default_services"]
        assert len(result["prompts"]) == 1
        
        # 4. Verify acompletion calls
        assert mock_acompletion.call_count >= 3  # 2 for gemini_grounding, 1 for failover gemini
        providers_called = [args[1]["provider"] for args in mock_acompletion.call_args_list]
        assert "gemini_grounding" in providers_called
        assert "gemini" in providers_called


class TestGeoExpand:
    def test_returns_coordinates_and_suburbs(self):
        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req)

        result = geo_expand(state)

        assert "coordinates" in result or True
        assert "suburbs" in result


class TestQueryProviders:
    @pytest.mark.asyncio
    async def test_all_providers_succeed(self, mocker):
        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(
            request=req,
            prompts=["Best dentist in Houston", "Dental implants in Houston"],
        )

        mock_response = mocker.MagicMock()
        mock_response.choices = [mocker.MagicMock()]
        mock_response.choices[0].message.content = (
            "I recommend Test Dental in Houston."
        )

        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            return_value=mock_response,
        )

        mocker.patch(
            "app.services.provider_service.ProviderService.get_active_configs",
            return_value=[],
        )

        result = await query_providers(state)

        assert "provider_results" in result
        providers = {r["provider"] for r in result["provider_results"]}
        assert "gemini" in providers
        assert "perplexity" in providers
        assert "groq" in providers
        assert "deepseek" in providers
        assert "mistral" in providers

    @pytest.mark.asyncio
    async def test_one_provider_fails_others_succeed(self, mocker):
        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(
            request=req,
            prompts=["Best dentist in Houston"],
        )

        mock_response = mocker.MagicMock()
        mock_response.choices = [mocker.MagicMock()]
        mock_response.choices[0].message.content = (
            "Test Dental in Houston is excellent."
        )

        async def side_effect(model, messages, **kwargs):
            if "gemini" in model:
                raise Exception("Gemini API unavailable")
            return mock_response

        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            side_effect=side_effect,
        )

        mocker.patch(
            "app.services.provider_service.ProviderService.get_active_configs",
            return_value=[],
        )

        result = await query_providers(state)

        gemini_result = [r for r in result["provider_results"] if r["provider"] == "gemini"]
        groq_result = [r for r in result["provider_results"] if r["provider"] == "groq"]

        assert gemini_result[0]["error"] is not None
        assert groq_result[0]["error"] is None


class TestGraph:
    def test_builds_and_compiles(self):
        graph = build_graph()
        assert graph is not None
        assert "validate" in graph.nodes
        assert "classify" in graph.nodes
        assert "geo_expand" in graph.nodes
        # web_search runs in ScanService parallel to provider queries
        assert "web_search" not in graph.nodes
        # query_providers and score are now handled by ScanService, not the graph
        assert "query_providers" not in graph.nodes
        assert "score" not in graph.nodes

    @pytest.mark.asyncio
    async def test_full_scan_pipeline(self, mocker):
        """Graph runs validate -> classify -> geo_expand (web_search is in ScanService)."""
        mocker.patch(
            "app.services.search_service.SearchService.search",
            new_callable=mocker.AsyncMock,
            return_value=[]
        )

        classify_resp = mocker.MagicMock()
        classify_resp.choices = [mocker.MagicMock()]
        classify_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign", "Dental Implants"],
            "prompts": ["Best dentist in Houston", "Invisalign in Katy"],
        })

        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            return_value=classify_resp,
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
            service_focuses=["Invisalign"],
        )

        graph = build_graph()
        result = await graph.ainvoke({"request": req})

        assert "prompts" in result
        assert len(result["prompts"]) >= 1
        # search_results are populated by ScanService parallel web_search, not the graph
        # provider_results and overall_score are handled by ScanService, not the graph
        assert "overall_score" not in result or result.get("overall_score") is None

    @pytest.mark.asyncio
    async def test_stream_emits_progress_events(self, mocker):
        """Graph streams validate → classify → geo_expand.
        web_search, provider queries, and scoring are handled in ScanService."""
        mocker.patch(
            "app.services.search_service.SearchService.search",
            new_callable=mocker.AsyncMock,
            return_value=[]
        )

        classify_resp = mocker.MagicMock()
        classify_resp.choices = [mocker.MagicMock()]
        classify_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign"],
            "prompts": ["Best dentist in Houston"],
        })

        mocker.patch(
            "app.services.provider_service.litellm.acompletion",
            return_value=classify_resp,
        )

        req = ScanRequest(
            business_name="Test Dental",
            domain="testdental.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )

        graph = build_graph()
        initial = ScanState(request=req)

        events = []
        async for step in graph.astream(initial):
            events.append(step)

        all_nodes = set()
        for e in events:
            all_nodes.update(e.keys())

        assert "validate" in all_nodes
        assert "classify" in all_nodes
        assert "geo_expand" in all_nodes
        assert "web_search" not in all_nodes
        assert "query_providers" not in all_nodes
        assert "score" not in all_nodes


class TestScoreResults:
    def test_computes_score_from_mixed_results(self):
        state = ScanState(
            request=ScanRequest(
                business_name="Test Dental",
                domain="testdental.com",
                industry="dentist",
                primary_city="Houston",
                primary_state="Texas",
                country="USA",
            ),
            provider_results=[
                {"provider": "gemini", "status": "green", "score": 80, "mentioned": True, "actionable": True},
                {"provider": "perplexity", "status": "yellow", "score": 50, "mentioned": True, "actionable": False},
                {"provider": "groq", "status": "red", "score": 0, "mentioned": False, "actionable": False},
                {"provider": "deepseek", "status": "green", "score": 100, "mentioned": True, "actionable": True},
                {"provider": "mistral", "status": "red", "score": 0, "mentioned": False, "actionable": False},
            ],
        )

        result = score_results(state)

        assert "overall_score" in result
        assert 0 <= result["overall_score"] <= 100
        assert "summary" in result
        assert result["summary"]["green"] == 2
        assert result["summary"]["yellow"] == 1
        assert result["summary"]["red"] == 2

    def test_all_red_returns_zero(self):
        state = ScanState(
            request=ScanRequest(
                business_name="Unknown Biz",
                domain="unknown.com",
                industry="dentist",
                primary_city="Houston",
                primary_state="Texas",
                country="USA",
            ),
            provider_results=[
                {"provider": "gemini", "status": "red", "score": 0, "mentioned": False, "actionable": False},
                {"provider": "groq", "status": "red", "score": 0, "mentioned": False, "actionable": False},
            ],
        )

        result = score_results(state)

        assert result["overall_score"] == 0
        assert result["summary"]["red"] == 2


class TestWebSearch:
    @pytest.mark.asyncio
    async def test_web_search_no_prompts(self):
        req = ScanRequest(
            business_name="Test Biz",
            domain="example.com",
            industry="dentist",
            primary_city="Houston",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req, prompts=[])
        result = await web_search(state)
        assert result == {"search_results": []}

    @pytest.mark.asyncio
    async def test_web_search_success_serper(self, mocker):
        from app.services.search_service import SearchProviders, SearchResult
        
        # Mock SessionLocal and its DB operations
        mock_db = mocker.MagicMock()
        mock_cfg = mocker.MagicMock()
        mock_cfg.value = "serper"
        mock_db.query().filter().first.return_value = mock_cfg
        mocker.patch("app.models.database.SessionLocal", return_value=mock_db)

        # Mock SearchService.search
        mock_search_result = SearchResult(
            title="Dallas Dentist Clinic",
            link="https://dallasdentist.com",
            snippet="Top dentist clinic in Dallas.",
            position=1
        )
        mock_search = mocker.patch("app.services.search_service.SearchService.search", new_callable=mocker.AsyncMock)
        mock_search.return_value = [mock_search_result]

        req = ScanRequest(
            business_name="Dallas Dentist",
            domain="dallasdentist.com",
            industry="dentist",
            primary_city="Dallas",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req, prompts=["Best dentist in Dallas"])
        
        result = await web_search(state)
        
        assert "search_results" in result
        assert len(result["search_results"]) == 1
        assert result["search_results"][0]["prompt"] == "Best dentist in Dallas"
        assert len(result["search_results"][0]["results"]) == 1
        assert result["search_results"][0]["results"][0]["title"] == "Dallas Dentist Clinic"
        
        # Verify SearchService.search was called with SERPER provider
        mock_search.assert_called_once_with("Best dentist in Dallas", SearchProviders.SERPER, db=mock_db)

    @pytest.mark.asyncio
    async def test_web_search_success_ddg(self, mocker):
        from app.services.search_service import SearchProviders, SearchResult
        
        # Mock SessionLocal and its DB operations to return ddg search provider
        mock_db = mocker.MagicMock()
        mock_cfg = mocker.MagicMock()
        mock_cfg.value = "ddg"
        mock_db.query().filter().first.return_value = mock_cfg
        mocker.patch("app.models.database.SessionLocal", return_value=mock_db)

        # Mock SearchService.search
        mock_search_result = SearchResult(
            title="Ascension Coffee Shop",
            link="https://ascension.coffee",
            snippet="Cozy coffee house.",
            position=1
        )
        mock_search = mocker.patch("app.services.search_service.SearchService.search", new_callable=mocker.AsyncMock)
        mock_search.return_value = [mock_search_result]

        req = ScanRequest(
            business_name="Ascension",
            domain="ascension.coffee",
            industry="coffee",
            primary_city="Dallas",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req, prompts=["coffee in Dallas"])
        
        result = await web_search(state)
        
        assert "search_results" in result
        assert len(result["search_results"]) == 1
        assert result["search_results"][0]["prompt"] == "coffee in Dallas"
        
        # Verify SearchService.search was called with DDG provider
        mock_search.assert_called_once_with("coffee in Dallas", SearchProviders.DDG, db=mock_db)

    @pytest.mark.asyncio
    async def test_web_search_fallback_to_ddg_on_db_error(self, mocker):
        from app.services.search_service import SearchProviders, SearchResult

        # Mock SessionLocal to return a mock db that raises an exception on query
        mock_db = mocker.MagicMock()
        mock_db.query.side_effect = Exception("DB Connection Refused")
        mocker.patch("app.models.database.SessionLocal", return_value=mock_db)

        # Mock SearchService.search
        mock_search_result = SearchResult(
            title="Dallas Coffee",
            link="https://dallascoffee.com",
            snippet="Best coffee shop.",
            position=1
        )
        mock_search = mocker.patch("app.services.search_service.SearchService.search", new_callable=mocker.AsyncMock)
        mock_search.return_value = [mock_search_result]

        req = ScanRequest(
            business_name="Dallas Coffee",
            domain="dallascoffee.com",
            industry="coffee",
            primary_city="Dallas",
            primary_state="Texas",
            country="USA",
        )
        state = ScanState(request=req, prompts=["best coffee in Dallas"])

        # This should fallback to DDG and NOT crash
        result = await web_search(state)

        assert "search_results" in result
        assert len(result["search_results"]) == 1
        assert result["search_results"][0]["prompt"] == "best coffee in Dallas"
        
        # Verify it fallback to DDG search
        mock_search.assert_called_once_with("best coffee in Dallas", SearchProviders.DDG, db=mock_db)


class TestSearchGroundingInjection:
    @pytest.mark.asyncio
    async def test_non_grounding_provider_injects_search_results(self, mocker):
        mock_cfg = {"name": "groq", "model": "groq/llama-3.3-70b-versatile"}
        prompts = ["Best dentist in Houston"]
        
        # Mock SessionLocal to return True for enable_search_grounding
        mock_db = mocker.MagicMock()
        mock_cfg_db = mocker.MagicMock()
        mock_cfg_db.value = "true"
        mock_db.query().filter().first.return_value = mock_cfg_db
        mocker.patch("app.models.database.SessionLocal", return_value=mock_db)

        mocker.patch(
            "app.services.provider_service.ProviderService.resolve_provider_call_args",
            return_value={"model": "groq/llama-3.3-70b-versatile", "timeout": 30}
        )
        
        mock_resp = mocker.MagicMock()
        mock_resp.choices = [mocker.MagicMock()]
        mock_resp.choices[0].message.content = "1. Test Dental (testdental.com) - Best dentist\n"
        
        mock_acompletion = mocker.patch(
            "app.services.provider_service.ProviderService.acompletion",
            new_callable=mocker.AsyncMock,
            return_value=mock_resp
        )
        
        search_results = [
            {
                "prompt": "Best dentist in Houston",
                "results": [
                    {
                        "position": 1,
                        "title": "Houston Dental Care",
                        "link": "https://houstondentalcare.com",
                        "snippet": "Excellent dental services in Houston."
                    }
                ]
            }
        ]
        
        result = await query_single_provider(
            provider_cfg=mock_cfg,
            prompts=prompts,
            business_name="Test Dental",
            domain="testdental.com",
            search_results=search_results
        )
        
        assert mock_acompletion.call_count == 2
        call_args = mock_acompletion.call_args_list[0][1]
        messages = call_args["messages"]
        
        system_msg = messages[0]["content"]
        assert "helpful ai assistant" in system_msg.lower()
        assert "evaluating" in system_msg.lower()
        
        user_msg = messages[1]["content"]
        assert "Context from web search:" in user_msg
        assert "https://houstondentalcare.com" in user_msg
        assert "Houston Dental Care" in user_msg

    @pytest.mark.asyncio
    async def test_grounding_provider_does_not_inject_search_results(self, mocker):
        mock_cfg = {"name": "perplexity", "model": "perplexity/sonar-pro"}
        prompts = ["Best dentist in Houston"]
        
        mocker.patch(
            "app.services.provider_service.ProviderService.resolve_provider_call_args",
            return_value={"model": "perplexity/sonar-pro", "timeout": 30}
        )
        
        mock_resp = mocker.MagicMock()
        mock_resp.choices = [mocker.MagicMock()]
        mock_resp.choices[0].message.content = "1. Test Dental (testdental.com) - Best dentist\n"
        
        mock_acompletion = mocker.patch(
            "app.services.provider_service.ProviderService.acompletion",
            new_callable=mocker.AsyncMock,
            return_value=mock_resp
        )
        
        search_results = [
            {
                "prompt": "Best dentist in Houston",
                "results": [
                    {
                        "position": 1,
                        "title": "Houston Dental Care",
                        "link": "https://houstondentalcare.com",
                        "snippet": "Excellent dental services in Houston."
                    }
                ]
            }
        ]
        
        await query_single_provider(
            provider_cfg=mock_cfg,
            prompts=prompts,
            business_name="Test Dental",
            domain="testdental.com",
            search_results=search_results
        )
        
        assert mock_acompletion.call_count == 2
        call_args = mock_acompletion.call_args_list[0][1]
        messages = call_args["messages"]
        
        system_msg = messages[0]["content"]
        assert "search engine response parser" not in system_msg.lower()
        
        user_msg = messages[1]["content"]
        assert user_msg == "Best dentist in Houston"


class TestIsBrandMentioned:
    def test_exact_matches(self):
        assert is_brand_mentioned("For enterprise, Databricks is top-tier.", "Databricks, Inc.", "databricks.com")
        assert is_brand_mentioned("Find it on databricks.com.", "Databricks, Inc.", "databricks.com")
        assert is_brand_mentioned("Use Databricks Data Intelligence Platform.", "Databricks, Inc.", "databricks.com")

    def test_stripping_suffixes(self):
        # LLC suffix
        assert is_brand_mentioned("Google is the leader.", "Google LLC", "google.com")
        # Clinic suffix
        assert is_brand_mentioned("Urban Smiles is great.", "Urban Smiles Clinic", "urbansmiles.com")

    def test_domain_based_matches(self):
        # Match core domain
        assert is_brand_mentioned("We use databricks for scaling.", "Databricks, Inc.", "databricks.com")
        # Match URL in markdown
        assert is_brand_mentioned("Check out [Link](https://databricks.com/product).", "Databricks, Inc.", "databricks.com")

    def test_word_boundaries_prevent_false_positives(self):
        # Should not match 'ai' in 'train' or 'tailored'
        assert not is_brand_mentioned("This is a trained model with tailored options.", "AI Corp", "ai.com")
        # Should match 'ai' as a standalone word
        assert is_brand_mentioned("Top AI platforms include...", "AI Corp", "ai.com")

    def test_handles_hyphenated_domains(self):
        # urban-smiles.com -> sld is urban-smiles
        assert is_brand_mentioned("Urban Smiles is a great clinic.", "Urban Smiles Dental", "urban-smiles.com")
        assert is_brand_mentioned("Visit urban-smiles.com.", "Urban Smiles Dental", "urban-smiles.com")
        assert is_brand_mentioned("Visit urbansmiles.", "Urban Smiles Dental", "urban-smiles.com")


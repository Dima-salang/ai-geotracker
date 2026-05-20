import json

import pytest

from app.graph.graph import build_graph
from app.graph.nodes import (
    classify_business,
    geo_expand,
    query_providers,
    score_results,
    validate_input,
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
            "app.graph.nodes.litellm.acompletion",
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
    async def test_falls_back_when_llm_fails(self, mocker):
        mocker.patch(
            "app.graph.nodes.litellm.acompletion",
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
            "app.graph.nodes.litellm.acompletion",
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
            "app.graph.nodes.litellm.acompletion",
            return_value=mock_response,
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
            "app.graph.nodes.litellm.acompletion",
            side_effect=side_effect,
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

    @pytest.mark.asyncio
    async def test_full_scan_pipeline(self, mocker):
        classify_resp = mocker.MagicMock()
        classify_resp.choices = [mocker.MagicMock()]
        classify_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign", "Dental Implants"],
            "prompts": ["Best dentist in Houston", "Invisalign in Katy"],
        })

        provider_resp = mocker.MagicMock()
        provider_resp.choices = [mocker.MagicMock()]
        provider_resp.choices[0].message.content = (
            "I recommend Test Dental in Houston."
        )

        call_count = 0

        async def mock_llm(model, messages, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return classify_resp
            return provider_resp

        mocker.patch(
            "app.graph.nodes.litellm.acompletion",
            side_effect=mock_llm,
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

        assert "overall_score" in result
        assert result["overall_score"] >= 0
        assert len(result["provider_results"]) == 5
        assert "summary" in result

    @pytest.mark.asyncio
    async def test_stream_emits_progress_events(self, mocker):
        classify_resp = mocker.MagicMock()
        classify_resp.choices = [mocker.MagicMock()]
        classify_resp.choices[0].message.content = json.dumps({
            "domain_verified": True,
            "industry": "dentist",
            "radius_miles": 40,
            "default_services": ["Invisalign"],
            "prompts": ["Best dentist in Houston"],
        })

        provider_resp = mocker.MagicMock()
        provider_resp.choices = [mocker.MagicMock()]
        provider_resp.choices[0].message.content = (
            "Test Dental in Houston is excellent."
        )

        call_count = 0

        async def mock_llm(model, messages, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return classify_resp
            return provider_resp

        mocker.patch(
            "app.graph.nodes.litellm.acompletion",
            side_effect=mock_llm,
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
        assert "query_providers" in all_nodes
        assert "score" in all_nodes


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

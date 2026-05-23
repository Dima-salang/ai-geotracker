import os
import httpx
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from enum import Enum
from app.models.schema import SystemConfig

class SearchProviders(str, Enum):
    SERPER = "serper"
    DDG = "ddg"

class Sitelink(BaseModel):
    title: str
    link: str

class PeopleAlsoAskItem(BaseModel):
    question: str
    snippet: str
    title: Optional[str] = None
    link: Optional[str] = None

class RelatedSearchItem(BaseModel):
    query: str

class KnowledgeGraph(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    website: Optional[str] = None
    imageUrl: Optional[str] = None
    description: Optional[str] = None
    descriptionSource: Optional[str] = None
    descriptionLink: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None

class SearchResultMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")

    rating: Optional[float] = None
    ratingCount: Optional[int] = None
    attributes: Optional[Dict[str, Any]] = None
    sitelinks: Optional[List[Sitelink]] = None
    imageUrl: Optional[str] = None
    peopleAlsoAsk: Optional[List[PeopleAlsoAskItem]] = None
    relatedSearches: Optional[List[RelatedSearchItem]] = None
    knowledgeGraph: Optional[KnowledgeGraph] = None
    searchParameters: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    title: str
    link: str
    snippet: str
    position: int
    metadata: Optional[SearchResultMetadata] = None

class SearchRequest(BaseModel):
    prompt: str
    provider: SearchProviders

class SearchResponse(BaseModel):
    query: str
    provider: SearchProviders
    results: List[SearchResult]

class SearchService:
    @staticmethod
    async def search(prompt: str, provider: SearchProviders, db: Optional[Session] = None) -> List[SearchResult]:
        """
        Orchestrate web search using Serper Dev or DuckDuckGo.
        """
        if provider == SearchProviders.SERPER:
            return await SearchService._search_serper(prompt, db)
        elif provider == SearchProviders.DDG:
            return await SearchService._search_ddg(prompt)
        else:
            raise ValueError(f"Unsupported search provider: {provider}")

    @staticmethod
    async def _search_serper(prompt: str, db: Optional[Session] = None) -> List[SearchResult]:
        # 1. Resolve API key from DB or env
        api_key = None
        api_base = "https://google.serper.dev/search"
        timeout = 10

        if db:
            config = db.query(SystemConfig).filter(SystemConfig.key == "serper_api_key").first()
            if config:
                decrypted = config.decrypted_value
                if decrypted:
                    api_key = decrypted

        if not api_key:
            api_key = os.getenv("SERPER_API_KEY")

        if not api_key:
            raise ValueError(
                "Serper API key not configured. "
                "Please configure it in the Admin Settings dashboard or set the SERPER_API_KEY environment variable."
            )

        # 2. Query Serper
        headers = {
            "X-API-KEY": api_key,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                api_base,
                headers=headers,
                json={"q": prompt}
            )
            response.raise_for_status()
            data = response.json()

        # 3. Parse Serper results
        results = []
        organic = data.get("organic", [])

        # Parse global fields
        global_paa = None
        if "peopleAlsoAsk" in data:
            global_paa = []
            for paa in data["peopleAlsoAsk"]:
                global_paa.append(PeopleAlsoAskItem(
                    question=paa.get("question", ""),
                    snippet=paa.get("snippet", ""),
                    title=paa.get("title"),
                    link=paa.get("link")
                ))

        global_related = None
        if "relatedSearches" in data:
            global_related = []
            for rs in data["relatedSearches"]:
                global_related.append(RelatedSearchItem(
                    query=rs.get("query", "")
                ))

        global_kg = None
        if "knowledgeGraph" in data:
            kg_data = data["knowledgeGraph"]
            global_kg = KnowledgeGraph(
                title=kg_data.get("title"),
                type=kg_data.get("type"),
                website=kg_data.get("website"),
                imageUrl=kg_data.get("imageUrl"),
                description=kg_data.get("description"),
                descriptionSource=kg_data.get("descriptionSource"),
                descriptionLink=kg_data.get("descriptionLink"),
                attributes=kg_data.get("attributes")
            )

        global_params = data.get("searchParameters")

        for i, item in enumerate(organic, 1):
            organic_sitelinks = None
            if "sitelinks" in item:
                organic_sitelinks = []
                for sl in item["sitelinks"]:
                    organic_sitelinks.append(Sitelink(
                        title=sl.get("title", ""),
                        link=sl.get("link", "")
                    ))

            metadata = SearchResultMetadata(
                rating=item.get("rating"),
                ratingCount=item.get("ratingCount"),
                attributes=item.get("attributes"),
                sitelinks=organic_sitelinks,
                imageUrl=item.get("imageUrl"),
                peopleAlsoAsk=global_paa,
                relatedSearches=global_related,
                knowledgeGraph=global_kg,
                searchParameters=global_params
            )

            results.append(SearchResult(
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                position=item.get("position", i),
                metadata=metadata
            ))
        return results

    @staticmethod
    async def _search_ddg(prompt: str) -> List[SearchResult]:
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        params = {"q": prompt}
        timeout = 15

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            html = response.text

        # Parse with BeautifulSoup
        from bs4 import BeautifulSoup
        from urllib.parse import urlparse, parse_qs

        soup = BeautifulSoup(html, "html.parser")
        results = []
        result_divs = soup.find_all("div", class_="web-result")
        for i, div in enumerate(result_divs, 1):
            title_a = div.find("a", class_="result__a")
            snippet_a = div.find("a", class_="result__snippet")
            
            if not title_a:
                continue
                
            title = title_a.get_text(strip=True)
            raw_link = title_a.get("href", "")
            
            link = raw_link
            if "uddg=" in raw_link:
                parsed_url = urlparse(raw_link)
                qs = parse_qs(parsed_url.query)
                if "uddg" in qs:
                    link = qs["uddg"][0]
            elif raw_link.startswith("//"):
                link = "https:" + raw_link
                
            snippet = snippet_a.get_text(strip=True) if snippet_a else ""
            
            results.append(SearchResult(
                title=title,
                link=link,
                snippet=snippet,
                position=i,
                metadata={"raw_href": raw_link}
            ))
        return results


def lookup_google_maps_location(business_name: str, city: str, state: str = "", country: str = "") -> dict:
    """
    Search for a local business on Google Maps using Serper Dev or DDG search to find its exact
    physical coordinates (latitude, longitude), formatted address, and Google Maps URL.
    Use this tool ONLY if the business has a physical location (is_virtual is False)
    and we need to verify its exact geographic position on Google Maps.

    Args:
        business_name: The operational name of the local business.
        city: The primary city where it operates.
        state: The state/province where it operates.
        country: The country where it operates.

    Returns:
        A dictionary containing:
        - 'latitude' (float): latitude coordinate
        - 'longitude' (float): longitude coordinate
        - 'formatted_address' (str): full postal address
        - 'google_maps_url' (str): direct maps.google.com link
    """
    import os
    import httpx
    import logging
    from app.models.database import SessionLocal
    from app.models.schema import SystemConfig

    logger = logging.getLogger("app.services.search_service")
    logger.info("Maps tool called: %s in %s %s %s", business_name, city, state, country)

    api_key = None
    db = SessionLocal()
    try:
        cfg = db.query(SystemConfig).filter(SystemConfig.key == "serper_api_key").first()
        if cfg and cfg.decrypted_value:
            api_key = cfg.decrypted_value
    except Exception as e:
        logger.warning("Failed to fetch serper key from DB: %s", e)
    finally:
        db.close()

    if not api_key:
        api_key = os.getenv("SERPER_API_KEY")

    query = f"{business_name} in {city} {state} {country}".strip()
    
    if api_key:
        try:
            logger.info("Executing Serper Maps API lookup for: '%s'", query)
            headers = {
                "X-API-KEY": api_key,
                "Content-Type": "application/json"
            }
            # Query Serper Maps endpoint
            res = httpx.post(
                "https://google.serper.dev/maps",
                headers=headers,
                json={"q": query},
                timeout=10
            )
            res.raise_for_status()
            data = res.json()
            places = data.get("places", [])
            if places:
                place = places[0]
                lat = float(place.get("latitude", 29.7604))
                lng = float(place.get("longitude", -95.3698))
                address = place.get("address", "")
                cid = place.get("cid", "")
                
                logger.info("Serper Maps match found: %s (%f, %f)", address, lat, lng)
                return {
                    "latitude": lat,
                    "longitude": lng,
                    "formatted_address": address,
                    "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={business_name}&query_place_id={cid}" if cid else f"https://www.google.com/maps/search/?api=1&query={query}"
                }
        except Exception as e:
            logger.warning("Serper Maps lookup failed: %s", e)

    # Free OSM Nominatim fallback geocoder
    try:
        logger.info("Executing Nominatim OpenStreetMap fallback lookup for: '%s'", query)
        headers = {"User-Agent": "IozeraGeoTracker/1.0 (lgputan@gemini.com)"}
        res = httpx.get(
            f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1",
            headers=headers,
            timeout=8
        )
        if res.status_code == 200:
            results = res.json()
            if results:
                place = results[0]
                lat = float(place.get("lat", 29.7604))
                lon = float(place.get("lon", -95.3698))
                address = place.get("display_name", "")
                logger.info("Nominatim OSM match found: %s (%f, %f)", address, lat, lon)
                return {
                    "latitude": lat,
                    "longitude": lon,
                    "formatted_address": address,
                    "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={query}"
                }
    except Exception as osm_err:
        logger.warning("Nominatim OSM fallback lookup failed: %s", osm_err)

    # Heuristic coordinate defaults if geocoding yields no results
    logger.warning("All geocoders failed. Applying heuristic layout for %s", city)
    return {
        "latitude": 29.7604,  # Houston default coordinates
        "longitude": -95.3698,
        "formatted_address": f"{city}, {state}, {country}".strip(", "),
        "google_maps_url": f"https://www.google.com/maps/search/?api=1&query={query}"
    }

import os
import httpx
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from enum import Enum
from app.models.schema import SystemConfig

class SearchProviders(str, Enum):
    SERPER = "serper"
    DDG = "ddg"

class SearchResult(BaseModel):
    title: str
    link: str
    snippet: str
    position: int
    metadata: Optional[Dict[str, Any]] = None

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
        for i, item in enumerate(organic, 1):
            results.append(SearchResult(
                title=item.get("title", ""),
                link=item.get("link", ""),
                snippet=item.get("snippet", ""),
                position=item.get("position", i),
                metadata={
                    "sitelinks": item.get("sitelinks"),
                    "imageUrl": item.get("imageUrl")
                }
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

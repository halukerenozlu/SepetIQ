"""
Product Context Agent
---------------------
Amacı: Ürün sayfasından gelen ham veriyi yapılandırır.
1. httpx ile URL'yi çeker, script/style tag'lerini siler.
2. Gemini'ye with_structured_output() ile yapılandırılmış çağrı yapar.
3. State'i ürün bilgileriyle günceller.
"""

from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Literal

import httpx
from dotenv import find_dotenv, load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

from models.state import AgentState

# .env backend/ altında yoksa üst dizinlerde arar
load_dotenv(find_dotenv(usecwd=False))


class ProductExtraction(BaseModel):
    name: str = Field(description="Full product name")
    category: Literal["electronics", "cosmetics"] = Field(
        description="Top-level category")
    subcategory: str = Field(
        description="Specific product type, e.g. 'smartphone'")
    price: float = Field(description="Numeric price in TL, 0 if not found")
    brand: str = Field(description="Brand name")
    specs: dict[str, str] = Field(
        description="Key technical specs as key-value pairs")
    description: str = Field(description="1-2 sentence product summary")


_PROMPT = (
    "Extract product information from this Turkish e-commerce page.\n\n"
    "Page content:\n{raw_content}"
)

# Lazy-initialized at first call so missing API key doesn't break imports
_structured = None


def _get_structured():
    global _structured
    if _structured is None:
        _structured = ChatGoogleGenerativeAI(model="gemini-1.5-flash").with_structured_output(
            ProductExtraction
        )
    return _structured


def _strip_html(html: str) -> str:
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>",
                  "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()[:3000]


def _price_segment(price: float) -> str:
    if price < 500:
        return "budget"
    if price < 5000:
        return "mid"
    if price < 20000:
        return "premium"
    return "luxury"


async def run(state: AgentState) -> dict:
    started = time.monotonic()
    url = state.get("product_url") or ""

    raw_content = ""
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            raw_content = _strip_html(resp.text)
    except Exception:
        pass

    extracted: ProductExtraction | None = None
    if raw_content:
        try:
            extracted = await _get_structured().ainvoke(_PROMPT.format(raw_content=raw_content))
        except Exception:
            pass

    name = extracted.name if extracted else (
        state.get("product_name") or "Unknown Product")
    category = extracted.category if extracted else "electronics"
    subcategory = extracted.subcategory if extracted else ""
    price = extracted.price if extracted else (
        state.get("product_price") or 0.0)
    brand = extracted.brand if extracted else ""
    specs = extracted.specs if extracted else {}
    description = extracted.description if extracted else ""

    product_context_output = {
        "structured_name": name,
        "category_normalized": category,
        "subcategory": subcategory,
        "price_segment": _price_segment(price),
        "key_features": [f"{k}: {v}" for k, v in specs.items()][:5],
        "use_case_hints": [],
    }

    duration_ms = int((time.monotonic() - started) * 1000)
    traces = list(state.get("agent_traces") or [])
    traces.append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "product_context",
        "duration_ms": duration_ms,
        "status": "completed",
        "input_summary": url[:80],
        "output_summary": f"{name} — {price} TL ({product_context_output['price_segment']})",
        "key_findings": product_context_output["key_features"][:3] or [name],
    })

    result = {
        "product_name": name,
        "product_category": category,
        "product_subcategory": subcategory,
        "product_price": price,
        "product_brand": brand,
        "product_specs": specs,
        "product_description": description,
        "product_context_output": product_context_output,
        "agent_traces": traces,
    }

    # Write reviews to state so review_risk can read them
    result["product_reviews"] = result.get(
        "product_context_output", {}
    ).get("reviews", [])

    return result

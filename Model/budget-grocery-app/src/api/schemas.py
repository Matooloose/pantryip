"""
schemas.py — Pydantic request and response models for the API.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Request models ──────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., example="chicken breast", description="Product search term")
    budget: float = Field(..., gt=0, example=15.00, description="Max package price in AUD")
    city: Optional[str] = Field(None, example="Sydney")
    state: Optional[str] = Field(None, example="NSW")
    max_results: int = Field(10, ge=1, le=50)


class RecommendRequest(BaseModel):
    items: list[str] = Field(
        ...,
        example=["chicken breast", "milk 2L", "bread"],
        description="List of items you want to buy"
    )
    total_budget: float = Field(..., gt=0, example=50.00, description="Total budget in AUD")
    city: Optional[str] = Field(None, example="Melbourne")
    state: Optional[str] = Field(None, example="VIC")


# ── Response models ─────────────────────────────────────────────────────────

class ProductResult(BaseModel):
    Product_Name: str
    Brand: Optional[str]
    Sub_category: Optional[str]
    Package_price: float
    price_per_100g: Optional[float]
    discount_pct: Optional[float]  # percentage e.g. 15.0 means 15% off
    value_score: Optional[float]
    is_special: Optional[int]
    city: Optional[str]
    state: Optional[str]
    Product_Url: Optional[str] = Field(None, alias="Product_URL")


class SearchResponse(BaseModel):
    query: str
    budget: float
    total_found: int
    results: list[ProductResult]


class BasketItem(BaseModel):
    query: str
    best_match: Optional[ProductResult]
    alternatives: list[ProductResult]
    estimated_cost: float


class RecommendResponse(BaseModel):
    total_budget: float
    estimated_total: float
    within_budget: bool
    basket: list[BasketItem]


class PriceTrendResponse(BaseModel):
    sku: str
    last_known_price: float
    predicted_price: float
    price_change: Optional[float]
    trend: str          # "rising", "falling", "stable"
    confidence: str     # "low", "medium", "high"
    history: list[dict]
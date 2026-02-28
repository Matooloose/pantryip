"""
endpoints/search.py — Product search + price trend endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends
import pandas as pd
import logging

from src.api.schemas import SearchRequest, SearchResponse, PriceTrendResponse
from src.pipeline.inference_pipeline import get_pipeline, InferencePipeline
from src.models.price_predictor import PricePredictor

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/search", response_model=SearchResponse)
def search_products(
    request: SearchRequest,
    pipeline: InferencePipeline = Depends(get_pipeline)
):
    """
    Search for products by name and return results ranked by best value
    within the given budget.
    """
    try:
        results = pipeline.recommend(
            query=request.query,
            budget=request.budget,
            city=request.city,
            state=request.state,
            top_n=request.max_results
        )
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return SearchResponse(
        query=request.query,
        budget=request.budget,
        total_found=len(results),
        results=results
    )


@router.get("/categories")
def list_categories(pipeline: InferencePipeline = Depends(get_pipeline)):
    """Return all available product categories and sub-categories."""
    df = pipeline.full_df
    categories = (
        df.groupby("Category")["Sub_category"]
        .unique()
        .apply(list)
        .to_dict()
    )
    return {"categories": categories}


@router.get("/cheapest/{category}")
def cheapest_in_category(
    category: str,
    budget: float = 100.0,
    state: str = None,
    top_n: int = 10,
    pipeline: InferencePipeline = Depends(get_pipeline)
):
    """Return the cheapest products per unit in a given category."""
    df = pipeline.full_df.copy()

    mask = df["Category"].str.lower() == category.lower()
    if mask.sum() == 0:
        mask = df["Sub_category"].str.lower() == category.lower()

    if mask.sum() == 0:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    filtered = df[mask & (df["Package_price"] <= budget)]

    if state:
        state_mask = filtered["state"].str.upper() == state.upper()
        if state_mask.sum() > 0:
            filtered = filtered[state_mask]

    result = (
        filtered.nsmallest(top_n, "price_per_100g")
        [["Product_Name", "Brand", "Package_price", "price_per_100g",
          "value_score", "discount_pct", "city", "state", "Product_URL"]]
        .dropna(subset=["price_per_100g"])
        .to_dict(orient="records")
    )
    return {"category": category, "results": result}


@router.get("/price-trend/{sku}", response_model=PriceTrendResponse)
def price_trend(
    sku: str,
    pipeline: InferencePipeline = Depends(get_pipeline)
):
    """Get historical prices and predicted next price for a product SKU."""
    try:
        predictor = PricePredictor.load()
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Price predictor model not trained yet. Run train_pipeline first."
        )

    df = pipeline.full_df
    trend = predictor.predict_next_price(sku, df)

    if "error" in trend:
        raise HTTPException(status_code=404, detail=trend["error"])

    history = predictor.get_price_history(sku, df)
    trend["history"] = history
    return trend
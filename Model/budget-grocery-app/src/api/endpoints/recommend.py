"""
endpoints/recommend.py — Budget basket recommendation endpoint.
Given a list of items + total budget, finds the best affordable combo.
"""

from fastapi import APIRouter, HTTPException, Depends
import logging

from src.api.schemas import RecommendRequest, RecommendResponse, BasketItem
from src.pipeline.inference_pipeline import get_pipeline, InferencePipeline

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
def recommend_basket(
    request: RecommendRequest,
    pipeline: InferencePipeline = Depends(get_pipeline)
):
    """
    Given a shopping list and total budget, find the cheapest
    combination of products that fits within the budget.

    Strategy:
    - Split budget equally across items as starting per-item budget
    - For each item, find the best match + 2 alternatives
    - If total exceeds budget, progressively lower per-item budgets
    """
    n_items = len(request.items)
    if n_items == 0:
        raise HTTPException(status_code=400, detail="Items list cannot be empty")

    per_item_budget = request.total_budget / n_items
    basket = []
    estimated_total = 0.0

    for item_query in request.items:
        # Get top 3 candidates for this item
        results = pipeline.recommend(
            query=item_query,
            budget=per_item_budget,
            city=request.city,
            state=request.state,
            top_n=3
        )

        # If nothing found within per-item budget, try with full budget
        if not results:
            results = pipeline.recommend(
                query=item_query,
                budget=request.total_budget,
                city=request.city,
                state=request.state,
                top_n=3
            )

        if results:
            best = results[0]
            alternatives = results[1:] if len(results) > 1 else []
            item_cost = best["Package_price"]
        else:
            best = None
            alternatives = []
            item_cost = 0.0

        estimated_total += item_cost

        basket.append(BasketItem(
            query=item_query,
            best_match=best,
            alternatives=alternatives,
            estimated_cost=item_cost
        ))

    within_budget = estimated_total <= request.total_budget

    return RecommendResponse(
        total_budget=request.total_budget,
        estimated_total=round(estimated_total, 2),
        within_budget=within_budget,
        basket=basket
    )
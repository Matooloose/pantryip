import logging
import pandas as pd
from pathlib import Path

from src.models.budget_ranker import BudgetRanker
from src.models.similarity_search import ProductSearchIndex

logger = logging.getLogger(__name__)

PROCESSED_PATH = "data/processed/products_clean.parquet"

OUTPUT_COLUMNS = [
    "Product_Name", "Brand", "Sub_category",
    "Package_price", "price_per_100g",
    "discount_pct", "value_score",
    "is_special", "in_stock",
    "city", "state",
    "Product_Url"       # ← your actual column name (not Product_URL)
]


class InferencePipeline:
    def __init__(self):
        self.ranker = None
        self.search_index = None
        self.full_df = None

    def load(self):
        logger.info("Loading inference artifacts...")
        self.ranker = BudgetRanker.load()
        self.search_index = ProductSearchIndex.load()
        self.full_df = pd.read_parquet(PROCESSED_PATH)
        logger.info(f"Loaded {len(self.full_df):,} products into memory.")

    def recommend(
        self,
        query: str,
        budget: float,
        city: str = None,
        state: str = None,
        top_n: int = 10
    ) -> list[dict]:
        # 1. Semantic search → top 50 candidates
        candidates = self.search_index.search(query, top_k=50)
        if candidates.empty:
            return []

        # 2. Location filter (soft — only apply if results exist after filter)
        if city:
            city_match = candidates["city"].str.lower() == city.lower()
            if city_match.sum() > 0:
                candidates = candidates[city_match]

        if state:
            state_match = candidates["state"].str.upper() == state.upper()
            if state_match.sum() > 0:
                candidates = candidates[state_match]

        # 3. Rank by budget
        ranked = self.ranker.rank_products(candidates, budget=budget, top_n=top_n)
        if ranked.empty:
            return []

        # 4. Return only columns that exist
        cols = [c for c in OUTPUT_COLUMNS if c in ranked.columns]
        result = ranked[cols].copy()
        result["Package_price"]  = result["Package_price"].round(2)
        result["price_per_100g"] = result["price_per_100g"].round(2)
        result["discount_pct"]   = (result["discount_pct"] * 100).round(1)
        result["value_score"]    = result["value_score"].round(2)

        return result.to_dict(orient="records")


_pipeline_instance = None

def get_pipeline() -> InferencePipeline:
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = InferencePipeline()
        _pipeline_instance.load()
    return _pipeline_instance
"""
tests/test_ranker.py
"""
import pytest
import pandas as pd
import numpy as np
from src.models.budget_ranker import BudgetRanker


@pytest.fixture
def sample_products():
    return pd.DataFrame({
        "Product_Name": ["Cheap Chicken", "Mid Chicken", "Expensive Chicken", "Fish"],
        "Sub_category": ["Poultry", "Poultry", "Poultry", "Seafood"],
        "Package_price": [5.00, 10.00, 20.00, 8.00],
        "price_per_100g": [0.50, 1.00, 2.00, 0.80],
        "value_score": [2.0, 1.0, 0.5, 1.25],
        "discount_pct": [0.0, 0.10, 0.05, 0.15],
        "is_special": [0, 1, 0, 1],
        "is_budget_brand": [1, 0, 0, 0],
        "is_estimated": [0, 0, 0, 0],
        "availability_score": [1.0, 1.0, 1.0, 1.0],
        "category_code": [0, 0, 0, 1],
        "sub_category_code": [0, 0, 0, 1],
        "state_code": [0, 0, 0, 0],
        "log_package_price": [1.79, 2.40, 3.04, 2.20],
        "log_price_per_100g": [0.41, 0.69, 1.10, 0.59],
    })


def test_rank_products_filters_by_budget(sample_products):
    ranker = BudgetRanker()  # untrained — uses rule-based fallback
    result = ranker.rank_products(sample_products, budget=10.00)
    # Only products with Package_price <= 10 should appear
    assert all(result["Package_price"] <= 10.00)
    assert "Expensive Chicken" not in result["Product_Name"].values


def test_rank_products_empty_when_no_budget(sample_products):
    ranker = BudgetRanker()
    result = ranker.rank_products(sample_products, budget=1.00)
    assert result.empty


def test_rank_products_respects_top_n(sample_products):
    ranker = BudgetRanker()
    result = ranker.rank_products(sample_products, budget=100.00, top_n=2)
    assert len(result) <= 2


def test_rule_based_fallback_orders_by_value(sample_products):
    ranker = BudgetRanker()
    result = ranker.rank_products(sample_products, budget=100.00)
    # Best value_score should come first in fallback
    assert result.iloc[0]["value_score"] >= result.iloc[-1]["value_score"]
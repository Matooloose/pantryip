"""
tests/test_cleaner.py
"""
import pytest
import pandas as pd
import numpy as np
from src.data.cleaner import (
    clean_prices, clean_booleans, deduplicate,
    fill_retail_price, normalize_unit_price
)


@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "Sku": ["A001", "A001", "A002", "A003"],
        "RunDate": ["2022-09-01", "2022-09-08", "2022-09-01", "2022-09-01"],
        "Package_price": [6.50, 7.00, "bad", 0],
        "Retail_price": [None, 8.00, 9.00, 5.00],
        "unit_price": [6.50, 7.00, 5.00, 3.00],
        "unit_price_state": ["1Kg", "1Kg", "100g", "1Kg"],
        "Price_per_package_size": ["$6.50 per 1Kg", "$7.00 per 1Kg", "$5.00 per 100g", "$3.00"],
        "is_special": ["1", "FALSE", "TRUE", "0"],
        "is_estimated": ["0", "0", "1", "FALSE"],
        "Product_Name": ["Chicken Breast", "chicken breast", "Milk 2L", "Bread"],
        "Brand": ["coles", "COLES", "Woolworths", "Tip Top"],
        "Category": ["Meat & Seafood", "Meat & Seafood", "Dairy", "Bakery"],
        "Sub_category": ["Poultry", "Poultry", "Milk", "Bread"],
        "city": ["SYDNEY", "sydney", "Melbourne", "Brisbane"],
        "state": ["NSW", "NSW", "VIC", "QLD"],
    })


def test_clean_prices_removes_bad_rows(sample_df):
    result = clean_prices(sample_df)
    assert len(result) == 2  # "bad" and 0 removed
    assert result["Package_price"].dtype == float


def test_clean_booleans(sample_df):
    result = clean_booleans(sample_df)
    assert set(result["is_special"].unique()).issubset({0, 1})
    assert set(result["is_estimated"].unique()).issubset({0, 1})


def test_deduplicate_keeps_latest(sample_df):
    df = clean_prices(sample_df)
    result = deduplicate(df)
    # A001 appears twice — only latest (2022-09-08) should remain
    assert result[result["Sku"] == "A001"]["Package_price"].values[0] == 7.00


def test_fill_retail_price(sample_df):
    df = clean_prices(sample_df)
    result = fill_retail_price(df)
    # Row 0 had null Retail_price → should be Package_price * 1.1
    filled = result[result["Sku"] == "A001"].iloc[0]
    assert filled["Retail_price"] == pytest.approx(6.50 * 1.1, rel=1e-3)


def test_normalize_unit_price(sample_df):
    df = clean_prices(sample_df)
    result = normalize_unit_price(df)
    # 1Kg unit_price=6.50 → price_per_100g = 0.65
    row = result[(result["Sku"] == "A001") & (result["unit_price"] == 6.50)]
    assert row["price_per_100g"].values[0] == pytest.approx(0.65, rel=1e-2)
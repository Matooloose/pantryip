"""
tests/test_api.py
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


# Mock the pipeline before importing the app
mock_pipeline = MagicMock()
mock_pipeline.recommend.return_value = [
    {
        "Product_Name": "RSPCA Chicken Breast 1kg",
        "Brand": "Coles",
        "Sub_category": "Poultry",
        "Package_price": 9.00,
        "price_per_100g": 0.90,
        "discount_pct": 10.0,
        "value_score": 1.42,
        "is_special": 1,
        "city": "Sydney",
        "state": "NSW",
        "Product_URL": "https://example.com/product"
    }
]
mock_pipeline.full_df = MagicMock()
mock_pipeline.full_df.__getitem__ = MagicMock()


@pytest.fixture
def client():
    with patch("src.pipeline.inference_pipeline.get_pipeline", return_value=mock_pipeline):
        from src.api.main import app
        with TestClient(app) as c:
            yield c


def test_health_check(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_search_returns_results(client):
    response = client.post("/api/v1/search", json={
        "query": "chicken breast",
        "budget": 15.00,
        "city": "Sydney",
        "max_results": 5
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["total_found"] >= 0


def test_search_missing_budget(client):
    response = client.post("/api/v1/search", json={
        "query": "chicken"
        # budget is required — should return 422
    })
    assert response.status_code == 422


def test_recommend_basket(client):
    response = client.post("/api/v1/recommend", json={
        "items": ["chicken", "milk", "bread"],
        "total_budget": 40.00,
        "city": "Sydney"
    })
    assert response.status_code == 200
    data = response.json()
    assert "basket" in data
    assert "estimated_total" in data
    assert "within_budget" in data


def test_recommend_empty_items(client):
    response = client.post("/api/v1/recommend", json={
        "items": [],
        "total_budget": 40.00
    })
    assert response.status_code == 400
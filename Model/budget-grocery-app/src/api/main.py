"""
main.py — FastAPI application entry point.

Run with:
    uvicorn src.api.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from src.pipeline.inference_pipeline import get_pipeline
from src.api.endpoints import search, recommend

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML artifacts once on startup."""
    logger.info("Loading ML pipeline...")
    get_pipeline()
    logger.info("API ready.")
    yield


app = FastAPI(
    title="Budget Grocery Finder API",
    description="Find the most affordable groceries within your budget (South Africa).",
    version="1.1.0",
    lifespan=lifespan
)

# Allow Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router,    prefix="/api/v1", tags=["Search"])
app.include_router(recommend.router, prefix="/api/v1", tags=["Recommend"])


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Budget Grocery API is running (SA edition)"}
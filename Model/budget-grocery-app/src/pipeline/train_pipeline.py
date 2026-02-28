"""
train_pipeline.py
Run this once to:
  1. Load & clean the raw dataset
  2. Engineer features
  3. Train the LightGBM ranker
  4. Build the FAISS search index
  5. Save all artifacts to models/ and data/

Usage:
    python -m src.pipeline.train_pipeline
"""

import logging
import pandas as pd
from pathlib import Path

from src.data.loader import load_dataset, filter_in_stock
from src.data.cleaner import clean
from src.data.feature_engineering import build_features
from src.models.budget_ranker import BudgetRanker
from src.models.similarity_search import ProductSearchIndex

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)

RAW_DATA_PATH   = "data/raw/sa_groceries.csv"
PROCESSED_PATH  = "data/processed/products_clean.parquet"


def run():
    # ── Step 1: Load ──────────────────────────────────────────────────────
    logger.info("=" * 50)
    logger.info("STEP 1: Loading dataset")
    df = load_dataset(RAW_DATA_PATH)
    df = filter_in_stock(df)

    # ── Step 2: Clean ─────────────────────────────────────────────────────
    logger.info("=" * 50)
    logger.info("STEP 2: Cleaning data")
    df = clean(df)

    # ── Step 3: Features ──────────────────────────────────────────────────
    logger.info("=" * 50)
    logger.info("STEP 3: Feature engineering")
    df = build_features(df)

    # Save processed data
    Path("data/processed").mkdir(parents=True, exist_ok=True)
    df.to_parquet(PROCESSED_PATH, index=False)
    logger.info(f"Processed data saved → {PROCESSED_PATH}")

    # ── Step 4: Train Ranker ──────────────────────────────────────────────
    logger.info("=" * 50)
    logger.info("STEP 4: Training BudgetRanker")
    ranker = BudgetRanker()
    ranker.train(df, save=True)

    # ── Step 5: Build Search Index ────────────────────────────────────────
    logger.info("=" * 50)
    logger.info("STEP 5: Building FAISS search index")
    search_index = ProductSearchIndex()
    search_index.build(df, save=True)

    logger.info("=" * 50)
    logger.info("Training pipeline complete!")
    logger.info("Artifacts saved:")
    logger.info("  models/ranker_v1.pkl")
    logger.info("  data/embeddings/faiss.index")
    logger.info("  data/embeddings/product_index_df.parquet")
    logger.info("  data/processed/products_clean.parquet")


if __name__ == "__main__":
    run()
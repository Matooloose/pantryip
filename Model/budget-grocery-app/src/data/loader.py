import pandas as pd
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = [
    "Category", "Sub_category", "Product_Name", "Package_price",
    "is_special", "in_stock", "Brand", "Sku", "RunDate",
]

OPTIONAL_COLUMNS = [
    "Postal_code", "Product_Group", "Price_per_unit", "package_size",
    "is_estimated", "Retail_price", "Product_Url", "unit_price",
    "unit_price_unit", "unit_price_state", "state", "city", "tid",
]


def load_dataset(filepath: str) -> pd.DataFrame:
    """Load and validate the grocery dataset."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found at: {filepath}")

    logger.info(f"Loading dataset from {filepath}")
    df = pd.read_csv(filepath, low_memory=False)

    missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing:
        logger.warning(f"Missing columns: {missing}")

    logger.info(f"Loaded {len(df):,} rows, {len(df.columns)} columns")
    logger.info(f"Categories: {df['Category'].nunique()} | Brands: {df['Brand'].nunique()}")
    logger.info(f"Date range: {df['RunDate'].min()} to {df['RunDate'].max()}")

    return df


def filter_in_stock(df: pd.DataFrame) -> pd.DataFrame:
    """
    Filter to in-stock products only.
    If the column has no True/1 values at all, skip the filter
    and keep all rows (handles datasets where in_stock is all False).
    """
    before = len(df)
    col = df["in_stock"]

    # Detect usable True values
    if pd.api.types.is_numeric_dtype(col):
        true_count = (col.fillna(0).astype(float) == 1.0).sum()
    else:
        normalized = col.astype(str).str.strip().str.upper()
        true_count = normalized.isin(["1", "1.0", "TRUE"]).sum()

    if true_count == 0:
        logger.warning(
            f"in_stock column has 0 True/1 values out of {before:,} rows. "
            "Skipping in_stock filter — treating all products as available."
        )
        return df

    # Normal filter
    if pd.api.types.is_numeric_dtype(col):
        mask = col.fillna(0).astype(float) == 1.0
    else:
        mask = col.astype(str).str.strip().str.upper().isin(["1", "1.0", "TRUE"])

    after_df = df[mask]
    logger.info(f"In-stock filter: {before:,} → {len(after_df):,} rows")
    return after_df
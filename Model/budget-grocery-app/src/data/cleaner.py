import re
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


# ── Unit normalization ──────────────────────────────────────────────────────

def _gram_amount_from_size(size_str: str):
    """Extract gram/ml number from package_size column e.g. '400g' → 400."""
    if pd.isna(size_str):
        return None
    m = re.search(r"([\d]+\.?[\d]*)\s*(kg|g|ml|l)\b", str(size_str).lower())
    if not m:
        return None
    val, unit = float(m.group(1)), m.group(2)
    if unit == "kg":
        val *= 1000
    elif unit == "l":
        val *= 1000
    return val


def normalize_unit_price(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add price_per_100g column using unit_price + unit_price_unit columns.
    Your dataset uses 'unit_price_unit' (not 'unit_price_state').
    """
    df = df.copy()

    # Use whichever column name exists
    unit_col = "unit_price_unit" if "unit_price_unit" in df.columns else "unit_price_state"

    def calc_per_100g(row):
        unit_state = str(row.get(unit_col, "")).lower().strip()
        unit_price = row.get("unit_price")
        pkg_price  = row.get("Package_price")

        if pd.isna(unit_price) or unit_price <= 0:
            return np.nan

        if "100g" in unit_state or "100ml" in unit_state:
            return float(unit_price)

        if "1kg" in unit_state or unit_state == "kg":
            return float(unit_price) / 10.0

        if "1l" in unit_state or unit_state == "l":
            return float(unit_price) / 10.0

        # Try to extract from package_size column
        pkg_size_col = "package_size" if "package_size" in row.index else "Price_per_package_size"
        raw_size = str(row.get(pkg_size_col, ""))
        grams = _gram_amount_from_size(raw_size)
        if grams and grams > 0 and not pd.isna(pkg_price):
            return float(pkg_price) / grams * 100

        # Fallback: if unit_price exists, treat as per-100g
        return float(unit_price)

    df["price_per_100g"] = df.apply(calc_per_100g, axis=1)
    valid = df["price_per_100g"].notna().sum()
    logger.info(f"price_per_100g: {valid:,}/{len(df):,} rows calculated")
    return df


# ── Cleaning steps ──────────────────────────────────────────────────────────

def clean_prices(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce price columns to float, drop rows with no usable price."""
    df = df.copy()
    for col in ["Package_price", "unit_price", "Retail_price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    before = len(df)
    df = df[df["Package_price"].notna() & (df["Package_price"] > 0)]
    logger.info(f"Price clean: {before:,} → {len(df):,} rows")
    return df


def clean_booleans(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize is_special and is_estimated to 0/1 integers."""
    df = df.copy()
    for col in ["is_special", "is_estimated"]:
        if col in df.columns:
            df[col] = (
                df[col].astype(str).str.upper().str.strip()
                .map({"1": 1, "1.0": 1, "TRUE": 1, "0": 0, "0.0": 0, "FALSE": 0})
                .fillna(0).astype(int)
            )
    return df


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Keep the most recent record per Sku."""
    before = len(df)
    df = df.copy()
    df["RunDate"] = pd.to_datetime(df["RunDate"], errors="coerce")
    df = df.sort_values("RunDate", ascending=False).drop_duplicates(subset=["Sku"])
    logger.info(f"Dedup: {before:,} → {len(df):,} rows")
    return df


def fill_retail_price(df: pd.DataFrame) -> pd.DataFrame:
    """Estimate missing Retail_price as Package_price * 1.1."""
    df = df.copy()
    mask = df["Retail_price"].isna() | (df["Retail_price"] <= 0)
    df.loc[mask, "Retail_price"] = df.loc[mask, "Package_price"] * 1.1
    return df


def clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Strip whitespace from key string columns."""
    df = df.copy()
    for col in ["Product_Name", "Brand", "Category", "Sub_category", "city", "state"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.title()
    return df


# ── Master clean function ───────────────────────────────────────────────────

def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Run the full cleaning pipeline in order."""
    logger.info("Starting data cleaning...")
    df = clean_prices(df)
    df = clean_booleans(df)
    df = clean_text_columns(df)
    df = fill_retail_price(df)
    df = deduplicate(df)
    df = normalize_unit_price(df)
    logger.info(f"Cleaning complete. Final shape: {df.shape}")
    return df
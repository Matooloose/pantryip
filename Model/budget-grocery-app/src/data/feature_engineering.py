import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

BUDGET_BRANDS = {
    "pnp", "pick n pay", "shoprite", "ritebrand", "no name",
    "spar", "housebrand", "checkers", "ok brand"
}


def add_discount_pct(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["discount_pct"] = np.where(
        df["Retail_price"] > df["Package_price"],
        (df["Retail_price"] - df["Package_price"]) / df["Retail_price"],
        0.0
    )
    df["discount_pct"] = df["discount_pct"].clip(0, 1).round(4)
    return df


def add_is_budget_brand(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["is_budget_brand"] = (
        df["Brand"].str.lower().str.strip().isin(BUDGET_BRANDS)
    ).astype(int)
    return df


def add_category_median_price(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    medians = (
        df.groupby("Sub_category")["price_per_100g"]
        .median()
        .rename("category_median_price")
    )
    df = df.merge(medians, on="Sub_category", how="left")
    return df


def add_value_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["value_score"] = np.where(
        df["price_per_100g"] > 0,
        df["category_median_price"] / df["price_per_100g"],
        np.nan
    )
    df["value_score"] = df["value_score"].clip(0, 10).round(4)
    return df


def add_availability_score(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["RunDate"] = pd.to_datetime(df["RunDate"], errors="coerce")
    max_date = df["RunDate"].max()
    days_old = (max_date - df["RunDate"]).dt.days.fillna(30)
    recency_score = np.exp(-days_old / 30)

    # Handle numeric and string in_stock
    col = df["in_stock"]
    if pd.api.types.is_numeric_dtype(col):
        in_stock_flag = col.fillna(0).astype(float).clip(0, 1)
    else:
        in_stock_flag = col.astype(str).str.strip().str.upper().isin(["1", "1.0", "TRUE"]).astype(float)

    df["availability_score"] = (recency_score * in_stock_flag).round(4)
    return df


def encode_categoricals(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["category_code"]     = pd.Categorical(df["Category"]).codes
    df["sub_category_code"] = pd.Categorical(df["Sub_category"]).codes
    df["state_code"]        = pd.Categorical(df["state"]).codes
    return df


def add_log_price(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["log_package_price"]  = np.log1p(df["Package_price"])
    df["log_price_per_100g"] = np.log1p(df["price_per_100g"].fillna(0))
    return df


# ── Master feature function ─────────────────────────────────────────────────

def build_features(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Building features...")
    df = add_discount_pct(df)
    df = add_is_budget_brand(df)
    df = add_category_median_price(df)
    df = add_value_score(df)
    df = add_availability_score(df)
    df = encode_categoricals(df)
    df = add_log_price(df)
    logger.info(f"Features done. Columns: {list(df.columns)}")
    return df


MODEL_FEATURES = [
    "log_price_per_100g",
    "log_package_price",
    "discount_pct",
    "value_score",
    "is_special",
    "is_budget_brand",
    "is_estimated",
    "availability_score",
    "category_code",
    "sub_category_code",
    "state_code",
]
"""
price_predictor.py
Predicts future price of a product based on historical RunDate data.
Optional module — enhances the app with price trend alerts.
"""

import pickle
import logging
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error

logger = logging.getLogger(__name__)
MODELS_DIR = Path("models")


class PricePredictor:
    """
    Predicts next expected price for a product (by Sku).
    Uses time-based features + product metadata.
    Falls back to last known price if insufficient history.
    """

    def __init__(self):
        self.model = Ridge(alpha=1.0)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.min_history = 3  # minimum data points needed to predict

    # ── Feature builder ───────────────────────────────────────────────────

    def _build_time_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create time-based features from RunDate."""
        df = df.copy()
        df["RunDate"] = pd.to_datetime(df["RunDate"], errors="coerce")
        df = df.dropna(subset=["RunDate", "Package_price"])
        df = df.sort_values(["Sku", "RunDate"])

        df["day_of_year"]  = df["RunDate"].dt.dayofyear
        df["week_of_year"] = df["RunDate"].dt.isocalendar().week.astype(int)
        df["month"]        = df["RunDate"].dt.month
        df["days_since_epoch"] = (
            df["RunDate"] - pd.Timestamp("2020-01-01")
        ).dt.days

        # Lag features per Sku
        df["prev_price"]    = df.groupby("Sku")["Package_price"].shift(1)
        df["price_change"]  = df["Package_price"] - df["prev_price"]
        df["rolling_mean"]  = (
            df.groupby("Sku")["Package_price"]
            .transform(lambda x: x.rolling(3, min_periods=1).mean())
        )

        return df

    def _get_feature_cols(self):
        return [
            "days_since_epoch", "day_of_year", "week_of_year", "month",
            "prev_price", "price_change", "rolling_mean",
            "is_special", "is_estimated",
            "category_code", "sub_category_code"
        ]

    # ── Training ──────────────────────────────────────────────────────────

    def train(self, df: pd.DataFrame, save: bool = True):
        """
        Train on historical price observations.
        Each row = one price observation for a product at a point in time.
        Target = Package_price at time t, features include t-1 lag.
        """
        logger.info("Building time features for price predictor...")
        df = self._build_time_features(df)

        feature_cols = self._get_feature_cols()
        available = [c for c in feature_cols if c in df.columns]

        df_model = df.dropna(subset=available + ["Package_price"])
        X = df_model[available].fillna(0)
        y = df_model["Package_price"].values

        if len(X) < 100:
            logger.warning("Too few samples to train price predictor reliably.")
            return

        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_trained = True
        self.trained_feature_cols = available

        # Evaluate in-sample MAE
        preds = self.model.predict(X_scaled)
        mae = mean_absolute_error(y, preds)
        logger.info(f"Price predictor trained. In-sample MAE: ${mae:.4f}")

        if save:
            self.save()

    # ── Inference ─────────────────────────────────────────────────────────

    def predict_next_price(self, sku: str, df: pd.DataFrame) -> dict:
        """
        Predict the next price for a given Sku.
        Returns dict with predicted_price, last_known_price, trend.
        """
        sku_df = df[df["Sku"] == sku].copy()

        if sku_df.empty:
            return {"error": f"Sku '{sku}' not found"}

        last_known = float(sku_df["Package_price"].iloc[-1])

        # Not enough history or model not trained → return last known
        if len(sku_df) < self.min_history or not self.is_trained:
            return {
                "sku": sku,
                "predicted_price": last_known,
                "last_known_price": last_known,
                "trend": "stable",
                "confidence": "low"
            }

        sku_df = self._build_time_features(sku_df)
        available = [c for c in self.trained_feature_cols if c in sku_df.columns]
        X = sku_df[available].fillna(0).tail(1)
        X_scaled = self.scaler.transform(X)
        predicted = float(self.model.predict(X_scaled)[0])
        predicted = max(predicted, 0.10)  # price floor

        change = predicted - last_known
        trend = "stable"
        if change > 0.20:
            trend = "rising"
        elif change < -0.20:
            trend = "falling"

        return {
            "sku": sku,
            "predicted_price": round(predicted, 2),
            "last_known_price": round(last_known, 2),
            "price_change": round(change, 2),
            "trend": trend,
            "confidence": "medium" if len(sku_df) >= 5 else "low"
        }

    def get_price_history(self, sku: str, df: pd.DataFrame) -> list[dict]:
        """Return price history for a Sku sorted by date."""
        sku_df = (
            df[df["Sku"] == sku][["RunDate", "Package_price", "is_special"]]
            .sort_values("RunDate")
            .dropna(subset=["Package_price"])
        )
        return sku_df.to_dict(orient="records")

    # ── Persistence ───────────────────────────────────────────────────────

    def save(self, path: str = None):
        MODELS_DIR.mkdir(exist_ok=True)
        save_path = path or MODELS_DIR / "price_predictor.pkl"
        with open(save_path, "wb") as f:
            pickle.dump(self, f)
        logger.info(f"PricePredictor saved → {save_path}")

    @classmethod
    def load(cls, path: str = None) -> "PricePredictor":
        load_path = path or MODELS_DIR / "price_predictor.pkl"
        with open(load_path, "rb") as f:
            instance = pickle.load(f)
        logger.info(f"PricePredictor loaded from {load_path}")
        return instance
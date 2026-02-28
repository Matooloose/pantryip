import pickle
import numpy as np
import pandas as pd
import logging
from pathlib import Path

import lightgbm as lgb
from sklearn.model_selection import GroupShuffleSplit

from src.data.feature_engineering import MODEL_FEATURES

logger = logging.getLogger(__name__)
MODELS_DIR = Path("models")

# LightGBM LambdaRank max label value — must stay below this
MAX_LABEL = 30


class BudgetRanker:
    def __init__(self):
        self.model = None
        self.feature_names = MODEL_FEATURES

    # ── Training ───────────────────────────────────────────────────────────

    def _build_groups_and_labels(self, df: pd.DataFrame):
        """
        LambdaRank needs:
          - groups: how many products per query (we use Sub_category as query)
          - relevance labels: 0–MAX_LABEL integers (higher = better value)

        Steps:
          1. Sort by Sub_category so groups are contiguous
          2. Rank products within each group by value_score
          3. Scale ranks to 0–MAX_LABEL range
        """
        df = df.copy().sort_values("Sub_category").reset_index(drop=True)

        # Rank within each sub-category by value_score (higher = better = higher label)
        df["_raw_rank"] = (
            df.groupby("Sub_category")["value_score"]
            .rank(method="first", ascending=True)
        )

        # Scale each group's ranks to 0–MAX_LABEL
        # e.g. group with 300 items: rank 1 → 0, rank 300 → 30
        def scale_group(grp):
            mn, mx = grp.min(), grp.max()
            if mx == mn:
                return pd.Series(0, index=grp.index)
            scaled = (grp - mn) / (mx - mn) * MAX_LABEL
            return scaled.round().astype(int)

        df["relevance"] = df.groupby("Sub_category")["_raw_rank"].transform(scale_group)
        df["relevance"] = df["relevance"].clip(0, MAX_LABEL).astype(int)

        # Group sizes (must be in same order as sorted df)
        groups = df.groupby("Sub_category", sort=False).size().values

        logger.info(f"Relevance label range: {df['relevance'].min()} – {df['relevance'].max()}")
        logger.info(f"Number of groups: {len(groups)}, avg group size: {groups.mean():.1f}")

        return df, groups

    def train(self, df: pd.DataFrame, save: bool = True):
        logger.info("Preparing training data...")

        if df.empty:
            logger.error("DataFrame is empty — cannot train.")
            return

        df = df.dropna(subset=["price_per_100g", "value_score"])
        logger.info(f"Rows after dropna: {len(df):,}")

        if len(df) < 10:
            logger.error(f"Too few rows ({len(df)}) to train.")
            return

        df, groups = self._build_groups_and_labels(df)

        X = df[self.feature_names].fillna(0)
        y = df["relevance"].values
        n_groups = df["Sub_category"].nunique()

        # ── Train/val split ────────────────────────────────────────────────
        if n_groups < 2:
            logger.warning("Only 1 sub-category — training without validation split.")
            train_data = lgb.Dataset(X, label=y, group=groups)
            self.model = lgb.train(
                self._get_params(early_stop=False),
                train_data,
                num_boost_round=200
            )
        else:
            splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
            train_idx, val_idx = next(splitter.split(X, y, groups=df["Sub_category"]))

            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y[train_idx], y[val_idx]

            # Recompute group sizes after split
            train_groups = (
                df.iloc[train_idx]
                .groupby("Sub_category", sort=False)
                .size().values
            )
            val_groups = (
                df.iloc[val_idx]
                .groupby("Sub_category", sort=False)
                .size().values
            )

            # Filter out groups with size 0 (safety)
            train_groups = train_groups[train_groups > 0]
            val_groups   = val_groups[val_groups > 0]

            train_data = lgb.Dataset(X_train, label=y_train, group=train_groups)
            val_data   = lgb.Dataset(X_val,   label=y_val,   group=val_groups)

            params = self._get_params(early_stop=True)
            n_rounds      = params.pop("n_estimators")
            early_stop_r  = params.pop("early_stopping_rounds")

            logger.info("Training LightGBM LambdaRank model...")
            self.model = lgb.train(
                params,
                train_data,
                valid_sets=[val_data],
                valid_names=["val"],
                num_boost_round=n_rounds,
                callbacks=[
                    lgb.early_stopping(early_stop_r),
                    lgb.log_evaluation(50)
                ]
            )

        logger.info("Training complete.")
        self._log_feature_importance()

        if save:
            self.save()

    def _get_params(self, early_stop: bool = True):
        params = {
            "objective":        "lambdarank",
            "metric":           "ndcg",
            "ndcg_eval_at":     [5, 10],
            "label_gain":       list(range(MAX_LABEL + 1)),  # ← tells LightGBM labels go 0–30
            "learning_rate":    0.05,
            "num_leaves":       63,
            "min_data_in_leaf": 5,
            "n_estimators":     500,
            "verbose":          -1,
        }
        if early_stop:
            params["early_stopping_rounds"] = 50
        return params

    def _log_feature_importance(self):
        if self.model is None:
            return
        importance = dict(zip(
            self.feature_names,
            self.model.feature_importance(importance_type="gain")
        ))
        top = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
        logger.info(f"Top 5 features: {top}")

    # ── Inference ─────────────────────────────────────────────────────────

    def predict_scores(self, df: pd.DataFrame) -> np.ndarray:
        X = df[self.feature_names].fillna(0)
        return self.model.predict(X)

    def rank_products(self, df: pd.DataFrame, budget: float, top_n: int = 10) -> pd.DataFrame:
        candidates = df[df["Package_price"] <= budget].copy()

        if candidates.empty:
            logger.warning(f"No products within budget ${budget:.2f}")
            return pd.DataFrame()

        # Relevance filtering: ignore candidates with essentially zero keyword match
        # (This is critical when dataset size is close to top_k candidates)
        if "search_score" in candidates.columns:
            candidates = candidates[candidates["search_score"] > 0.01].copy()
            if candidates.empty:
                logger.warning("No relevant products found for query after filtering low scores.")
                return pd.DataFrame()

        if self.model is not None:
            # Normalize model score to 0-1 (rough approximation for combining)
            raw_scores = self.predict_scores(candidates)
            
            # Combine with search_score if available
            if "search_score" in candidates.columns:
                # search_score is 0-1. raw_scores is arbitrary.
                # We want relevance TO BE primary, and value to be the tie-breaker/secondary.
                # One way: boost = search_score * 10 
                candidates["_total_score"] = raw_scores + (candidates["search_score"] * 5.0)
            else:
                candidates["_total_score"] = raw_scores
        else:
            logger.warning("Model not loaded — using rule-based fallback.")
            candidates["_total_score"] = (
                candidates["value_score"].fillna(0) +
                candidates["discount_pct"].fillna(0)
            )
            if "search_score" in candidates.columns:
                candidates["_total_score"] += candidates["search_score"] * 5.0

        return (
            candidates.sort_values("_total_score", ascending=False)
            .head(top_n)
            .drop(columns=["_total_score"])
        )

    # ── Persistence ───────────────────────────────────────────────────────

    def save(self, path: str = None):
        MODELS_DIR.mkdir(exist_ok=True)
        model_path = path or MODELS_DIR / "ranker_v1.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(self, f)
        logger.info(f"Model saved → {model_path}")

    @classmethod
    def load(cls, path: str = None) -> "BudgetRanker":
        model_path = path or MODELS_DIR / "ranker_v1.pkl"
        with open(model_path, "rb") as f:
            instance = pickle.load(f)
        logger.info(f"Model loaded from {model_path}")
        return instance
import numpy as np
import pandas as pd
import pickle
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

EMBEDDINGS_DIR = Path("data/embeddings")


class ProductSearchIndex:
    """
    FAISS-based semantic search over product names.
    Falls back to TF-IDF keyword search if FAISS is unavailable.
    """

    def __init__(self):
        self.index = None
        self.product_df = None   # stores original rows aligned to index
        self.encoder = None      # sentence-transformer model
        self.use_faiss = True

    # ── Building the index ────────────────────────────────────────────────

    def build(self, df: pd.DataFrame, save: bool = True):
        """Embed all Product_Names and build FAISS index."""
        try:
            from sentence_transformers import SentenceTransformer
            import faiss
            self.use_faiss = True
        except ImportError:
            logger.warning("sentence-transformers or faiss not installed. Using TF-IDF fallback.")
            self.use_faiss = False
            self._build_tfidf(df)
            if save:
                self.save()
            return

        logger.info("Loading sentence-transformer model...")
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")

        self.product_df = df.reset_index(drop=True)
        names = df["Product_Name"].fillna("").tolist()

        logger.info(f"Encoding {len(names):,} product names...")
        embeddings = self.encoder.encode(names, batch_size=256, show_progress_bar=True)
        embeddings = embeddings.astype("float32")

        # L2-normalize for cosine similarity via inner product
        faiss.normalize_L2(embeddings)

        dim = embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(embeddings)
        logger.info(f"FAISS index built with {self.index.ntotal:,} vectors (dim={dim})")

        if save:
            self.save()

    def _build_tfidf(self, df: pd.DataFrame):
        """Fallback: TF-IDF sparse index."""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        self.product_df = df.reset_index(drop=True)
        self.tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        self.tfidf_matrix = self.tfidf.fit_transform(
            df["Product_Name"].fillna("").tolist()
        )
        logger.info("TF-IDF index built.")

    # ── Search ────────────────────────────────────────────────────────────

    def search(self, query: str, top_k: int = 50) -> pd.DataFrame:
        """
        Return top_k most similar products for a text query.
        These are *candidates* — the ranker re-orders them.
        """
        if self.use_faiss and self.index is not None:
            return self._search_faiss(query, top_k)
        elif hasattr(self, "tfidf"):
            return self._search_tfidf(query, top_k)
        else:
            raise RuntimeError("Index not built. Call build() first.")

    def _search_faiss(self, query: str, top_k: int) -> pd.DataFrame:
        import faiss
        q_vec = self.encoder.encode([query]).astype("float32")
        faiss.normalize_L2(q_vec)
        scores, indices = self.index.search(q_vec, top_k)
        result = self.product_df.iloc[indices[0]].copy()
        result["search_score"] = scores[0]
        return result.reset_index(drop=True)

    def _search_tfidf(self, query: str, top_k: int) -> pd.DataFrame:
        from sklearn.metrics.pairwise import cosine_similarity
        q_vec = self.tfidf.transform([query])
        scores = cosine_similarity(q_vec, self.tfidf_matrix).flatten()
        top_idx = scores.argsort()[::-1][:top_k]
        result = self.product_df.iloc[top_idx].copy()
        result["search_score"] = scores[top_idx]
        return result.reset_index(drop=True)

    # ── Persistence ───────────────────────────────────────────────────────

    def save(self, directory: str = None):
        save_dir = Path(directory or EMBEDDINGS_DIR)
        save_dir.mkdir(parents=True, exist_ok=True)

        if self.use_faiss and self.index is not None:
            import faiss
            faiss.write_index(self.index, str(save_dir / "faiss.index"))

        self.product_df.to_parquet(save_dir / "product_index_df.parquet")
        # Save metadata (including fallback mode info)
        with open(save_dir / "search_index_meta.pkl", "wb") as f:
            pickle.dump({"use_faiss": self.use_faiss}, f)

        # If using TF-IDF, save the vectorizer and matrix
        if hasattr(self, "tfidf"):
            with open(save_dir / "tfidf_index.pkl", "wb") as f:
                pickle.dump({"vectorizer": self.tfidf, "matrix": self.tfidf_matrix}, f)

        logger.info(f"Search index saved to {save_dir}")

    @classmethod
    def load(cls, directory: str = None) -> "ProductSearchIndex":
        load_dir = Path(directory or EMBEDDINGS_DIR)
        instance = cls()

        # Load product data
        parquet_path = load_dir / "product_index_df.parquet"
        if parquet_path.exists():
            instance.product_df = pd.read_parquet(parquet_path)
        else:
            raise FileNotFoundError(f"Product index not found at {parquet_path}")

        # Try FAISS first, fall back to TF-IDF
        try:
            import faiss
            from sentence_transformers import SentenceTransformer

            faiss_path = load_dir / "faiss.index"
            if faiss_path.exists():
                instance.index = faiss.read_index(str(faiss_path))
                instance.encoder = SentenceTransformer("all-MiniLM-L6-v2")
                instance.use_faiss = True
                logger.info(f"FAISS search index loaded from {load_dir}")
                return instance
        except ImportError:
            logger.warning("FAISS/sentence-transformers not installed. Trying TF-IDF fallback.")

        # TF-IDF fallback
        tfidf_path = load_dir / "tfidf_index.pkl"
        if tfidf_path.exists():
            with open(tfidf_path, "rb") as f:
                tfidf_data = pickle.load(f)
                instance.tfidf = tfidf_data["vectorizer"]
                instance.tfidf_matrix = tfidf_data["matrix"]
            instance.use_faiss = False
            logger.info(f"TF-IDF search index loaded from {load_dir}")
        else:
            # Rebuild TF-IDF from product data
            from sklearn.feature_extraction.text import TfidfVectorizer
            instance.tfidf = TfidfVectorizer(stop_words="english")
            texts = instance.product_df["Product_Name"].fillna("").tolist()
            instance.tfidf_matrix = instance.tfidf.fit_transform(texts)
            instance.use_faiss = False
            logger.info("Rebuilt TF-IDF index from product data")

        return instance
import pandas as pd
import logging
from src.models.similarity_search import ProductSearchIndex

logging.basicConfig(level=logging.INFO)

def test():
    print("Loading search index...")
    idx = ProductSearchIndex.load()
    print(f"Loaded {len(idx.product_df)} products.")
    
    query = "chicken"
    print(f"\nSearching for: {query}")
    results = idx.search(query, top_k=5)
    
    for i, row in results.iterrows():
        print(f"Match {i+1}: {row['Product_Name']} (Score: {row.get('search_score', 0)})")
    
    # Check vocabulary
    if hasattr(idx, "tfidf"):
        vocab = idx.tfidf.vocabulary_
        print(f"\nVocabulary size: {len(vocab)}")
        if "chicken" in vocab:
            print(f"'chicken' found in vocab! ID: {vocab['chicken']}")
        else:
            print("'chicken' NOT found in vocab!")
            # Print a few sample words from vocab
            sample = list(vocab.keys())[:20]
            print(f"Sample vocab: {sample}")

if __name__ == "__main__":
    test()

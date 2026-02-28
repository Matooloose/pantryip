# 🛒 Budget Grocery Finder

Find the most affordable groceries within your budget using ML-powered ranking and semantic search.

## Setup

```bash
pip install -r requirements.txt
```

## Train the model

```bash
python -m src.pipeline.train_pipeline
```

## Run the API

```bash
uvicorn src.api.main:app --reload
```

API docs available at: http://localhost:8000/docs

## Run tests

```bash
pytest tests/
```

## Project Structure

```
budget-grocery-app/
├── data/raw/               ← Put your CSV here
├── src/data/               ← Loader, cleaner, feature engineering
├── src/models/             ← Ranker, price predictor, search index
├── src/pipeline/           ← Train and inference orchestration
├── src/api/                ← FastAPI endpoints
├── models/                 ← Saved model artifacts (generated)
└── tests/                  ← Unit tests
```
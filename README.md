<div align="center">

# 🛒 PantryIQ

### *Beat food inflation with AI*

**Voice your meals → ML finds the best prices → Get your cheapest personalised basket**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python_ML-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Hugging Face](https://img.shields.io/badge/🤗_Qwen_72B-FFD21E?style=for-the-badge)](https://huggingface.co/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)

---

*An AI-powered grocery optimizer built for South African shoppers.*
*Speak your weekly meals, set a budget, and get an optimised basket across Pick n Pay & Shoprite — in seconds.*

</div>

---

## ✨ Features

🎤 **Voice-First Input** — Speak your meals naturally, no typing needed
🧠 **AI Meal Understanding** — Qwen 72B extracts structured ingredients from your voice
⚡ **Sub-Second ML Ranking** — Custom LightGBM + FAISS pipeline finds best-value products instantly
🏪 **Multi-Store Comparison** — Prices from Pick n Pay & Shoprite, side by side
💰 **Budget-Aware Baskets** — Stay within your budget with smart substitutions
📊 **Savings Breakdown** — See exactly how much you're saving per store

---

## 🔧 How It Works

```
    🎤 Voice Input          🧠 AI Extraction          ⚡ ML Ranking           🛒 Smart Basket
  ┌─────────────┐      ┌──────────────────┐      ┌────────────────┐      ┌────────────────┐
  │  "I make    │      │  Qwen 2.5-72B    │      │  FAISS search  │      │  Optimised     │
  │   pap and   │  ──▶ │  extracts meals,  │ ──▶  │  + LightGBM    │ ──▶  │  basket with   │
  │   chicken   │      │  ingredients &    │      │  value ranking │      │  savings &     │
  │   stew..."  │      │  quantities       │      │  (< 1 second)  │      │  alternatives  │
  └─────────────┘      └──────────────────┘      └────────────────┘      └────────────────┘
        ▲                                               │
   Web Speech API                              ML API (FastAPI)
   (browser-native)                         or Playwright scraping
                                               as fallback
```

---

## 🚀 Quick Start

### 1. Frontend (Next.js)

```bash
git clone <your-repo>
cd pantryiq
npm install

# Set up environment
cp .env.example .env
# Add your HF_TOKEN (Hugging Face API token)

npm run dev
# → http://localhost:3000
```

### 2. ML Backend (Python)

```bash
cd Model/budget-grocery-app
pip install -r requirements.txt
bash run_ml_api.sh
# → http://localhost:8000
```

> **Note:** The app works without the ML backend — it falls back to Playwright scraping + Qwen LLM optimisation. The ML backend just makes it **10× faster**.

---

## 🏗️ Tech Stack

<table>
<tr><td><b>🖥️ Frontend</b></td><td>Next.js 14 (App Router) · React 18 · TypeScript · Framer Motion · Zod</td></tr>
<tr><td><b>🧠 AI / LLM</b></td><td>Hugging Face Inference API · Qwen 2.5-72B-Instruct</td></tr>
<tr><td><b>⚡ ML Backend</b></td><td>Python FastAPI · scikit-learn · LightGBM · FAISS · sentence-transformers · MLflow</td></tr>
<tr><td><b>🕷️ Scraping</b></td><td>Playwright (Pick n Pay, Shoprite)</td></tr>
<tr><td><b>💾 Caching</b></td><td>Redis (optional, 6-hour TTL)</td></tr>
<tr><td><b>🎤 Voice</b></td><td>Web Speech API (browser-native, zero cost)</td></tr>
</table>

---

## 📂 Project Structure

```
app/
├── page.tsx                     # Main UI — voice → budget → results
├── api/
│   ├── process-voice/route.ts   # Qwen profile extraction
│   ├── generate-basket/route.ts # ML ranker → fallback: scrape + Qwen
│   └── backgrounds/route.ts     # Background slideshow images
components/
├── BackgroundSlideshow.tsx       # Rotating background visuals
└── Profile/
    ├── HistoryView.tsx           # Shopping history
    └── PreferencesModal.tsx      # User preferences & onboarding
lib/
├── huggingface.ts               # Qwen LLM client
├── ranker.ts                    # ML API client (fast path)
├── scrapers/                    # Playwright scrapers + Redis cache
│   ├── index.ts                 #   Orchestrator
│   ├── picknpay.ts              #   Pick n Pay
│   └── shoprite.ts              #   Shoprite
└── store/
    └── usePantryStore.ts        # Client-side state

Model/budget-grocery-app/        # 🐍 Python ML backend
├── src/api/                     # FastAPI endpoints
├── src/models/                  # LightGBM ranking model
├── src/data/                    # Data processing
├── src/pipeline/                # ML training pipeline
├── data/                        # Product datasets
└── notebooks/                   # Jupyter exploration
```

---

## 🎬 Demo Script

> **For judges — takes ~60 seconds**

| Step | Action | What happens |
|------|--------|-------------|
| **1** | Open app → pick household size (e.g. 4) | Welcome screen with voice prompt |
| **2** | Tap 🎤 and say: *"I make pap and chicken stew twice a week, spaghetti bolognese on weekends, and I always need rice, cooking oil, tomatoes, onions, and eggs."* | Waveform animation shows recording |
| **3** | Tap stop | Qwen extracts 4+ meals and 10+ ingredients in ~15s |
| **4** | Set budget to **R500** | Budget slider adjusts |
| **5** | Tap **"Find My Best Deals"** | ML ranker finds best products in <1s |
| **6** | Review basket | Optimised basket with savings total, store breakdown, and alternatives |

---

## 🗺️ Roadmap

- [ ] 🏪 Checkers + Woolworths scrapers
- [ ] 📈 Weekly price history charts
- [ ] 🔔 "Buy now" alerts when prices drop
- [ ] 💬 WhatsApp bot (no app download needed)
- [ ] 🥗 Nutrition scoring alongside price scoring
- [ ] 👥 Group shopping lists for communities

---

<div align="center">
<sub>Built with in South Africa</sub>
</div>

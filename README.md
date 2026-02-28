# PantryIQ 🛒

> AI-powered grocery optimizer for South African shoppers. Beat food inflation.

Voice your meals → AI scrapes Pick n Pay & Shoprite → Get your cheapest personalised basket.

---

## ⚡ Get running in 3 minutes

```bash
# 1. Clone & install
git clone <your-repo>
cd pantryiq
npm install

# 2. Set your API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Run
npm run dev
# Open http://localhost:3000
```

That's it. No database setup. No Docker. No Redis required (optional for caching).

---

## How it works

1. **Voice Input** — User speaks their meals using the browser's Web Speech API (no extra API needed)
2. **AI Profile Extraction** — Claude parses the transcript into structured meal + ingredient data
3. **Live Scraping** — Playwright workers scrape Pick n Pay and Shoprite product pages in parallel (with realistic mock fallback for demo stability)
4. **Basket Optimisation** — Claude selects the best value products within the user's budget, with savings calculations and alternatives

---

## Architecture

```
app/
├── page.tsx                    # Full UI - voice → budget → results
├── api/
│   ├── process-voice/route.ts  # Whisper + Claude profile extraction
│   └── generate-basket/route.ts # Scrape + Claude basket optimisation
lib/
├── claude.ts                   # AI client (profile extraction + basket optimisation)
├── scrapers/
│   ├── index.ts                # Orchestrator with Redis caching
│   ├── picknpay.ts             # Pick n Pay scraper + mock data
│   └── shoprite.ts             # Shoprite scraper + mock data
├── utils.ts                    # Shared utilities
types/
└── index.ts                    # Full TypeScript types
```

---

## Demo script (for judges)

1. Open the app → select household size (e.g. 4)
2. Tap the mic and say:
   > *"I make pap and chicken stew twice a week, spaghetti bolognese on weekends, and I always need rice, cooking oil, tomatoes, onions, and eggs."*
3. Tap stop → watch Claude extract 4 meals and 10+ ingredients instantly
4. Set budget to R500
5. Tap "Find My Best Deals" → live scraping across 2 stores
6. Show the optimised basket, savings total, and store breakdown

---

## Roadmap (post-hackathon)

- [ ] Checkers + Woolworths scrapers
- [ ] Weekly price history charts  
- [ ] "Buy now" alerts when items are cheaper than usual
- [ ] WhatsApp bot integration (no app download required)
- [ ] Nutrition scoring alongside price scoring
- [ ] Group shopping lists for communities

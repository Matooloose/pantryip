import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeAllRetailers, buildSearchTerms } from '@/lib/scrapers';
import { optimizeShoppingBasket } from '@/lib/huggingface';
import { recommendBasket, isMLApiReady } from '@/lib/ranker';
import { UserProfile, ShoppingBasket, BasketItem, Product } from '@/types';

const RequestSchema = z.object({
  profile: z.object({
    meals: z.array(z.object({
      name: z.string(),
      ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        category: z.string(),
        essential: z.boolean(),
      })),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
    })),
    dietary_preferences: z.array(z.string()),
    allergies: z.array(z.string()),
    household_size: z.number(),
    shopping_frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  }),
  budget: z.number().min(50).max(50000),
});

/**
 * Convert ML API recommendation response to PantryIQ ShoppingBasket format.
 */
function mlResultToBasket(mlResult: any, budget: number): ShoppingBasket {
  const items: BasketItem[] = (mlResult.basket || []).map((entry: any) => {
    const product = entry.best_match;
    if (!product) return null;

    const storeName = product.Brand?.toLowerCase().includes('shoprite') || product.Brand?.toLowerCase().includes('ritebrand')
      ? 'shoprite' : 'picknpay';
    return {
      ingredient: entry.query,
      recommended_product: {
        id: product.Sku || `ml-${entry.query}`,
        name: product.Product_Name,
        brand: product.Brand || '',
        price: product.Package_price,
        weight: 0,
        unit_price: product.price_per_100g,
        store: storeName as Product['store'],
        category: product.Sub_category || 'other',
        url: product.Product_URL || '',
        in_stock: true,
        scraped_at: new Date(),
      },
      quantity_needed: '1x',
      savings_vs_expensive: Math.max(0, (product.price_per_100g * 1.5 - product.price_per_100g) * 10),
      alternatives: (entry.alternatives || []).map((alt: any) => ({
        id: alt.Sku || `alt-${entry.query}`,
        name: alt.Product_Name,
        brand: alt.Brand || '',
        price: alt.Package_price,
        weight: 0,
        unit_price: alt.price_per_100g,
        store: (alt.Brand?.toLowerCase().includes('shoprite') || alt.Brand?.toLowerCase().includes('ritebrand')
          ? 'shoprite' : 'picknpay') as Product['store'],
        category: alt.Sub_category || 'other',
        url: alt.Product_URL || '',
        in_stock: true,
        scraped_at: new Date(),
      })),
    };
  }).filter(Boolean) as BasketItem[];

  const totalCost = mlResult.estimated_total || items.reduce((sum: number, item: BasketItem) => sum + item.recommended_product.price, 0);

  // Build store breakdown
  const storeBreakdown: Record<string, number> = {};
  items.forEach((item: BasketItem) => {
    const store = item.recommended_product.store;
    storeBreakdown[store] = (storeBreakdown[store] || 0) + item.recommended_product.price;
  });

  return {
    items,
    total_cost: totalCost,
    budget,
    budget_remaining: budget - totalCost,
    savings_total: items.reduce((sum: number, item: BasketItem) => sum + item.savings_vs_expensive, 0),
    store_breakdown: storeBreakdown,
    tips: [
      '💡 ML-optimised basket — prices ranked by value score',
      '🏷️ Look for yellow specials tags in-store for extra savings',
    ],
    optimization_method: 'ml_ranker',
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { profile, budget } = RequestSchema.parse(body);

    console.log('\n🚀 ══════════════════════════════════════════════════════');
    console.log('   GENERATE BASKET — Pipeline Started');
    console.log('══════════════════════════════════════════════════════\n');
    console.log(`  👤 Household size: ${profile.household_size}`);
    console.log(`  💰 Budget: R${budget}`);
    console.log(`  🍽  Meals detected: ${profile.meals.length}`);
    profile.meals.forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.name} (${m.frequency}) — ${m.ingredients.length} ingredients`);
    });

    // Step 1: Extract search terms
    console.log('\n── Step 1/3: Extracting search terms ──────────────────');
    const searchTerms = buildSearchTerms(profile.meals);
    console.log(`  🔍 Search terms: [${searchTerms.join(', ')}]`);

    if (searchTerms.length === 0) {
      console.log('  ❌ No search terms found — aborting');
      return NextResponse.json(
        { error: 'No ingredients found in profile' },
        { status: 400 }
      );
    }

    // Step 2: Try ML-based ranking first (fast path)
    console.log('\n── Step 2/3: Checking ML API availability ─────────────');
    const mlReady = await isMLApiReady();

    let basket: ShoppingBasket;
    let method: string;

    if (mlReady) {
      console.log('  ✅ ML API is available — using BudgetRanker');
      console.log('  ⚡ This should take < 1 second...');
      const mlStart = Date.now();

      const mlResult = await recommendBasket(searchTerms, budget);

      if (mlResult && mlResult.basket && mlResult.basket.length > 0) {
        const mlTime = ((Date.now() - mlStart) / 1000).toFixed(1);
        console.log(`  ✅ ML ranking complete in ${mlTime}s`);

        basket = mlResultToBasket(mlResult, budget);
        method = 'ml_ranker';
      } else {
        console.log('  ⚠️ ML API returned no results — falling back to Qwen');
        basket = await fallbackToQwen(searchTerms, profile as UserProfile, budget);
        method = 'qwen_llm_fallback';
      }
    } else {
      console.log('  ⚠️ ML API not available — using Qwen LLM');
      basket = await fallbackToQwen(searchTerms, profile as UserProfile, budget);
      method = 'qwen_llm';
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n════════════════════════════════════════════════════════');
    console.log('  🎉 BASKET GENERATED SUCCESSFULLY');
    console.log('════════════════════════════════════════════════════════');
    console.log(`  🛒 Items in basket: ${basket.items.length}`);
    console.log(`  💰 Total cost: R${basket.total_cost.toFixed(2)}`);
    console.log(`  💚 Savings: R${basket.savings_total.toFixed(2)}`);
    console.log(`  📉 Budget remaining: R${basket.budget_remaining.toFixed(2)}`);
    console.log(`  🏪 Stores: ${Object.keys(basket.store_breakdown).join(', ')}`);
    console.log(`  🤖 Method: ${method}`);
    console.log(`  ⏱  Total pipeline time: ${totalTime}s`);
    console.log('════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      basket,
      products_analyzed: basket.items.length,
      search_terms: searchTerms,
      optimization_method: method,
    });
  } catch (error) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('\n❌ ══════════════════════════════════════════════════════');
    console.error(`   PIPELINE FAILED after ${totalTime}s`);
    console.error('══════════════════════════════════════════════════════');
    console.error('  Error:', error instanceof Error ? error.message : error);
    console.error('══════════════════════════════════════════════════════\n');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Basket generation failed' },
      { status: 500 }
    );
  }
}

/**
 * Fallback: Scrape retailers + use Qwen LLM for optimization (original behavior).
 */
async function fallbackToQwen(searchTerms: string[], profile: UserProfile, budget: number): Promise<ShoppingBasket> {
  console.log('\n── Fallback: Scraping retailer prices ─────────────────');
  const scrapeStart = Date.now();
  const products = await scrapeAllRetailers(searchTerms);
  const scrapeTime = ((Date.now() - scrapeStart) / 1000).toFixed(1);
  console.log(`  ⏱  Scraping completed in ${scrapeTime}s`);
  console.log(`  📦 ${products.length} unique products available for optimization`);

  if (products.length === 0) {
    throw new Error('No products found from retailers');
  }

  console.log('\n── Fallback: AI basket optimization (Hugging Face) ────');
  console.log('  🤖 Sending to Qwen2.5-72B-Instruct...');
  console.log(`  📊 Optimizing ${products.length} products against ${searchTerms.length} ingredients`);
  console.log('  ⏳ This may take 10-30 seconds...');
  const aiStart = Date.now();
  const basket = await optimizeShoppingBasket(profile, products, budget);
  const aiTime = ((Date.now() - aiStart) / 1000).toFixed(1);
  console.log(`  ✅ AI optimization complete in ${aiTime}s`);

  return basket;
}

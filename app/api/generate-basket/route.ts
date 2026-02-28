import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeAllRetailers, buildSearchTerms } from '@/lib/scrapers';
import { optimizeShoppingBasket } from '@/lib/huggingface';
import { UserProfile } from '@/types';

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

    // Step 2: Scrape retailers
    console.log('\n── Step 2/3: Scraping retailer prices ─────────────────');
    const scrapeStart = Date.now();
    const products = await scrapeAllRetailers(searchTerms);
    const scrapeTime = ((Date.now() - scrapeStart) / 1000).toFixed(1);
    console.log(`  ⏱  Scraping completed in ${scrapeTime}s`);
    console.log(`  📦 ${products.length} unique products available for optimization`);

    if (products.length === 0) {
      console.log('  ❌ No products found — aborting');
      return NextResponse.json(
        { error: 'No products found from retailers' },
        { status: 503 }
      );
    }

    // Step 3: AI optimization
    console.log('\n── Step 3/3: AI basket optimization (Hugging Face) ────');
    console.log('  🤖 Sending to Qwen2.5-72B-Instruct...');
    console.log(`  📊 Optimizing ${products.length} products against ${searchTerms.length} ingredients`);
    console.log('  ⏳ This may take 10-30 seconds...');
    const aiStart = Date.now();
    const basket = await optimizeShoppingBasket(profile as UserProfile, products, budget);
    const aiTime = ((Date.now() - aiStart) / 1000).toFixed(1);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`  ✅ AI optimization complete in ${aiTime}s`);
    console.log('\n════════════════════════════════════════════════════════');
    console.log('  🎉 BASKET GENERATED SUCCESSFULLY');
    console.log('════════════════════════════════════════════════════════');
    console.log(`  🛒 Items in basket: ${basket.items.length}`);
    console.log(`  💰 Total cost: R${basket.total_cost.toFixed(2)}`);
    console.log(`  💚 Savings: R${basket.savings_total.toFixed(2)}`);
    console.log(`  📉 Budget remaining: R${basket.budget_remaining.toFixed(2)}`);
    console.log(`  🏪 Stores: ${Object.keys(basket.store_breakdown).join(', ')}`);
    console.log(`  ⏱  Total pipeline time: ${totalTime}s`);
    console.log('════════════════════════════════════════════════════════\n');

    return NextResponse.json({
      success: true,
      basket,
      products_analyzed: products.length,
      search_terms: searchTerms,
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

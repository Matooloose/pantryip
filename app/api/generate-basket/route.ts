import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { scrapeAllRetailers, buildSearchTerms } from '@/lib/scrapers';
import { optimizeShoppingBasket } from '@/lib/claude';
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
  try {
    const body = await req.json();
    const { profile, budget } = RequestSchema.parse(body);

    // Step 1: Extract search terms from all meal ingredients
    const searchTerms = buildSearchTerms(profile.meals);
    console.log('[generate-basket] Search terms:', searchTerms);

    if (searchTerms.length === 0) {
      return NextResponse.json(
        { error: 'No ingredients found in profile' },
        { status: 400 }
      );
    }

    // Step 2: Scrape all retailers in parallel
    console.log('[generate-basket] Scraping retailers...');
    const products = await scrapeAllRetailers(searchTerms);
    console.log(`[generate-basket] Found ${products.length} products`);

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found from retailers' },
        { status: 503 }
      );
    }

    // Step 3: Claude optimizes the basket within budget
    console.log('[generate-basket] Optimizing basket with Claude...');
    const basket = await optimizeShoppingBasket(profile as UserProfile, products, budget);

    return NextResponse.json({
      success: true,
      basket,
      products_analyzed: products.length,
      search_terms: searchTerms,
    });
  } catch (error) {
    console.error('[generate-basket] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Basket generation failed' },
      { status: 500 }
    );
  }
}

import Anthropic from '@anthropic-ai/sdk';
import { UserProfile, BasketItem, Product, ShoppingBasket } from '@/types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = 'claude-opus-4-6';

/**
 * Extracts structured meal and ingredient data from a voice transcript.
 * Returns a fully typed UserProfile with meals, ingredients, and preferences.
 */
export async function extractProfileFromTranscript(
  transcript: string,
  household_size: number = 1
): Promise<UserProfile> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are a dietary analysis expert. Extract structured meal and ingredient data from a user's spoken description of their cooking habits. 
    
    Return ONLY valid JSON with this exact structure:
    {
      "meals": [
        {
          "name": "meal name",
          "ingredients": [
            { "name": "ingredient", "quantity": "500g", "category": "protein|vegetable|grain|dairy|condiment|other", "essential": true }
          ],
          "frequency": "daily|weekly|monthly"
        }
      ],
      "dietary_preferences": ["string"],
      "allergies": ["string"],
      "household_size": number,
      "shopping_frequency": "weekly|biweekly|monthly"
    }
    
    Be practical and thorough. Infer South African context (pap, braai, etc.). If quantity not specified, infer reasonable amounts for the household size.`,
    messages: [
      {
        role: 'user',
        content: `Household size: ${household_size} people.\n\nTranscript: "${transcript}"\n\nExtract the meal profile as JSON.`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const profile = JSON.parse(jsonMatch[0]) as UserProfile;
    profile.household_size = household_size;
    return profile;
  } catch {
    throw new Error(`Failed to parse Claude response: ${text}`);
  }
}

/**
 * Takes scraped products and a user profile, returns an optimized shopping basket
 * that stays within budget and matches user preferences.
 */
export async function optimizeShoppingBasket(
  profile: UserProfile,
  products: Product[],
  budget: number
): Promise<ShoppingBasket> {
  const productCatalog = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    price: p.price,
    weight: p.weight,
    unit_price: p.unit_price,
    store: p.store,
    category: p.category,
  }));

  const allIngredients = profile.meals.flatMap((m) => m.ingredients);
  const uniqueIngredients = Array.from(
    new Map(allIngredients.map((i) => [i.name.toLowerCase(), i])).values()
  );

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: `You are a smart shopping optimization engine for South African consumers. 
    
    Given a list of needed ingredients and available products from Pick n Pay, Shoprite, and Checkers, build the most cost-effective shopping basket.
    
    Rules:
    1. Prioritize best value (lowest unit price) while respecting brand preferences
    2. Do NOT exceed the budget
    3. For each ingredient, pick 1 recommended product and 1-2 alternatives
    4. Calculate exact savings vs choosing the most expensive option
    5. Generate practical shopping tips for the user
    
    Return ONLY valid JSON:
    {
      "items": [
        {
          "ingredient": "string",
          "recommended_product_id": "string",
          "alternative_product_ids": ["string"],
          "quantity_needed": "string",
          "savings_vs_expensive": number
        }
      ],
      "total_cost": number,
      "tips": ["tip1", "tip2", "tip3"]
    }`,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          budget_zar: budget,
          needed_ingredients: uniqueIngredients,
          available_products: productCatalog,
          household_size: profile.household_size,
          shopping_frequency: profile.shopping_frequency,
        }),
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const raw = JSON.parse(jsonMatch[0]);

    const productMap = new Map(products.map((p) => [p.id, p]));

    const items: BasketItem[] = raw.items
      .filter((item: any) => productMap.has(item.recommended_product_id))
      .map((item: any) => ({
        ingredient: item.ingredient,
        recommended_product: productMap.get(item.recommended_product_id)!,
        alternatives: (item.alternative_product_ids || [])
          .filter((id: string) => productMap.has(id))
          .map((id: string) => productMap.get(id)!),
        quantity_needed: item.quantity_needed,
        savings_vs_expensive: item.savings_vs_expensive || 0,
      }));

    const total_cost = items.reduce((sum, i) => sum + i.recommended_product.price, 0);

    const store_breakdown = items.reduce(
      (acc, item) => {
        const store = item.recommended_product.store;
        acc[store] = (acc[store] || 0) + item.recommended_product.price;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      items,
      total_cost,
      budget,
      savings_total: items.reduce((sum, i) => sum + i.savings_vs_expensive, 0),
      budget_remaining: budget - total_cost,
      store_breakdown,
      generated_at: new Date(),
      tips: raw.tips || [],
    };
  } catch {
    throw new Error(`Failed to parse basket response: ${text}`);
  }
}

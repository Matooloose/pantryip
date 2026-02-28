import { UserProfile, BasketItem, Product, ShoppingBasket } from '@/types';

const HF_TOKEN = process.env.HF_TOKEN;
const API_URL = 'https://router.huggingface.co/v1/chat/completions';
const MODEL = 'Qwen/Qwen2.5-72B-Instruct';

/**
 * Calls Hugging Face Inference API directly via fetch.
 * Includes 60s timeout and 1 retry on failure.
 */
async function chatCompletion(
    systemPrompt: string,
    userMessage: string,
    maxTokens: number = 2048
): Promise<string> {
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 60000; // 60 seconds

    const requestBody = JSON.stringify({
        model: MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
    });

    console.log(`  [HF] Request size: ${(requestBody.length / 1024).toFixed(1)}KB, max_tokens: ${maxTokens}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            console.log(`  [HF] Attempt ${attempt}/${MAX_RETRIES} — calling ${MODEL}...`);
            const startTime = Date.now();

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${HF_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: requestBody,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`  [HF] ❌ API error (${response.status}) after ${elapsed}s: ${errorBody.substring(0, 200)}`);
                if (attempt < MAX_RETRIES) {
                    console.log(`  [HF] Retrying in 2s...`);
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }
                throw new Error(`Hugging Face API error (${response.status}): ${errorBody}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content ?? '';
            console.log(`  [HF] ✅ Response received in ${elapsed}s (${text.length} chars)`);
            return text;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.error(`  [HF] ⏰ Request timed out after ${TIMEOUT_MS / 1000}s`);
            } else {
                console.error(`  [HF] ❌ Fetch error: ${err.message}`);
            }
            if (attempt < MAX_RETRIES) {
                console.log(`  [HF] Retrying in 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }
            throw err;
        }
    }

    throw new Error('All retry attempts exhausted');
}

/**
 * Extracts structured meal and ingredient data from a voice transcript.
 * Returns a fully typed UserProfile with meals, ingredients, and preferences.
 */
export async function extractProfileFromTranscript(
    transcript: string,
    household_size: number = 1
): Promise<UserProfile> {
    const systemPrompt = `You are a dietary analysis expert. Extract structured meal and ingredient data from a user's spoken description of their cooking habits. 
    
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
    
    Be practical and thorough. Infer South African context (pap, braai, etc.). If quantity not specified, infer reasonable amounts for the household size.`;

    const userMessage = `Household size: ${household_size} people.\n\nTranscript: "${transcript}"\n\nExtract the meal profile as JSON.`;

    const text = await chatCompletion(systemPrompt, userMessage);

    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        const profile = JSON.parse(jsonMatch[0]) as UserProfile;
        profile.household_size = household_size;
        return profile;
    } catch {
        throw new Error(`Failed to parse model response: ${text}`);
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

    const systemPrompt = `You are a smart shopping optimization engine for South African consumers. 
    
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
    }`;

    const userMessage = JSON.stringify({
        budget_zar: budget,
        needed_ingredients: uniqueIngredients,
        available_products: productCatalog,
        household_size: profile.household_size,
        shopping_frequency: profile.shopping_frequency,
    });

    const text = await chatCompletion(systemPrompt, userMessage, 4096);

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

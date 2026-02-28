/**
 * lib/ranker.ts — ML-powered product ranking via the Python Budget Grocery API.
 *
 * Calls the Python FastAPI backend for ML-based product search and ranking,
 * replacing the slow Qwen 72B LLM optimisation step.
 *
 * Falls back gracefully if the ML API is unavailable.
 */

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

interface MLProduct {
    Product_Name: string;
    Brand: string;
    Sub_category: string;
    Package_price: number;
    price_per_100g: number;
    discount_pct: number;
    value_score: number;
    is_special: number;
    city?: string;
    state?: string;
    Product_URL?: string;
}

interface MLRecommendation {
    basket: Array<{
        item: string;
        product: MLProduct;
    }>;
    estimated_total: number;
    within_budget: boolean;
}

/**
 * Search for products by query using the ML API.
 */
export async function searchProducts(
    query: string,
    budget: number,
    maxResults: number = 10,
): Promise<MLProduct[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const res = await fetch(`${ML_API_URL}/api/v1/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                budget,
                max_results: maxResults,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`ML API returned ${res.status}`);
        }

        const data = await res.json();
        return data.results || [];
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Get a full basket recommendation using the ML API.
 * This replaces the Qwen LLM optimisation step.
 */
export async function recommendBasket(
    items: string[],
    totalBudget: number,
    city?: string,
): Promise<MLRecommendation | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    try {
        const res = await fetch(`${ML_API_URL}/api/v1/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items,
                total_budget: totalBudget,
                city: city || undefined,
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`ML API returned ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.warn('⚠️ ML API unavailable, will fall back to LLM:', err instanceof Error ? err.message : err);
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Check if the ML API is healthy and ready to serve requests.
 */
export async function isMLApiReady(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${ML_API_URL}/`, { signal: controller.signal });
        clearTimeout(timeout);

        return res.ok;
    } catch {
        return false;
    }
}

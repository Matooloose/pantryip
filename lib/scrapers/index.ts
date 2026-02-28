import { createClient } from 'redis';
import { Product, ScrapeResult } from '@/types';
import { scrapePicknPay } from './picknpay';
import { scrapeShoprite } from './shoprite';

const CACHE_TTL_SECONDS = 60 * 60 * 6; // 6 hours

let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedis() {
  if (!redisClient) {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      await redisClient.connect();
    } catch {
      redisClient = null; // Redis optional — degrade gracefully
    }
  }
  return redisClient;
}

async function getCached(key: string): Promise<Product[] | null> {
  try {
    const redis = await getRedis();
    if (!redis) return null;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: Product[]): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) return;
    await redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(data));
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Scrapes all configured retailers in parallel for a given ingredient query.
 * Results are cached per query to avoid hammering retailer sites.
 */
export async function scrapeAllRetailers(ingredients: string[]): Promise<Product[]> {
  const allProducts: Product[] = [];

  // Run all queries in parallel across all stores
  const tasks = ingredients.flatMap((ingredient) => [
    scrapeWithCache(ingredient, 'picknpay', scrapePicknPay),
    scrapeWithCache(ingredient, 'shoprite', scrapeShoprite),
  ]);

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allProducts.push(...result.value);
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

async function scrapeWithCache(
  query: string,
  store: string,
  scraper: (q: string) => Promise<Product[]>
): Promise<Product[]> {
  const cacheKey = `pantryiq:scrape:${store}:${query.toLowerCase().trim()}`;

  const cached = await getCached(cacheKey);
  if (cached) return cached;

  const products = await scraper(query);
  await setCache(cacheKey, products);
  return products;
}

/**
 * Extracts unique ingredient search terms from meal profile.
 */
export function buildSearchTerms(meals: { ingredients: { name: string }[] }[]): string[] {
  const terms = new Set<string>();
  for (const meal of meals) {
    for (const ingredient of meal.ingredients) {
      // Normalize: "chicken breast" → "chicken", "brown onions" → "onion"
      const normalized = ingredient.name.toLowerCase()
        .replace(/\b(fresh|frozen|dried|chopped|diced|sliced|large|small|medium)\b/g, '')
        .replace(/s$/, '') // rough singularize
        .trim()
        .split(' ')[0]; // take first word as primary search term
      if (normalized.length > 2) terms.add(normalized);
    }
  }
  return Array.from(terms);
}

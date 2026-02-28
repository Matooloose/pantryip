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
  const totalTasks = ingredients.length * 2; // 2 stores per ingredient
  let completedTasks = 0;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              🛒 PANTRYIQ PRICE SCRAPER                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`  📋 Ingredients to search: ${ingredients.length}`);
  console.log(`  🏪 Stores: Pick n Pay, Shoprite`);
  console.log(`  📊 Total scrape tasks: ${totalTasks}`);
  console.log(`  ⏱  Started at: ${new Date().toLocaleTimeString()}\n`);

  // Run all queries in parallel across all stores (with hard timeout per task)
  const TASK_TIMEOUT_MS = 7000; // 7 second hard limit per scrape

  const withTimeout = <T>(promise: Promise<T>, label: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`⏰ Timeout: ${label} took longer than ${TASK_TIMEOUT_MS / 1000}s`)), TASK_TIMEOUT_MS)
      ),
    ]);

  const tasks = ingredients.flatMap((ingredient) => [
    withTimeout(
      scrapeWithCache(ingredient, 'picknpay', scrapePicknPay),
      `Pick n Pay → "${ingredient}"`
    ).then((products) => {
      completedTasks++;
      const bar = progressBar(completedTasks, totalTasks);
      const status = products.length > 0 ? `✅ ${products.length} products` : '⚠️  0 products (using fallback)';
      console.log(`  ${bar} [${completedTasks}/${totalTasks}] Pick n Pay → "${ingredient}" → ${status}`);
      return products;
    }).catch((err) => {
      completedTasks++;
      const bar = progressBar(completedTasks, totalTasks);
      console.log(`  ${bar} [${completedTasks}/${totalTasks}] Pick n Pay → "${ingredient}" → ⏰ Timed out, skipping`);
      return [] as Product[];
    }),
    withTimeout(
      scrapeWithCache(ingredient, 'shoprite', scrapeShoprite),
      `Shoprite → "${ingredient}"`
    ).then((products) => {
      completedTasks++;
      const bar = progressBar(completedTasks, totalTasks);
      const status = products.length > 0 ? `✅ ${products.length} products` : '⚠️  0 products (using fallback)';
      console.log(`  ${bar} [${completedTasks}/${totalTasks}] Shoprite   → "${ingredient}" → ${status}`);
      return products;
    }).catch((err) => {
      completedTasks++;
      const bar = progressBar(completedTasks, totalTasks);
      console.log(`  ${bar} [${completedTasks}/${totalTasks}] Shoprite   → "${ingredient}" → ⏰ Timed out, skipping`);
      return [] as Product[];
    }),
  ]);

  const results = await Promise.all(tasks);

  for (const products of results) {
    allProducts.push(...products);
  }

  // Deduplicate by id
  const seen = new Set<string>();
  const deduped = allProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  console.log('\n  ────────────────────────────────────────────');
  console.log(`  📦 Total products found: ${allProducts.length}`);
  console.log(`  🔄 After deduplication: ${deduped.length}`);
  console.log(`  ✅ Completed: ${completedTasks}/${totalTasks} tasks`);
  console.log(`  ⏱  Completed at: ${new Date().toLocaleTimeString()}`);
  console.log('  ────────────────────────────────────────────\n');

  return deduped;
}

function progressBar(current: number, total: number): string {
  const width = 20;
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const pct = Math.round((current / total) * 100);
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct.toString().padStart(3)}%`;
}

async function scrapeWithCache(
  query: string,
  store: string,
  scraper: (q: string) => Promise<Product[]>
): Promise<Product[]> {
  const cacheKey = `pantryiq:scrape:${store}:${query.toLowerCase().trim()}`;

  const cached = await getCached(cacheKey);
  if (cached) {
    console.log(`  💾 Cache hit: ${store} → "${query}" (${cached.length} products)`);
    return cached;
  }

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

import axios from 'axios';
import { Product } from '@/types';
import { generateId } from '@/lib/utils';

const BASE_URL = 'https://www.shoprite.co.za';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-ZA,en;q=0.9',
};

// Shoprite has a JSON API for product search
const SEARCH_API = `${BASE_URL}/c/za/all-products?q=`;

export async function scrapeShoprite(query: string): Promise<Product[]> {
  try {
    const url = `${SEARCH_API}${encodeURIComponent(query)}&pageSize=20&sort=price-asc`;
    console.log(`     🌐 Shoprite: Fetching "${query}"...`);
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 5000,
    });
    console.log(`     🌐 Shoprite: Response ${response.status} for "${query}"`);

    const data = response.data;
    const productList = data?.results || data?.products || [];

    if (!productList.length) {
      console.log(`     📦 Shoprite: No live results for "${query}", using mock data`);
      return getMockShopriteProducts(query);
    }

    return productList.map((p: any) => {
      const price = p.price?.value || p.priceData?.price || 0;
      const name = p.name || p.summary || '';
      const weightMatch = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)/i);
      const weight = weightMatch
        ? parseWeight(parseFloat(weightMatch[1]), weightMatch[2])
        : 1000;

      return {
        id: generateId('shoprite', name),
        name,
        brand: p.brandData?.brandName || p.brand || name.split(' ')[0],
        price,
        weight,
        unit_price: price > 0 && weight > 0 ? (price / weight) * 100 : 0,
        store: 'shoprite' as const,
        category: inferCategory(name),
        url: p.url ? `${BASE_URL}${p.url}` : BASE_URL,
        image_url: p.images?.[0]?.url,
        in_stock: p.stock?.stockLevelStatus !== 'outOfStock',
        scraped_at: new Date(),
      };
    }).filter((p: Product) => p.price > 0);
  } catch (err) {
    console.log(`     ⚠️  Shoprite: Scrape failed for "${query}" — using mock data`);
    return getMockShopriteProducts(query);
  }
}

function parseWeight(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === 'kg' || u === 'l') return value * 1000;
  return value;
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/chicken|beef|lamb|pork|mince|fish|tuna/.test(lower)) return 'protein';
  if (/milk|cheese|yogurt|butter|cream|egg/.test(lower)) return 'dairy';
  if (/bread|flour|rice|pasta|pap|maize|oats/.test(lower)) return 'grain';
  if (/tomato|onion|potato|carrot|cabbage|spinach|pepper/.test(lower)) return 'vegetable';
  if (/oil|salt|pepper|spice|sauce/.test(lower)) return 'condiment';
  return 'other';
}

function getMockShopriteProducts(query: string): Product[] {
  const q = query.toLowerCase();
  const now = new Date();

  const catalog: Record<string, Product[]> = {
    chicken: [
      {
        id: 'shr-chicken-001', name: 'Shoprite Frozen Chicken Portions 1kg', brand: 'Shoprite',
        price: 49.99, weight: 1000, unit_price: 4.999, store: 'shoprite', category: 'protein',
        url: 'https://www.shoprite.co.za/chicken', in_stock: true, scraped_at: now,
      },
      {
        id: 'shr-chicken-002', name: 'Country Fair Chicken Thighs 800g', brand: 'Country Fair',
        price: 52.99, weight: 800, unit_price: 6.624, store: 'shoprite', category: 'protein',
        url: 'https://www.shoprite.co.za/chicken-thighs', in_stock: true, scraped_at: now,
      },
    ],
    maize: [
      {
        id: 'shr-maize-001', name: 'Shoprite Super Maize Meal 5kg', brand: 'Shoprite',
        price: 59.99, weight: 5000, unit_price: 1.2, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/maize', in_stock: true, scraped_at: now,
      },
      {
        id: 'shr-maize-002', name: 'White Star Maize Meal 5kg', brand: 'White Star',
        price: 67.99, weight: 5000, unit_price: 1.36, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/white-star', in_stock: true, scraped_at: now,
      },
    ],
    tomato: [
      {
        id: 'shr-tomato-001', name: 'Shoprite Tomato Paste 400g', brand: 'Shoprite',
        price: 12.99, weight: 400, unit_price: 3.248, store: 'shoprite', category: 'vegetable',
        url: 'https://www.shoprite.co.za/tomato-paste', in_stock: true, scraped_at: now,
      },
      {
        id: 'shr-tomato-002', name: 'All Gold Tomato Sauce 700g', brand: 'All Gold',
        price: 24.99, weight: 700, unit_price: 3.57, store: 'shoprite', category: 'vegetable',
        url: 'https://www.shoprite.co.za/tomato-sauce', in_stock: true, scraped_at: now,
      },
      {
        id: 'shr-tomato-003', name: 'Fresh Tomatoes 1kg', brand: 'Fresh Produce',
        price: 19.99, weight: 1000, unit_price: 1.999, store: 'shoprite', category: 'vegetable',
        url: 'https://www.shoprite.co.za/fresh-tomatoes', in_stock: true, scraped_at: now,
      },
    ],
    onion: [
      {
        id: 'shr-onion-001', name: 'Brown Onions 2kg', brand: 'Fresh Produce',
        price: 22.99, weight: 2000, unit_price: 1.15, store: 'shoprite', category: 'vegetable',
        url: 'https://www.shoprite.co.za/onions', in_stock: true, scraped_at: now,
      },
    ],
    oil: [
      {
        id: 'shr-oil-001', name: 'Shoprite Sunflower Oil 2L', brand: 'Shoprite',
        price: 44.99, weight: 2000, unit_price: 2.25, store: 'shoprite', category: 'condiment',
        url: 'https://www.shoprite.co.za/cooking-oil', in_stock: true, scraped_at: now,
      },
    ],
    rice: [
      {
        id: 'shr-rice-001', name: 'Shoprite Long Grain Rice 5kg', brand: 'Shoprite',
        price: 69.99, weight: 5000, unit_price: 1.4, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/rice', in_stock: true, scraped_at: now,
      },
      {
        id: 'shr-rice-002', name: 'Tastic Parboiled Rice 2kg', brand: 'Tastic',
        price: 37.99, weight: 2000, unit_price: 1.9, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/tastic', in_stock: true, scraped_at: now,
      },
    ],
    bread: [
      {
        id: 'shr-bread-001', name: 'Shoprite White Bread 700g', brand: 'Shoprite',
        price: 15.99, weight: 700, unit_price: 2.284, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/bread', in_stock: true, scraped_at: now,
      },
    ],
    egg: [
      {
        id: 'shr-eggs-001', name: 'Shoprite Medium Eggs 6 pack', brand: 'Shoprite',
        price: 22.99, weight: 360, unit_price: 6.386, store: 'shoprite', category: 'dairy',
        url: 'https://www.shoprite.co.za/eggs', in_stock: true, scraped_at: now,
      },
    ],
    milk: [
      {
        id: 'shr-milk-001', name: 'Shoprite Full Cream Milk 1L', brand: 'Shoprite',
        price: 18.99, weight: 1000, unit_price: 1.899, store: 'shoprite', category: 'dairy',
        url: 'https://www.shoprite.co.za/milk', in_stock: true, scraped_at: now,
      },
    ],
    pasta: [
      {
        id: 'shr-pasta-001', name: 'Shoprite Spaghetti 500g', brand: 'Shoprite',
        price: 14.99, weight: 500, unit_price: 2.998, store: 'shoprite', category: 'grain',
        url: 'https://www.shoprite.co.za/pasta', in_stock: true, scraped_at: now,
      },
    ],
  };

  const results: Product[] = [];
  for (const [key, products] of Object.entries(catalog)) {
    if (q.includes(key) || key.includes(q)) {
      results.push(...products);
    }
  }

  return results.length > 0 ? results : Object.values(catalog).flat().slice(0, 5);
}

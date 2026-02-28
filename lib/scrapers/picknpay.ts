import axios from 'axios';
import * as cheerio from 'cheerio';
import { Product } from '@/types';
import { generateId } from '@/lib/utils';

const BASE_URL = 'https://www.picknpay.co.za';
const SEARCH_URL = `${BASE_URL}/search?q=`;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-ZA,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
};

export async function scrapePicknPay(query: string): Promise<Product[]> {
  try {
    const url = `${SEARCH_URL}${encodeURIComponent(query)}`;
    console.log(`     🌐 PnP: Fetching "${query}"...`);
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 5000,
    });
    console.log(`     🌐 PnP: Response ${response.status} for "${query}"`);

    const $ = cheerio.load(response.data);
    const products: Product[] = [];

    // PnP uses product card structure
    $('[data-testid="product-card"], .product-card, [class*="ProductCard"]').each((_, el) => {
      try {
        const name = $(el).find('[class*="name"], [class*="title"], h3').first().text().trim();
        const priceText = $(el).find('[class*="price"], [class*="Price"]').first().text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        const href = $(el).find('a').attr('href') || '';
        const image = $(el).find('img').attr('src') || '';

        if (!name || isNaN(price) || price <= 0) return;

        // Extract weight from product name e.g. "Chicken 1kg" → 1000g
        const weightMatch = name.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)/i);
        const weight = weightMatch
          ? parseWeight(parseFloat(weightMatch[1]), weightMatch[2])
          : 1000;

        products.push({
          id: generateId('pnp', name),
          name,
          brand: extractBrand(name),
          price,
          weight,
          unit_price: (price / weight) * 100,
          store: 'picknpay',
          category: inferCategory(name),
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          image_url: image,
          in_stock: true,
          scraped_at: new Date(),
        });
      } catch {
        // Skip malformed product
      }
    });

    // If live scraping yields results, great. Otherwise fall back to mock data.
    if (products.length > 0) {
      console.log(`     ✅ PnP: Scraped ${products.length} live products for "${query}"`);
      return products;
    }
    console.log(`     📦 PnP: No live results for "${query}", using mock data`);
    return getMockPicknPayProducts(query);
  } catch (err) {
    console.log(`     ⚠️  PnP: Scrape failed for "${query}" — using mock data`);
    return getMockPicknPayProducts(query);
  }
}

function parseWeight(value: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u === 'kg') return value * 1000;
  if (u === 'l') return value * 1000;
  if (u === 'g' || u === 'ml') return value;
  return 1000;
}

function extractBrand(name: string): string {
  const brands = [
    'Clover', 'Parmalat', 'Woolworths', 'Sasko', 'Albany', 'Spar',
    'Pick n Pay', 'PnP', 'Knorr', 'Ina Paarman', 'Koo', 'All Gold',
    'Rhodes', 'Bull Brand', 'Checkers', 'Shoprite', 'Fatti\'s & Moni\'s',
  ];
  for (const brand of brands) {
    if (name.toLowerCase().includes(brand.toLowerCase())) return brand;
  }
  return name.split(' ')[0];
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/chicken|beef|lamb|pork|mince|fish|tuna|sardine/.test(lower)) return 'protein';
  if (/milk|cheese|yogurt|butter|cream|egg/.test(lower)) return 'dairy';
  if (/bread|flour|rice|pasta|pap|maize|oats/.test(lower)) return 'grain';
  if (/tomato|onion|potato|carrot|cabbage|spinach|pepper|vegetable/.test(lower)) return 'vegetable';
  if (/apple|banana|orange|fruit/.test(lower)) return 'fruit';
  if (/oil|salt|pepper|spice|sauce|ketchup|mayonnaise/.test(lower)) return 'condiment';
  if (/tea|coffee|juice|drink|cola|water/.test(lower)) return 'beverage';
  return 'other';
}

function getMockPicknPayProducts(query: string): Product[] {
  const q = query.toLowerCase();
  const now = new Date();

  const catalog: Record<string, Product[]> = {
    chicken: [
      {
        id: 'pnp-chicken-001', name: 'Country Fair Frozen Chicken Portions 1kg', brand: 'Country Fair',
        price: 54.99, weight: 1000, unit_price: 5.499, store: 'picknpay', category: 'protein',
        url: 'https://www.picknpay.co.za/chicken', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-chicken-002', name: 'PnP Chicken Breast Fillets 600g', brand: 'Pick n Pay',
        price: 69.99, weight: 600, unit_price: 11.665, store: 'picknpay', category: 'protein',
        url: 'https://www.picknpay.co.za/chicken-breast', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-chicken-003', name: 'Rainbow Frozen Whole Chicken 1.5kg', brand: 'Rainbow',
        price: 79.99, weight: 1500, unit_price: 5.333, store: 'picknpay', category: 'protein',
        url: 'https://www.picknpay.co.za/whole-chicken', in_stock: true, scraped_at: now,
      },
    ],
    maize: [
      {
        id: 'pnp-maize-001', name: 'White Star Super Maize Meal 5kg', brand: 'White Star',
        price: 69.99, weight: 5000, unit_price: 1.4, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/maize', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-maize-002', name: 'Iwisa No. 1 Super Maize Meal 5kg', brand: 'Iwisa',
        price: 64.99, weight: 5000, unit_price: 1.3, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/iwisa', in_stock: true, scraped_at: now,
      },
    ],
    tomato: [
      {
        id: 'pnp-tomato-001', name: 'All Gold Tomato Paste 400g', brand: 'All Gold',
        price: 16.99, weight: 400, unit_price: 4.248, store: 'picknpay', category: 'vegetable',
        url: 'https://www.picknpay.co.za/tomato-paste', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-tomato-002', name: 'Rhodes Tomato Puree 410g', brand: 'Rhodes',
        price: 14.99, weight: 410, unit_price: 3.656, store: 'picknpay', category: 'vegetable',
        url: 'https://www.picknpay.co.za/tomato-puree', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-tomato-003', name: 'Fresh Tomatoes 1kg', brand: 'Fresh Produce',
        price: 24.99, weight: 1000, unit_price: 2.499, store: 'picknpay', category: 'vegetable',
        url: 'https://www.picknpay.co.za/fresh-tomatoes', in_stock: true, scraped_at: now,
      },
    ],
    onion: [
      {
        id: 'pnp-onion-001', name: 'Brown Onions 1.5kg bag', brand: 'Fresh Produce',
        price: 18.99, weight: 1500, unit_price: 1.266, store: 'picknpay', category: 'vegetable',
        url: 'https://www.picknpay.co.za/onions', in_stock: true, scraped_at: now,
      },
    ],
    oil: [
      {
        id: 'pnp-oil-001', name: 'Canola Cooking Oil 2L', brand: 'Sunshine D',
        price: 49.99, weight: 2000, unit_price: 2.5, store: 'picknpay', category: 'condiment',
        url: 'https://www.picknpay.co.za/cooking-oil', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-oil-002', name: 'Sunflower Oil 750ml', brand: 'Oryx',
        price: 29.99, weight: 750, unit_price: 4.0, store: 'picknpay', category: 'condiment',
        url: 'https://www.picknpay.co.za/sunflower-oil', in_stock: true, scraped_at: now,
      },
    ],
    rice: [
      {
        id: 'pnp-rice-001', name: 'Tastic Rice 2kg', brand: 'Tastic',
        price: 39.99, weight: 2000, unit_price: 2.0, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/rice', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-rice-002', name: 'PnP Long Grain White Rice 5kg', brand: 'Pick n Pay',
        price: 79.99, weight: 5000, unit_price: 1.6, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/rice-5kg', in_stock: true, scraped_at: now,
      },
    ],
    bread: [
      {
        id: 'pnp-bread-001', name: 'Albany Superior White Bread 700g', brand: 'Albany',
        price: 18.99, weight: 700, unit_price: 2.713, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/bread', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-bread-002', name: 'Sasko White Bread 700g', brand: 'Sasko',
        price: 17.99, weight: 700, unit_price: 2.57, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/sasko-bread', in_stock: true, scraped_at: now,
      },
    ],
    egg: [
      {
        id: 'pnp-eggs-001', name: 'Nulaid Large Eggs 6 pack', brand: 'Nulaid',
        price: 27.99, weight: 360, unit_price: 7.775, store: 'picknpay', category: 'dairy',
        url: 'https://www.picknpay.co.za/eggs', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-eggs-002', name: 'PnP Free Range Eggs 12 pack', brand: 'Pick n Pay',
        price: 59.99, weight: 720, unit_price: 8.332, store: 'picknpay', category: 'dairy',
        url: 'https://www.picknpay.co.za/free-range-eggs', in_stock: true, scraped_at: now,
      },
    ],
    milk: [
      {
        id: 'pnp-milk-001', name: 'Clover Full Cream Milk 1L', brand: 'Clover',
        price: 21.99, weight: 1000, unit_price: 2.199, store: 'picknpay', category: 'dairy',
        url: 'https://www.picknpay.co.za/milk', in_stock: true, scraped_at: now,
      },
      {
        id: 'pnp-milk-002', name: 'Parmalat Full Cream Milk 2L', brand: 'Parmalat',
        price: 38.99, weight: 2000, unit_price: 1.95, store: 'picknpay', category: 'dairy',
        url: 'https://www.picknpay.co.za/parmalat-milk', in_stock: true, scraped_at: now,
      },
    ],
    pasta: [
      {
        id: 'pnp-pasta-001', name: "Fatti's & Moni's Spaghetti 500g", brand: "Fatti's & Moni's",
        price: 19.99, weight: 500, unit_price: 4.0, store: 'picknpay', category: 'grain',
        url: 'https://www.picknpay.co.za/pasta', in_stock: true, scraped_at: now,
      },
    ],
  };

  // Find matching products
  const results: Product[] = [];
  for (const [key, products] of Object.entries(catalog)) {
    if (q.includes(key) || key.includes(q)) {
      results.push(...products);
    }
  }

  // If no direct match, return a generic assortment
  if (results.length === 0) {
    return Object.values(catalog).flat().slice(0, 5);
  }

  return results;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;          // ZAR
  weight: number;         // grams
  unit_price: number;     // price per 100g
  store: 'picknpay' | 'shoprite' | 'checkers' | 'woolworths';
  category: string;
  url: string;
  image_url?: string;
  in_stock: boolean;
  scraped_at: Date;
}

export interface Ingredient {
  name: string;
  quantity: string;
  category: string;
  essential: boolean;
}

export interface Meal {
  name: string;
  ingredients: Ingredient[];
  frequency: 'daily' | 'weekly' | 'monthly';
}

export interface UserProfile {
  meals: Meal[];
  dietary_preferences: string[];
  allergies: string[];
  household_size: number;
  shopping_frequency: 'weekly' | 'biweekly' | 'monthly';
}

export interface BasketItem {
  ingredient: string;
  recommended_product: Product;
  alternatives: Product[];
  quantity_needed: string;
  savings_vs_expensive: number;  // ZAR saved vs most expensive option
}

export interface ShoppingBasket {
  items: BasketItem[];
  total_cost: number;
  budget: number;
  savings_total: number;
  budget_remaining: number;
  store_breakdown: Record<string, number>;
  generated_at?: Date;
  tips: string[];
  optimization_method?: 'ml_ranker' | 'qwen_llm' | 'qwen_llm_fallback';
}

export interface ScrapeResult {
  products: Product[];
  store: Product['store'];
  query: string;
  scraped_at: Date;
  cached: boolean;
}

export interface VoiceProcessingResult {
  transcript: string;
  profile: UserProfile;
  confidence: number;
}
export interface SavedBasket {
  id: string;
  basket: ShoppingBasket;
  name?: string;
  saved_at: Date;
}

export interface UserAccount {
  id: string;
  profile: UserProfile;
  history: SavedBasket[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    default_currency: string;
    show_alternatives: boolean;
    is_onboarded: boolean;
  };
  name?: string;
  password?: string;
  created_at: Date;
  updated_at: Date;
}

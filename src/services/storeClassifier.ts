/**
 * Store Classifier Service (Web Version)
 * 
 * Uses heuristic logic + user preferences to determine which store an item should be purchased from.
 * Ported from kitchenflow-app/src/services/ai/productClassification.ts
 * 
 * First Principles:
 * - Automate the decision. Don't ask user "Which store?" unless they want to override.
 * - User explicit choice > History preference > Keyword heuristic > Default (Any)
 * - Granular specialty store classification: Chinese ≠ Japanese ≠ Korean
 */

import { getPreferredStore, recordStorePreference } from './storePreference';

// Available UK Supermarkets
export const UK_SUPERMARKETS = ['Tesco', 'Asda', 'Lidl', 'Aldi', 'Sainsburys', 'Morrisons', 'Waitrose'] as const;
export type UKSupermarket = typeof UK_SUPERMARKETS[number];

// Specialty stores for specific products (Granular Asian Categories)
export const SPECIALTY_STORES = [
    'Chinese Supermarket',  // 中超/华人超市
    'Japanese Store',       // 日本食品店
    'Korean Mart',          // 韩国超市
    'Southeast Asian',      // 东南亚超市
    'Asian Market',         // 亚洲通用 (Fallback)
    'Polish Shop',
    'Turkish Market',
    'Italian Deli',
    'Indian Store',
    'Middle Eastern'
] as const;
export type SpecialtyStore = typeof SPECIALTY_STORES[number];

export type Store = UKSupermarket | SpecialtyStore | 'Any';

/**
 * Specialty store keyword mapping
 * First Principles: Granular classification - 老干妈 → 中超, not generic "Asian Market"
 */
const SPECIALTY_STORE_MAP: Record<string, string[]> = {
    // ==================== CHINESE SUPERMARKET (中超) ====================
    'Chinese Supermarket': [
        // 调味品 Condiments
        '老干妈', '豆瓣酱', '甜面酱', '腐乳', '芝麻酱', '花椒油', '辣油',
        '生抽', '老抽', '蚝油', '米醋', '陈醋', '黑醋', '料酒', '黄酒',
        '五香粉', '十三香', '八角', '桂皮', '花椒', '干辣椒', '白胡椒',
        'lao gan ma', 'doubanjiang', 'pixian douban', 'chili oil',
        'shaoxing wine', 'chinese cooking wine', 'sichuan peppercorn',
        'five spice', 'star anise', 'chinese cinnamon',
        // 主食 Staples
        '饺子', '馄饨', '包子', '小笼包', '春卷', '烧麦', '锅贴',
        '年糕', '粉丝', '粉条', '河粉', '米线', '手擀面', '刀削面',
        'chinese dumpling', 'wonton', 'bao', 'xiaolongbao', 'spring roll',
        'rice cake', 'glass noodle', 'rice vermicelli', 'hand-pulled noodle',
        // 豆制品 Bean Products
        '豆腐', '豆腐干', '豆腐皮', '腐竹', '豆浆', '臭豆腐',
        'chinese tofu', 'doufu', 'bean curd skin', 'dried tofu',
        // 蔬菜 Vegetables
        '白菜', '小白菜', '青菜', '芥兰', '韭菜', '蒜苔', '茼蒿',
        '冬瓜', '苦瓜', '丝瓜', '空心菜', '茭白', '莲藕',
        'bok choy', 'pak choi', 'chinese cabbage', 'gai lan', 'chinese chives',
        'bitter melon', 'winter melon', 'loofah', 'water spinach',
        // 蛋类 Eggs
        '皮蛋', '咸蛋', '咸鸭蛋', '松花蛋', '茶叶蛋',
        'century egg', 'preserved egg', 'salted duck egg',
        // 干货 Dried Goods
        '木耳', '银耳', '香菇', '干贝', '虾米', '紫菜', '海带',
        'wood ear', 'dried mushroom', 'dried scallop', 'dried shrimp',
    ],

    // ==================== JAPANESE STORE (日本食品店) ====================
    'Japanese Store': [
        // 调味品 Condiments
        '味噌', '味醂', '清酒', '日式酱油', '照烧酱', '柚子胡椒',
        '芥末', '山葵', '日式咖喱', '柴鱼片', '出汁', '昆布',
        'miso', 'mirin', 'sake', 'japanese soy sauce', 'teriyaki',
        'ponzu', 'wasabi', 'japanese curry', 'dashi', 'bonito flakes',
        // 面条 Noodles
        '拉面', '乌冬面', '荞麦面', '素面', '日式拉面',
        'ramen', 'udon', 'soba', 'somen', 'japanese noodle',
        // 海产品 Seafood
        '海苔', '紫菜', '昆布', '寿司海苔', '�的裙带菜',
        'nori', 'kombu', 'wakame', 'sushi nori', 'kelp',
        // 米饭相关 Rice
        '寿司米', '日本米', '饭团', '寿司',
        'sushi rice', 'japanese rice', 'onigiri',
        // 其他 Others
        '纳豆', '毛豆', '日式豆腐', '魔芋', '年糕',
        'natto', 'edamame', 'silken tofu', 'konjac', 'mochi',
    ],

    // ==================== KOREAN MART (韩国超市) ====================
    'Korean Mart': [
        // 酱料 Sauces
        '泡菜', '韩式辣酱', '大酱', '韩式拌饭酱', '包饭酱',
        '辣椒粉', '韩式辣椒酱', '韩式酱油',
        'kimchi', 'gochujang', 'doenjang', 'ssamjang', 'gochugaru',
        'korean chili paste', 'korean chili flakes', 'korean soy sauce',
        // 主食 Staples
        '韩式年糕', '炒年糕', '鱼糕', '紫菜包饭', '韩式拉面',
        '冷面', '韩式饺子', '韩式包子',
        'tteokbokki', 'tteok', 'fish cake', 'kimbap', 'korean ramyeon',
        'naengmyeon', 'mandu', 'korean dumpling',
        // 烧烤 BBQ
        '韩式烤肉酱', '腌肉酱', '烤肉', '五花肉',
        'korean bbq sauce', 'bulgogi sauce', 'galbi',
        // 蔬菜 Vegetables
        '韩国萝卜', '韩国白菜', '韩国辣椒',
        'korean radish', 'napa cabbage for kimchi', 'korean pepper',
        // 其他 Others
        '韩国紫菜', '饭团紫菜', '韩式海苔',
        'korean seaweed', 'gim', 'korean laver',
    ],

    // ==================== SOUTHEAST ASIAN (东南亚超市) ====================
    'Southeast Asian': [
        // 酱料 Sauces
        '鱼露', '虾酱', '椰浆', '椰奶', '咖喱膏', '沙茶酱',
        '甜辣酱', '泰式辣酱', '越南鱼露',
        'fish sauce', 'shrimp paste', 'coconut milk', 'coconut cream',
        'curry paste', 'satay sauce', 'thai sweet chili',
        // 面条 Noodles
        '河粉', '米粉', '金边粉', '越南粉',
        'pho noodles', 'pad thai noodles', 'rice stick', 'vietnamese noodle',
        // 香料 Herbs/Spices
        '香茅', '青柠叶', '南姜', '泰国罗勒', '越南薄荷',
        'lemongrass', 'kaffir lime', 'galangal', 'thai basil', 'vietnamese mint',
        // 其他 Others
        '越南春卷皮', '越南米纸', '泰国糯米', '班兰叶',
        'rice paper', 'vietnamese spring roll', 'thai sticky rice', 'pandan',
    ],

    // ==================== ASIAN MARKET (亚洲通用 Fallback) ====================
    'Asian Market': [
        // 通用亚洲食材 (当无法明确分类时使用)
        'asian grocery', 'oriental', 'asian vegetable',
        '亚洲食品', '东方调料',
    ],

    // ==================== OTHER SPECIALTY STORES ====================
    'Polish Shop': [
        'pierogi', 'kielbasa', 'bigos', 'zurek',
        'kluski', 'oscypek', 'twarog', 'kabanos'
    ],
    'Turkish Market': [
        'lahmacun', 'baklava', 'halva', 'lokum',
        'borek', 'simit', 'ayran', 'sucuk'
    ],
    'Italian Deli': [
        '00 flour', 'tipo 00', 'semolina',
        'mozzarella di bufala', 'burrata', 'parmigiano reggiano',
        'prosciutto di parma', 'pancetta', 'nduja', 'guanciale'
    ],
    'Indian Store': [
        'garam masala', 'curry leaves', 'ghee',
        'paneer', 'papad', 'fenugreek', 'asafoetida',
        'tamarind paste', 'jaggery', 'chapati flour'
    ],
    'Middle Eastern': [
        "za'atar", 'sumac', 'tahini', 'pomegranate molasses',
        'halloumi', 'labneh', 'rose water', 'orange blossom'
    ]
};

// Generic items that can be bought at any supermarket
const GENERIC_KEYWORDS = [
    'milk', 'bread', 'eggs', 'potato', 'onion', 'garlic', 'ginger',
    'apple', 'banana', 'orange', 'water', 'rice', 'pasta', 'salt', 'sugar',
    'flour', 'oil', 'butter', 'cheese', 'chicken', 'beef', 'pork',
    'tomato', 'lettuce', 'carrot', 'broccoli', 'spinach', 'cucumber',
    'yogurt', 'cream', 'coffee', 'tea',
    // Chinese generic
    '牛奶', '面包', '鸡蛋', '土豆', '洋葱', '大蒜', '姜',
    '苹果', '香蕉', '橙子', '水', '米', '盐', '糖',
    '面粉', '油', '黄油', '奶酪', '鸡肉', '牛肉', '猪肉',
];

// In-memory cache for classification results (L1 Cache)
const classificationCache = new Map<string, Store>();

/**
 * Infer specialty store from item name using keyword matching
 * @returns Store name or null if no match
 */
export function inferSpecialtyStore(itemName: string): SpecialtyStore | null {
    const lowerName = itemName.toLowerCase();

    for (const [storeName, keywords] of Object.entries(SPECIALTY_STORE_MAP)) {
        if (keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
            console.log(`[StoreClassifier] "${itemName}" → ${storeName} (keyword match)`);
            return storeName as SpecialtyStore;
        }
    }

    return null;
}

/**
 * Check if item is a generic product available at any supermarket
 */
function isGenericItem(itemName: string): boolean {
    const lowerName = itemName.toLowerCase();
    return GENERIC_KEYWORDS.some(keyword => lowerName.includes(keyword.toLowerCase()));
}

/**
 * Main classification function - determines which store an item should be purchased from
 * 
 * Priority (First Principles):
 * 1. User explicit choice (if provided during input)
 * 2. User historical preference (from Supabase)
 * 3. Keyword-based specialty store detection
 * 4. Generic item check → "Any"
 * 5. Default → "Any"
 * 
 * @param itemName - The product name
 * @param explicitStore - Store explicitly mentioned by user (e.g., "buy apples at Asda")
 * @returns Recommended store for this item
 */
export async function classifyItemToStore(
    itemName: string,
    explicitStore?: string | null
): Promise<Store> {
    const cacheKey = itemName.toLowerCase().trim();

    // Priority 1: User explicitly specified a store
    if (explicitStore) {
        const normalizedStore = normalizeStoreName(explicitStore);
        if (normalizedStore) {
            // Learn this preference for future
            await recordStorePreference(itemName, normalizedStore);
            classificationCache.set(cacheKey, normalizedStore);
            console.log(`[StoreClassifier] "${itemName}" → ${normalizedStore} (explicit user choice, saved preference)`);
            return normalizedStore;
        }
    }

    // Priority 2: Check user historical preference
    const userPreferred = await getPreferredStore(itemName);
    if (userPreferred) {
        classificationCache.set(cacheKey, userPreferred as Store);
        console.log(`[StoreClassifier] "${itemName}" → ${userPreferred} (user preference history)`);
        return userPreferred as Store;
    }

    // Priority 3: Check L1 cache
    const cached = classificationCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Priority 4: Keyword-based specialty store detection
    const specialtyStore = inferSpecialtyStore(itemName);
    if (specialtyStore) {
        classificationCache.set(cacheKey, specialtyStore);
        return specialtyStore;
    }

    // Priority 5: Generic item check
    if (isGenericItem(itemName)) {
        classificationCache.set(cacheKey, 'Any');
        console.log(`[StoreClassifier] "${itemName}" → Any (generic item)`);
        return 'Any';
    }

    // Priority 6: Default to "Any"
    const defaultStore: Store = 'Any';
    classificationCache.set(cacheKey, defaultStore);
    console.log(`[StoreClassifier] "${itemName}" → ${defaultStore} (default)`);
    return defaultStore;
}

/**
 * Normalize store name to match our known stores
 */
function normalizeStoreName(input: string): Store | null {
    const lower = input.toLowerCase().trim();

    // Check UK Supermarkets
    for (const store of UK_SUPERMARKETS) {
        if (lower.includes(store.toLowerCase())) {
            return store;
        }
    }

    // Check Specialty Stores
    for (const store of SPECIALTY_STORES) {
        if (lower.includes(store.toLowerCase())) {
            return store;
        }
    }

    // Common aliases for granular Asian stores
    const aliases: Record<string, Store> = {
        // Chinese
        '中超': 'Chinese Supermarket',
        '华人超市': 'Chinese Supermarket',
        '中国超市': 'Chinese Supermarket',
        'chinese': 'Chinese Supermarket',
        'chinese supermarket': 'Chinese Supermarket',
        'chinese grocery': 'Chinese Supermarket',
        // Japanese
        '日本超市': 'Japanese Store',
        '日本店': 'Japanese Store',
        'japanese': 'Japanese Store',
        'japanese store': 'Japanese Store',
        // Korean
        '韩国超市': 'Korean Mart',
        '韩国店': 'Korean Mart',
        'korean': 'Korean Mart',
        'korean mart': 'Korean Mart',
        'h mart': 'Korean Mart',
        // Southeast Asian
        '东南亚超市': 'Southeast Asian',
        '泰国超市': 'Southeast Asian',
        '越南超市': 'Southeast Asian',
        'thai': 'Southeast Asian',
        'vietnamese': 'Southeast Asian',
        'southeast asian': 'Southeast Asian',
        // Generic Asian (fallback)
        'asian': 'Asian Market',
        '亚洲超市': 'Asian Market',
        // Other specialty
        'polish': 'Polish Shop',
        'turkish': 'Turkish Market',
        'italian': 'Italian Deli',
        'indian': 'Indian Store',
        'middle east': 'Middle Eastern',
        'arab': 'Middle Eastern',
    };

    for (const [alias, store] of Object.entries(aliases)) {
        if (lower.includes(alias)) {
            return store;
        }
    }

    return null;
}

/**
 * Clear classification cache (useful for testing)
 */
export function clearClassificationCache(): void {
    classificationCache.clear();
}

/**
 * Get store icon for UI display
 */
export function getStoreIcon(store: Store): string {
    const icons: Record<string, string> = {
        'Tesco': 'storefront',
        'Asda': 'shopping_basket',
        'Lidl': 'shopping_bag',
        'Aldi': 'discount',
        'Sainsburys': 'local_grocery_store',
        'Morrisons': 'store',
        'Waitrose': 'shopping_cart',
        // Granular Asian stores
        'Chinese Supermarket': 'ramen_dining',
        'Japanese Store': 'rice_bowl',
        'Korean Mart': 'restaurant',
        'Southeast Asian': 'dinner_dining',
        'Asian Market': 'takeout_dining',
        // Other specialty
        'Polish Shop': 'local_dining',
        'Turkish Market': 'kebab_dining',
        'Italian Deli': 'local_pizza',
        'Indian Store': 'restaurant',
        'Middle Eastern': 'restaurant_menu',
        'Any': 'shopping_cart',
    };
    return icons[store] || 'store';
}

/**
 * Get store color for UI display
 */
export function getStoreColor(store: Store): { text: string; bg: string } {
    const colors: Record<string, { text: string; bg: string }> = {
        'Tesco': { text: 'text-blue-400', bg: 'bg-blue-500/20' },
        'Asda': { text: 'text-green-400', bg: 'bg-green-500/20' },
        'Lidl': { text: 'text-yellow-400', bg: 'bg-yellow-500/20' },
        'Aldi': { text: 'text-orange-400', bg: 'bg-orange-500/20' },
        'Sainsburys': { text: 'text-orange-300', bg: 'bg-orange-500/20' },
        'Morrisons': { text: 'text-yellow-300', bg: 'bg-yellow-500/20' },
        'Waitrose': { text: 'text-emerald-400', bg: 'bg-emerald-500/20' },
        // Granular Asian stores - different shades of red/pink
        'Chinese Supermarket': { text: 'text-red-500', bg: 'bg-red-500/20' },
        'Japanese Store': { text: 'text-pink-400', bg: 'bg-pink-500/20' },
        'Korean Mart': { text: 'text-rose-400', bg: 'bg-rose-500/20' },
        'Southeast Asian': { text: 'text-orange-400', bg: 'bg-orange-500/20' },
        'Asian Market': { text: 'text-red-300', bg: 'bg-red-500/20' },
        // Other specialty
        'Polish Shop': { text: 'text-red-300', bg: 'bg-red-500/20' },
        'Turkish Market': { text: 'text-amber-400', bg: 'bg-amber-500/20' },
        'Italian Deli': { text: 'text-green-300', bg: 'bg-green-500/20' },
        'Indian Store': { text: 'text-orange-400', bg: 'bg-orange-500/20' },
        'Middle Eastern': { text: 'text-amber-300', bg: 'bg-amber-500/20' },
        'Any': { text: 'text-slate-400', bg: 'bg-slate-500/20' },
    };
    return colors[store] || { text: 'text-white/60', bg: 'bg-white/10' };
}

/**
 * Get store Online Shopping URL
 */
export function getStoreUrl(store: Store, query?: string): string {
    const baseUrls: Record<string, string> = {
        // UK Supermarkets
        'Tesco': 'https://www.tesco.com/groceries/en-GB/search?query=',
        'Asda': 'https://groceries.asda.com/search/',
        'Sainsburys': 'https://www.sainsburys.co.uk/gol-ui/SearchResults/',
        'Waitrose': 'https://www.waitrose.com/ecom/shop/search?searchTerm=',
        'Morrisons': 'https://groceries.morrisons.com/search?entry=',
        'Aldi': 'https://groceries.aldi.co.uk/en-GB/Search?keywords=',
        'Lidl': 'https://www.lidl.co.uk/our-products?search=',
        // Granular Asian stores - search for specific type nearby
        'Chinese Supermarket': 'https://www.google.com/maps/search/Chinese+supermarket+near+me',
        'Japanese Store': 'https://www.google.com/maps/search/Japanese+grocery+store+near+me',
        'Korean Mart': 'https://www.google.com/maps/search/Korean+supermarket+H+Mart+near+me',
        'Southeast Asian': 'https://www.google.com/maps/search/Thai+Vietnamese+grocery+near+me',
        'Asian Market': 'https://www.google.com/maps/search/Asian+supermarket+near+me',
        // Other specialty
        'Polish Shop': 'https://www.google.com/maps/search/Polish+shop+near+me',
        'Turkish Market': 'https://www.google.com/maps/search/Turkish+supermarket+near+me',
        'Italian Deli': 'https://www.google.com/maps/search/Italian+deli+near+me',
        'Indian Store': 'https://www.google.com/maps/search/Indian+grocery+near+me',
        'Middle Eastern': 'https://www.google.com/maps/search/Middle+Eastern+grocery+near+me',
        'Any': 'https://www.google.com/search?q=buy+groceries+',
    };

    const baseUrl = baseUrls[store] || baseUrls['Any'];
    // For UK supermarkets, append query. For specialty stores, just open map search.
    if (UK_SUPERMARKETS.includes(store as UKSupermarket) && query) {
        return `${baseUrl}${encodeURIComponent(query)}`;
    }
    return baseUrl;
}

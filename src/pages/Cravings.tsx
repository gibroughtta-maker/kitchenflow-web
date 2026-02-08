import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecipeDetails, getShoppingList, setShoppingList, getInventory } from '../services/api';
import type { RecipeDetails, ShoppingItem } from '../types';
import RecipeModal from '../components/RecipeModal';
import NewCravingSlider from '../components/NewCravingSlider';

interface Craving {
  id: string;
  name: string;
  image: string;
  timeAgo: string;
  type: 'mic' | 'edit' | 'link';
  recipe: RecipeDetails | null;
}

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop';

function genId() {
  return `shopping-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Cravings() {
  const navigate = useNavigate();
  const [cravings, setCravings] = useState<Craving[]>([
    {
      id: '1',
      name: 'Tom Yum Soup',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqjIeIcWjTUHDXKN6AITxK2tCvBvND1W1beXPB2-JKTMdPX3xn7DMbqYr3a2clmKPO4z03xe7lXCfd4ZoyrbPRx3z7BLelBtaG4v7wTQH2WAcezJHDVDy5uGyfYSMjZyrJBaD6PxxWAEdDvrJV18do5qChPLE1br1my6OI_moxQ2f-d9iMrV46tdfyWaxLGz0Zp3K4DKfff1H9fU5eKi0NPL_m341jrzky7gVa20sWcsCsn2Gg9GnDFJPZbxxeAGN7fDwxezcphvqb',
      timeAgo: '20 mins ago',
      type: 'mic',
      recipe: null,
    },
    {
      id: '2',
      name: 'Avocado Toast',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAMjl6mlNkwYqU5zIgR9AK8cnUBdaSYsKx5Y5XOy4UL2AKYANLQL1RbiyVCzjm7YetQZGQPik_jjBf1CQ8HzZyEbCLSNjSkn6LsTE9NANRZnveQlhc1aRtOlGQfIgKBMMrQdTX_lwA8GeXco1xJCkdrCjfjDL_cA3mvoFOf9lpADAVHCMYo7xnEgbetMJzzAoS1uBaYOPjPNqKA3acmChRy5NM0Q3TdrqZzA6XZ9X_k6F7NlWsS-7Wm39BOtcF8OULhsnBC1GzIIawB',
      timeAgo: '1 hour ago',
      type: 'edit',
      recipe: null,
    },
  ]);
  const [selectedRecipe, setSelectedRecipe] = useState<{ details: RecipeDetails; image: string } | null>(null);
  const [loadingRecipeId, setLoadingRecipeId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState('');

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCraving = (name: string, image?: string) => {
    const newCraving: Craving = {
      id: Date.now().toString(),
      name: name,
      image: image || PLACEHOLDER_IMAGE,
      timeAgo: 'Just now',
      type: 'mic',
      recipe: null,
    };
    setCravings([newCraving, ...cravings]);
  };

  const deleteCraving = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCravings(cravings.filter(c => c.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Fetch recipe for a craving (with hardcoded Tom Yum Soup for demo)
  const fetchRecipeForCraving = async (craving: Craving): Promise<RecipeDetails | null> => {
    if (craving.recipe) return craving.recipe;

    if (craving.name === 'Tom Yum Soup') {
      const details: RecipeDetails = {
        dishName: 'Tom Yum Soup',
        cuisine: 'Thai Cuisine',
        cookingTime: '25 mins',
        ingredients: [
          { name: 'Shrimp', icon: 'cruelty_free' },
          { name: 'Lemongrass', icon: 'spa' },
          { name: 'Chili', icon: 'local_fire_department' },
          { name: 'Fish Sauce', icon: 'water_drop' },
          { name: 'Lime', icon: 'local_bar' },
        ],
        steps: [
          'Boil the broth. Add lemongrass, galangal, and lime leaves to infuse flavor.',
          'Add shrimp and mushrooms. Cook for 3 mins until shrimp turns pink.',
          'Turn off heat. Stir in fish sauce, lime juice, and chili paste immediately.',
        ],
      };
      setCravings(prev => prev.map(c => c.id === craving.id ? { ...c, recipe: details } : c));
      return details;
    }

    const details = await getRecipeDetails(craving.name);
    if (details) {
      setCravings(prev => prev.map(c => c.id === craving.id ? { ...c, recipe: details } : c));
    }
    return details;
  };

  // Batch add missing ingredients from selected cravings
  const handleBatchAddToShopping = async () => {
    if (selectedIds.size === 0) return;

    setBatchLoading(true);
    setBatchMessage('');

    try {
      // 1. Get all recipes for selected cravings
      const selectedCravings = cravings.filter(c => selectedIds.has(c.id));
      const recipes = await Promise.all(selectedCravings.map(fetchRecipeForCraving));

      // 2. Collect all ingredients from all recipes
      const allIngredients: string[] = [];
      recipes.forEach(recipe => {
        if (recipe?.ingredients) {
          recipe.ingredients.forEach(i => allIngredients.push(i.name));
        }
      });

      if (allIngredients.length === 0) {
        setBatchMessage('未找到任何食材');
        setBatchLoading(false);
        return;
      }

      // 3. Apply First Principles: Needed = Required - (In Stock + In Plan)
      const [shoppingList, inventory] = await Promise.all([
        getShoppingList(),
        getInventory()
      ]);

      const inPlan = new Set(shoppingList.map(i => i.name.toLowerCase()));
      const inStock = new Set(inventory.map(i => i.name.toLowerCase()));

      const toAdd: ShoppingItem[] = allIngredients
        .filter((name, idx, arr) => arr.indexOf(name) === idx) // unique
        .filter(name => {
          const lower = name.toLowerCase();
          return !inStock.has(lower) && !inPlan.has(lower);
        })
        .map(name => ({
          id: genId(),
          name,
          checked: false,
          addedAt: Date.now(),
        }));

      if (toAdd.length === 0) {
        setBatchMessage('✅ 所有食材均已在库存或购物清单中');
        setBatchLoading(false);
        return;
      }

      await setShoppingList([...shoppingList, ...toAdd]);
      setSelectedIds(new Set()); // Clear selection
      navigate('/shopping');
    } catch (e) {
      setBatchMessage(e instanceof Error ? e.message : '生成购物清单失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const handleCardClick = async (craving: Craving) => {
    if (craving.recipe) {
      setSelectedRecipe({ details: craving.recipe, image: craving.image });
      return;
    }

    setLoadingRecipeId(craving.id);

    try {
      const details = await fetchRecipeForCraving(craving);
      if (details) {
        setSelectedRecipe({ image: craving.image, details });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipeId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-display text-white overflow-hidden bg-black">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl z-0" />

      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Header - Dark Pill Style */}
        <header className="px-4 pt-14 pb-4 flex justify-center shrink-0">
          <div className="w-full max-w-[340px] h-12 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-between px-1.5 shadow-2xl">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_back_ios_new</span>
            </button>
            <h1 className="text-[15px] font-bold tracking-wide text-white">Cravings Queue</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Main Content Waterfall */}
        <main className="flex-1 overflow-y-auto px-4 pb-48 w-full max-w-lg mx-auto scroll-smooth no-scrollbar">
          <div className="columns-2 gap-3 space-y-3">
            {cravings.map((craving) => (
              <button
                key={craving.id}
                type="button"
                onClick={() => handleCardClick(craving)}
                className={`relative group w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ring-1 break-inside-avoid cursor-pointer active:scale-95 text-left ${selectedIds.has(craving.id) ? 'ring-2 ring-blue-500' : 'ring-white/10'
                  }`}
              >
                {/* Checkbox - Top Left */}
                <div
                  onClick={(e) => toggleSelection(craving.id, e)}
                  className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${selectedIds.has(craving.id)
                    ? 'bg-blue-500'
                    : 'bg-black/60 backdrop-blur-sm hover:bg-white/20'
                    }`}
                >
                  <span className="material-symbols-outlined text-white text-[14px]">
                    {selectedIds.has(craving.id) ? 'check' : 'add'}
                  </span>
                </div>
                {/* Delete Button - Top Right - Always Visible */}
                <div
                  onClick={(e) => deleteCraving(craving.id, e)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-red-500 active:bg-red-600 transition-all cursor-pointer shadow-lg"
                >
                  <span className="material-symbols-outlined text-white text-[14px]">close</span>
                </div>
                <img
                  alt={craving.name}
                  className="w-full h-auto min-h-[160px] object-cover"
                  src={craving.image}
                />
                <div className="absolute bottom-0 left-0 right-0 !bg-black/50 !backdrop-blur-md p-3 flex justify-between items-center border-t border-white/10">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{craving.name}</span>
                    <span className="text-[10px] text-white/60">{craving.timeAgo}</span>
                  </div>
                  {loadingRecipeId === craving.id && (
                    <span className="material-symbols-outlined text-[16px] text-white/60 animate-spin">
                      progress_activity
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <div className="h-20" />
        </main>

        {/* Batch Add Button - Fixed above NewCravingSlider */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-28 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={handleBatchAddToShopping}
              disabled={batchLoading}
              className="pointer-events-auto w-full max-w-[340px] py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/40 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {batchLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">shopping_cart</span>
                  Add missing ingredients for {selectedIds.size} dishes to shopping list
                </>
              )}
            </button>
          </div>
        )}

        {/* Batch Message Toast */}
        {batchMessage && (
          <div className="fixed bottom-40 left-0 right-0 z-40 px-4 flex justify-center">
            <div className="bg-black/80 backdrop-blur-md text-white text-sm font-medium px-6 py-3 rounded-full shadow-lg animate-pulse">
              {batchMessage}
            </div>
          </div>
        )}

        {/* Slider at Bottom */}
        <NewCravingSlider onCravingIdentified={addCraving} />

        {/* Recipe Modal */}
        {selectedRecipe && (
          <RecipeModal
            data={selectedRecipe.details}
            image={selectedRecipe.image}
            onClose={() => setSelectedRecipe(null)}
          />
        )}
      </div>
    </div>
  );
}


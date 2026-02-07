import { useState } from 'react';
import type { RecipeDetails } from '../types';
import { getShoppingList, setShoppingList, getInventory } from '../services/api';
import type { ShoppingItem } from '../types';
import { useNavigate } from 'react-router-dom';

function genId() {
  return `shopping-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function RecipeModal({
  data,
  image,
  onClose,
}: {
  data: RecipeDetails;
  image: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ingredients = data.ingredients?.map((i) => i.name) ?? [];

  const addMissingToShopping = async () => {
    if (!ingredients.length) return;
    setError('');
    try {
      // 1. Get current state of 'Stock' (Inventory) and 'Plan' (Shopping List)
      const [shoppingList, inventory] = await Promise.all([
        getShoppingList(),
        getInventory()
      ]);

      // 2. Normalize for comparison (lowercase)
      const inPlan = new Set(shoppingList.map((i) => i.name.toLowerCase()));
      const inStock = new Set(inventory.map((i) => i.name.toLowerCase()));

      // 3. First Principles: Needed = Required - (In Stock + In Plan)
      const toAdd: ShoppingItem[] = ingredients
        .filter((name) => {
          const lower = name.toLowerCase();
          // If we have it (Stock) or plan to buy it (Plan), we don't need to add it.
          const alreadyHave = inStock.has(lower);
          const alreadyPlanned = inPlan.has(lower);

          return !alreadyHave && !alreadyPlanned;
        })
        .map((name) => ({
          id: genId(),
          name,
          checked: false,
          addedAt: Date.now(),
        }));

      if (toAdd.length === 0) {
        setError('所有食材均已在库存或购物清单中 ✅');
        return;
      }

      await setShoppingList([...shoppingList, ...toAdd]);
      onClose();
      navigate('/shopping');
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入购物清单失败，请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 h-full w-full">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[360px] liquid-modal dark:bg-[#1E1E1E] rounded-[2.5rem] animate-in zoom-in-95 duration-300 overflow-visible shadow-2xl flex flex-col max-h-[85vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 transition-colors z-20"
          aria-label="关闭"
        >
          <span className="material-symbols-outlined text-slate-500 dark:text-slate-300 text-lg">close</span>
        </button>

        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-10">
          <div className="w-32 h-32 rounded-full p-1.5 liquid-modal dark:bg-[#1E1E1E] shadow-2xl">
            <img src={image} alt={data.dishName} className="w-full h-full rounded-full object-cover shadow-inner" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-16 rounded-[2.5rem]">
          <div className="text-center mb-8 relative z-0">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">{data.dishName}</h2>
            <div className="flex items-center justify-center gap-3">
              {data.cuisine && (
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[11px] font-bold rounded-full uppercase tracking-wide">
                  {data.cuisine}
                </span>
              )}
              {data.cookingTime && (
                <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-sm font-semibold">
                  <span className="w-1 h-1 rounded-full bg-slate-400" />
                  {data.cookingTime}
                </span>
              )}
            </div>
          </div>

          {ingredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 ml-1">Ingredients</h3>
              <div className="bg-white/60 dark:bg-white/5 rounded-3xl p-1 shadow-sm border border-slate-100 dark:border-white/5">
                {ingredients.map((name, idx) => (
                  <div key={idx} className="flex items-center p-3.5 border-b border-slate-200/50 dark:border-white/5 last:border-0">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.steps?.length > 0 && (
            <div className="pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 ml-1">Recipe</h3>
              <div className="space-y-3">
                {data.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 p-3.5 bg-white dark:bg-white/5 rounded-[1.25rem] border border-slate-100 dark:border-white/5 shadow-sm items-start">
                    <div className="w-6 h-6 rounded-full bg-blue-500 shadow-lg shadow-blue-500/30 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ingredients.length > 0 && (
            <>
              <button
                type="button"
                onClick={addMissingToShopping}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">shopping_cart</span>
                缺失食材加入购物清单
              </button>
              {error && (
                <p className="text-blue-400 text-sm text-center mt-2 font-medium animate-pulse" role="alert">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

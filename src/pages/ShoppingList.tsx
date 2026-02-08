import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getShoppingList, setShoppingList } from '../services/api';
import { supabase } from '../services/supabaseClient';
import type { ShoppingItem } from '../types';
import NewCravingSlider from '../components/NewCravingSlider';
import { classifyItemToStore, getStoreIcon, getStoreColor, type Store, UK_SUPERMARKETS } from '../services/storeClassifier';
import { getShoppingRoute, type ShoppingRouteResult } from '../services/gemini';
import ShoppingRouteModal from '../components/ShoppingRouteModal';

interface StoreInfo {
  name: string;
  icon: string;
  color: string;
  bg: string;
}

function genId() {
  return `shopping-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Group items by their assigned store
function groupByStore(items: ShoppingItem[]): Array<{ store: StoreInfo; items: ShoppingItem[] }> {
  const storeMap = new Map<string, ShoppingItem[]>();

  items.forEach(item => {
    const storeName = item.store || 'Any';
    if (!storeMap.has(storeName)) {
      storeMap.set(storeName, []);
    }
    storeMap.get(storeName)!.push(item);
  });

  return Array.from(storeMap.entries()).map(([storeName, storeItems]) => {
    const colors = getStoreColor(storeName as Store);
    return {
      store: {
        name: storeName,
        icon: getStoreIcon(storeName as Store),
        color: colors.text,
        bg: colors.bg,
      },
      items: storeItems,
    };
  });
}

// 模拟“添加者”（为了 UI 还原度）
const MOCK_USERS = [
  { name: 'Dad', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop' },
  { name: 'Mom', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&auto=format&fit=crop' }
];

export default function ShoppingList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [error, setError] = useState('');
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isModeSelectOpen, setIsModeSelectOpen] = useState(false);

  // Route Navigation State
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<ShoppingRouteResult | null>(null);

  const appliedAddItems = useRef(false);

  useEffect(() => {
    loadItems();
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('shopping_list_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        loadItems();
      })
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, []);

  const loadItems = () => {
    setError('');
    getShoppingList()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  };

  useEffect(() => {
    const state = location.state as { addItems?: string[] } | undefined;
    if (state?.addItems?.length && !appliedAddItems.current) {
      appliedAddItems.current = true;
      handleBatchAdd(state.addItems);
    }
  }, [location.state, location.pathname]);

  const handleBatchAdd = async (names: string[]) => {
    const list = await getShoppingList();
    const existing = new Set(list.map((i) => i.name.toLowerCase()));

    // Classify each item in parallel
    const toAddPromises = names
      .filter((n) => !existing.has(n.toLowerCase()))
      .map(async (name) => {
        const store = await classifyItemToStore(name);
        return { id: genId(), name, checked: false, addedAt: Date.now(), store };
      });

    const toAdd = await Promise.all(toAddPromises);

    if (toAdd.length > 0) {
      const next = [...list, ...toAdd];
      await setShoppingList(next);
      setItems(next);
    }
    navigate(location.pathname, { replace: true, state: {} });
  };

  /**
   * Parse shopping input to extract store and multiple items
   * Examples:
   * - "在Asda买牛奶和苹果" → store: "Asda", items: ["牛奶", "苹果"]
   * - "milk, eggs, bread at Tesco" → store: "Tesco", items: ["milk", "eggs", "bread"]
   * - "牛奶、鸡蛋、面包" → store: null, items: ["牛奶", "鸡蛋", "面包"]
   */
  const parseShoppingInput = (input: string): { store: string | null; items: string[] } => {
    let store: string | null = null;
    let itemsPart = input;

    // Store detection patterns (Chinese)
    const zhStorePatterns = [
      /在(.+?)买/i,        // 在Asda买
      /去(.+?)买/i,        // 去Asda买
      /从(.+?)买/i,        // 从Asda买
    ];

    // Store detection patterns (English)
    const enStorePatterns = [
      /at\s+(\w+)/i,       // at Tesco
      /from\s+(\w+)/i,     // from Asda
    ];

    // Try Chinese patterns first
    for (const pattern of zhStorePatterns) {
      const match = input.match(pattern);
      if (match) {
        store = match[1].trim();
        itemsPart = input.replace(pattern, '').trim();
        break;
      }
    }

    // Try English patterns
    if (!store) {
      for (const pattern of enStorePatterns) {
        const match = input.match(pattern);
        if (match) {
          store = match[1].trim();
          itemsPart = input.replace(pattern, '').trim();
          break;
        }
      }
    }

    // Split items by common separators (including "and" as a word delimiter)
    // Note: \band\b matches "and" as a whole word, not part of "candy" etc.
    const splitPattern = /[,，、]|\s+and\s+|和/gi;
    const items = itemsPart
      .split(splitPattern)
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.toLowerCase() !== 'and');

    return { store, items };
  };

  const addItem = async (inputText: string, _image?: string) => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Parse input for store and multiple items
    const { store: explicitStore, items: parsedItems } = parseShoppingInput(trimmed);

    // Debug logging
    console.log('[ShoppingList] Input:', trimmed);
    console.log('[ShoppingList] Parsed store:', explicitStore);
    console.log('[ShoppingList] Parsed items:', parsedItems);

    if (parsedItems.length === 0) return;

    // Get existing items to avoid duplicates
    const existingNames = new Set(items.map(i => i.name.toLowerCase()));

    // Process each item in parallel
    const newItemsPromises = parsedItems
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map(async (name) => {
        const store = await classifyItemToStore(name, explicitStore);
        return { id: genId(), name, checked: false, addedAt: Date.now(), store };
      });

    const newItems = await Promise.all(newItemsPromises);

    if (newItems.length > 0) {
      const next = [...items, ...newItems];
      try {
        await setShoppingList(next);
        setItems(next);
      } catch (e) {
        setError('保存失败');
      }
    }
  };

  const toggle = async (id: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i));
    setItems(next); // Optimistic update
    try {
      await setShoppingList(next);
    } catch (e) {
      loadItems(); // Revert on fail
    }
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    try {
      await setShoppingList(next);
    } catch {
      loadItems();
    }
  };

  const clearDone = async () => {
    if (!confirm('Clear all checked items?')) return;
    const next = items.filter((i) => !i.checked);
    setItems(next);
    await setShoppingList(next);
  };

  /* Online Shopping Handler */
  const handleOnlineShopping = () => {
    const selectedItems = items.filter(i => i.checked);
    if (selectedItems.length === 0) return;

    // Determine target store
    // Logic: Find the most frequent store among selected items
    const storeCounts: Record<string, number> = {};
    selectedItems.forEach(i => {
      const s = i.store || 'Any';
      storeCounts[s] = (storeCounts[s] || 0) + 1;
    });

    // Sort stores by count
    const sortedStores = Object.entries(storeCounts).sort((a, b) => b[1] - a[1]);
    let primaryStore = sortedStores[0][0] as Store;

    // Resolve "Any" to a concrete store
    if (primaryStore === 'Any') {
      // 1. Try to find a specific UK supermarket among selected items
      const fallback = sortedStores.find(([name]) =>
        UK_SUPERMARKETS.includes(name as any)
      );

      if (fallback) {
        primaryStore = fallback[0] as Store;
      } else {
        // 2. Default to Tesco if no specific supermarket is present
        primaryStore = 'Tesco';
      }
    }



    // Open in new tab
    window.open(url, '_blank');
    setIsModeSelectOpen(false);
  };

  /* Route Navigation Handler */
  const handleNavigate = () => {
    const selectedItems = items.filter(i => i.checked);
    if (selectedItems.length === 0) return;

    // 1. Close Mode Select, Open Route Modal immediately (loading state)
    setIsModeSelectOpen(false);
    setIsRouteModalOpen(true);
    setIsRouteLoading(true);
    setRouteResult(null);

    // 2. Get unique stores from selected items
    const uniqueStores = new Set(selectedItems.map(i => i.store || 'Any'));
    const targetStores: string[] = [];

    // Add specific stores
    uniqueStores.forEach(s => {
      if (s !== 'Any') targetStores.push(s);
    });

    // If 'Any' exists, add a generic Supermarket stop
    if (uniqueStores.has('Any')) {
      targetStores.push('Supermarket');
    }

    // Fallback if nothing selected (shouldn't happen given input check)
    if (targetStores.length === 0) targetStores.push('Supermarket');

    // 3. Attempt User Location (but proceed even if it fails)
    const requestRoute = async (lat?: number, lng?: number) => {
      try {
        const result = await getShoppingRoute(
          targetStores,
          lat && lng ? { latitude: lat, longitude: lng } : undefined
        );
        setRouteResult(result);
      } catch (e) {
        console.error('Route planning failed', e);
        alert('Failed to plan route. Please try again.');
        setIsRouteModalOpen(false);
      } finally {
        setIsRouteLoading(false);
      }
    };

    if (!navigator.geolocation) {
      // Proceed without location
      requestRoute();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        requestRoute(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.warn('Location retrieval failed', error);
        // Fallback: Proceed without location
        requestRoute();
      },
      { timeout: 5000 } // Add timeout so it doesn't hang forever
    );
  };

  const groups = groupByStore(items);

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-display text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl z-0" />

      {/* Header - Floating Pill */}
      <div className="px-6 pt-14 pb-2 z-20 flex justify-center shrink-0">
        <div className="w-full max-w-[340px] h-12 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-between px-1.5 shadow-2xl">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">arrow_back_ios_new</span>
          </button>
          <h1 className="text-[15px] font-bold tracking-wide text-white">Shopping List</h1>
          <div className="flex items-center -space-x-2 mr-2">
            {MOCK_USERS.map((u, i) => (
              <img key={i} className="w-8 h-8 rounded-full border-2 border-[#1C1C1E] object-cover shadow-sm" src={u.avatar} alt={u.name} />
            ))}
            <button
              onClick={() => setIsShareOpen(true)}
              className="w-8 h-8 rounded-full border-2 border-[#1C1C1E] bg-white/20 flex items-center justify-center text-xs font-bold text-white z-10 shadow-sm backdrop-blur-md active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setIsShareOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[360px] liquid-modal dark:bg-[#1E1E1E]/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-2xl border border-white/20 flex flex-col items-center gap-6">
            <h3 className="text-xl font-bold text-white tracking-tight">
              Share Shopping List
            </h3>

            <div className="w-full flex items-center gap-2 p-1 pl-4 bg-white/5 border border-white/10 rounded-full overflow-hidden">
              <span className="material-symbols-outlined text-white/40 text-[20px] shrink-0">link</span>
              <input
                readOnly
                value="kitchenflow.app/invite/..."
                className="flex-1 bg-transparent border-none text-[13px] text-white/90 focus:outline-none font-medium truncate min-w-0"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://kitchenflow.app/invite/shared-list-id');
                  setIsShareOpen(false);
                }}
                className="px-5 py-2.5 bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white text-xs font-bold rounded-full transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap shrink-0"
              >
                Copy Link
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex -space-x-3 justify-center mb-2">
                {MOCK_USERS.map((u, i) => (
                  <img key={i} className="w-10 h-10 rounded-full border-2 border-[#2C2C2E] object-cover" src={u.avatar} alt={u.name} />
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-[#2C2C2E] bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                  +2
                </div>
              </div>
              <p className="text-xs text-white/40 text-center">
                Anyone with the link can add items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mode Select Modal */}
      {isModeSelectOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setIsModeSelectOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-[320px] bg-white text-slate-900 rounded-[2rem] p-8 shadow-2xl flex flex-col items-center gap-8 animate-in zoom-in-95 duration-200">

            <h3 className="text-xl font-bold text-[#1C1C1E] tracking-tight">
              Select Mode
            </h3>

            <div className="w-full flex flex-col gap-4">
              {/* Online Shopping Button */}
              <button
                onClick={handleOnlineShopping}
                className="w-full h-16 bg-white border border-gray-100 rounded-[2rem] flex items-center px-2 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mr-4 group-hover:bg-blue-100 transition-colors">
                  <span className="material-symbols-outlined text-[#007AFF] text-[24px]">public</span>
                </div>
                <span className="text-[#1C1C1E] font-bold text-[15px]">Online Shopping</span>
              </button>

              {/* Navigate Button */}
              <button
                onClick={handleNavigate}
                className="w-full h-16 bg-white border border-gray-100 rounded-[2rem] flex items-center px-2 shadow-lg shadow-gray-200/50 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mr-4 group-hover:bg-green-100 transition-colors">
                  <span className="material-symbols-outlined text-[#34C759] text-[24px]">navigation</span>
                </div>
                <span className="text-[#1C1C1E] font-bold text-[15px]">Navigate</span>
              </button>
            </div>

            <button
              onClick={() => setIsModeSelectOpen(false)}
              className="text-[#8E8E93] text-sm font-medium hover:text-[#1C1C1E] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main List */}
      <main className="flex-1 overflow-y-auto px-6 py-4 pb-56 space-y-6 no-scrollbar z-10">
        {error && <p className="text-red-400 text-center text-sm">{error}</p>}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 opacity-40">
            <span className="material-symbols-outlined text-4xl mb-2 text-white">shopping_cart</span>
            <p className="text-white font-medium">List is empty</p>
          </div>
        ) : (
          groups.map(({ store, items: storeItems }) => (
            <div key={store.name} className="animate-in fade-in duration-500 slide-in-from-bottom-4">
              {/* Store Header */}
              <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 shadow-sm mb-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    const allSelected = storeItems.every(i => i.checked);
                    const newItems = items.map(i => {
                      if (storeItems.find(si => si.id === i.id)) {
                        return { ...i, checked: !allSelected };
                      }
                      return i;
                    });
                    setItems(newItems);
                    setShoppingList(newItems).catch(() => loadItems());
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Store Checkbox */}
                    <div className={`w-6 h-6 rounded-full border ${storeItems.every(i => i.checked) ? 'bg-[#007AFF] border-transparent' : 'border-white/20 bg-white/10'} flex items-center justify-center shrink-0 transition-colors`}>
                      {storeItems.every(i => i.checked) && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                    </div>

                    <div className={`w-10 h-10 rounded-full ${store.bg} flex items-center justify-center ${store.color} border border-white/10`}>
                      <span className="material-symbols-outlined text-xl">{store.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{store.name}</h3>
                      <p className="text-xs text-white/60 font-medium">{storeItems.length} {storeItems.length === 1 ? 'item' : 'items'}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-white/40 text-xl">expand_less</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2 pl-2">
                {storeItems.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`
                        relative group
                        backdrop-blur-md border rounded-[2rem] p-1 shadow-sm flex items-center pr-6 cursor-pointer transition-all active:scale-[0.98]
                        ${item.checked ? 'bg-[#007AFF]/20 border-[#007AFF]/50' : 'bg-black/20 border-white/5'}
                      `}
                    >
                      <div className="p-4 pr-2">
                        <div className={`w-6 h-6 rounded-full border ${item.checked ? 'bg-[#007AFF] border-transparent' : 'border-white/30 bg-white/5'} flex items-center justify-center transition-colors`}>
                          {item.checked && <span className="material-symbols-outlined text-[14px] text-white">check</span>}
                        </div>
                      </div>
                      <div className="flex-1 py-4">
                        <h4 className={`font-bold text-[15px] ${item.checked ? 'text-white' : 'text-white'}`}>
                          {item.name}
                        </h4>
                      </div>

                      {/* Delete Action (visible on hover/active or strictly) */}
                      <button
                        onClick={(e) => remove(item.id, e)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors z-10"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Bottom Actions - Two Rows */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-gradient-to-t from-black/90 via-black/80 to-transparent z-20 pt-12 flex flex-col gap-4 backdrop-blur-[2px]">

        {/* Row 1: Actions */}
        <div className="flex items-center gap-3 h-[52px]">
          {/* Delete Selected Button */}
          <button
            onClick={clearDone}
            disabled={items.filter(i => i.checked).length === 0}
            className={`
              h-full px-5 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all group
              ${items.filter(i => i.checked).length === 0 ? 'opacity-30 cursor-not-allowed grayscale' : 'active:scale-95'}
            `}
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-white/60 text-[18px] group-hover:text-red-400 transition-colors">delete</span>
              <span className="text-[11px] font-bold text-white/60 group-hover:text-white transition-colors">
                {items.filter(i => i.checked).length > 0 ? `Delete (${items.filter(i => i.checked).length})` : 'Delete'}
              </span>
            </div>
          </button>

          {/* Start Shopping Button */}
          <button
            disabled={items.filter(i => i.checked).length === 0}
            onClick={() => setIsModeSelectOpen(true)}
            className={`
              flex-1 h-full rounded-[2rem] flex items-center justify-center gap-2 text-white shadow-lg transition-all
              ${items.filter(i => i.checked).length === 0
                ? 'bg-gray-600/50 cursor-not-allowed opacity-50'
                : 'bg-[#007AFF] hover:bg-blue-600 active:scale-95 shadow-blue-500/20'}
            `}
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            <span className="font-bold text-[14px] tracking-wide">Start Shopping</span>
          </button>
        </div>

        {/* Row 2: Voice Slider */}
        <NewCravingSlider
          onCravingIdentified={addItem}
          title="Add Items"
          subtitle="Milk, Eggs... Buy apples at Asda"
          variant="dark"
          className="relative w-full z-10"
          skipImageGeneration={true}
        />
      </div>

      {/* Shopping Route Modal */}
      <ShoppingRouteModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        result={routeResult}
        isLoading={isRouteLoading}
      />
    </div>
  );
}

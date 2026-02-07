import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getInventory, setInventory } from '../services/api';
import type { FreshItem, FridgeSnapshotResult } from '../types';
import type { InventoryItem } from '../types';

function Tag({ freshness }: { freshness: FreshItem['freshness'] }) {
  const cls =
    freshness === 'fresh'
      ? 'liquid-tag-green'
      : freshness === 'use-soon'
        ? 'liquid-tag-yellow'
        : 'liquid-tag-red';
  const label = freshness === 'fresh' ? 'Fresh' : freshness === 'use-soon' ? 'Use Soon' : 'Priority';
  return (
    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function ItemRow({ item, index, onUpdate }: { item: FreshItem; index: number; onUpdate: (index: number, updates: Partial<FreshItem>) => void }) {
  return (
    <div className="liquid-card p-4 rounded-3xl flex items-center gap-4 transition-transform ring-1 ring-white/10 bg-white/5 active:bg-white/10">
      {/* 移除图片，仅保留简单的圆形指示器或直接移除 */}
      <div className={`shrink-0 size-3 rounded-full ${item.freshness === 'fresh' ? 'bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]' :
        item.freshness === 'use-soon' ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
          'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
        }`} />

      <div className="flex flex-col flex-1 min-w-0 gap-1">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate(index, { name: e.target.value })}
            className="bg-transparent text-white text-lg font-bold leading-tight w-full focus:outline-none focus:bg-white/10 rounded px-1 -ml-1 border border-transparent focus:border-white/20 transition-all placeholder-white/30"
            placeholder="Item Name"
          />
          <Tag freshness={item.freshness} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) })}
            className="bg-transparent text-glass-secondary text-sm font-medium w-16 focus:outline-none focus:bg-white/10 rounded px-1 -ml-1 border border-transparent focus:border-white/20 transition-all text-right"
          />
          <span className="text-glass-secondary text-sm font-medium">{item.unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function ScanResults() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const location = useLocation();
  const state = location.state as { result?: FridgeSnapshotResult } | undefined;

  // Local state for editing items
  const [items, setItems] = useState<FreshItem[]>([]);

  useEffect(() => {
    if (state?.result?.items) {
      setItems(state.result.items);
    }
  }, [state]);

  const handleUpdateItem = (index: number, updates: Partial<FreshItem>) => {
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const saveToInventory = async () => {
    setError('');
    try {
      const inv = await getInventory();
      // Use the storageLocation from the first item (set in Scan.tsx) or default
      const loc = items[0]?.storageLocation ?? 'fridge';

      const newItems: InventoryItem[] = items.map((i, idx) => ({
        id: `scan-${Date.now()}-${idx}`,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        freshness: i.freshness,
        // Allow any string, fallback to fridge if empty/undefined
        location: (loc || 'fridge').toLowerCase(),
        addedAt: Date.now(),
      }));
      await setInventory([...inv, ...newItems]);
      navigate('/inventory');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存到库存失败，请稍后重试');
    }
  };

  const addToShopping = () => {
    navigate('/shopping', { state: { addItems: items.map((i) => i.name) } });
  };

  if (!state?.result) {
    return (
      <div className="text-center py-12">
        <p className="text-glass-secondary mb-4">暂无扫描结果</p>
        <button
          type="button"
          onClick={() => navigate('/scan')}
          className="pill-button px-6 py-3 rounded-full text-white font-semibold"
        >
          去扫描
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-60 px-1 pt-4">
        <h2 className="text-2xl font-bold text-white px-2">扫描结果</h2>
        <div className="flex flex-col gap-4">
          {items.map((item, idx) => (
            <ItemRow key={`${idx}`} index={idx} item={item} onUpdate={handleUpdateItem} />
          ))}
        </div>

        {error && (
          <p className="text-red-300 text-sm text-center py-2 px-4 rounded-xl bg-red-500/20 mx-4" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Fixed Bottom Actions with Blur */}
      {/* Fixed Bottom Actions with Blur */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-5 flex flex-col gap-3 safe-area-bottom pointer-events-none">
        <button type="button" onClick={saveToInventory} className="w-full h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/20 pointer-events-auto">
          <span className="material-symbols-outlined">inventory_2</span>
          Save to Inventory
        </button>
        <button type="button" onClick={addToShopping} className="w-full h-14 rounded-full liquid-card hover:bg-white/20 text-white font-bold text-base active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.2)] pointer-events-auto">
          <span className="material-symbols-outlined">receipt_long</span>
          Add to Shopping List
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInventory, setInventory } from '../services/api';
import { supabase } from '../services/supabaseClient';
import type { InventoryItem } from '../types';
import NewCravingSlider from '../components/NewCravingSlider';

// --- Types & Helper Components from AI Studio ---

interface DetailedInventoryItem extends InventoryItem {
  badge: string;
  badgeColor: string;
  icon?: string;
}

const SwipeableInventoryItem: React.FC<{
  item: DetailedInventoryItem;
  onDelete: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
}> = ({ item, onDelete, onUpdateName }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const itemRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isEditing) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setStartX(e.clientX);
    setIsDragging(true);
    if (itemRef.current) {
      itemRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - startX;
    if (diff < 0 && diff > -140) {
      setOffsetX(diff);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    if (itemRef.current) {
      itemRef.current.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }
    if (offsetX < -70) {
      setOffsetX(-90);
    } else {
      setOffsetX(0);
    }
  };

  const handlePointerLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (itemRef.current) itemRef.current.style.transition = 'transform 0.3s ease-out';
      setOffsetX(0);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(item.id);
  };

  const handleNameClick = (e: React.MouseEvent) => {
    if (offsetX === 0) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleNameSubmit = () => {
    setIsEditing(false);
    if (editName.trim() !== '') {
      onUpdateName(item.id, editName);
    } else {
      setEditName(item.name);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <div className="relative h-[80px] rounded-[1.75rem] overflow-hidden mb-4 select-none group">
      <div className="absolute inset-0 bg-transparent flex items-center justify-end pr-6 rounded-[1.75rem]">
        <div
          className={`absolute right-0 top-0 bottom-0 w-full bg-white/10 backdrop-blur-xl border border-white/10 rounded-[1.75rem] transition-opacity duration-300 ${Math.abs(offsetX) > 20 ? 'opacity-100' : 'opacity-0'
            }`}
        />
        <button
          type="button"
          onClick={handleDeleteClick}
          className="relative z-10 w-12 h-12 rounded-full bg-white/20 hover:bg-red-500/20 flex items-center justify-center transition-all duration-300 active:scale-90 border border-white/10 shadow-lg"
        >
          <span className="material-symbols-outlined text-white text-[22px] drop-shadow-md">delete</span>
        </button>
      </div>

      <div
        ref={itemRef}
        className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/10 backdrop-blur-xl px-6 rounded-[1.75rem] flex items-center justify-between shadow-[0_4px_24px_-1px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/20 z-10 touch-pan-y"
        style={{ transform: `translateX(${offsetX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <div className="flex-1 min-w-0 pr-4">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              className="w-full bg-transparent border-b-2 border-white/50 text-xl font-bold text-slate-900 dark:text-white leading-tight focus:outline-none p-0 py-1 placeholder-white/50"
            />
          ) : (
            <h3
              onClick={handleNameClick}
              className="text-lg font-bold text-slate-900 dark:text-white leading-tight cursor-text active:opacity-60 transition-opacity truncate drop-shadow-sm"
            >
              {item.name}
            </h3>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
            {item.quantity} {item.unit}
          </p>
        </div>

        {item.badge && (
          <div
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0 shadow-sm backdrop-blur-md border border-white/20 ${item.badgeColor}`}
          >
            {item.badge}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('fridge');
  const [tabs, setTabs] = useState<string[]>(['fridge', 'pantry', 'freezer']);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Initial Data Load
  const loadData = () => {
    getInventory().then(setItems).catch(console.error);
  };

  // Initial Data Load
  useEffect(() => {
    loadData();
  }, []);

  // Supabase Realtime Subscription
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('inventory_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, loadData)
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, []);

  // Update tabs dynamically based on items
  useEffect(() => {
    const locations = new Set(['fridge', 'pantry', 'freezer']);
    items.forEach(item => {
      if (item.location) locations.add(item.location.toLowerCase());
    });
    setTabs(Array.from(locations));
  }, [items]);

  const getBadgeInfo = (freshness: InventoryItem['freshness']): { badge: string; badgeColor: string } => {
    switch (freshness) {
      case 'fresh':
        return { badge: 'FRESH', badgeColor: 'text-green-600 bg-white/60 dark:bg-white/10 dark:text-green-400' };
      case 'use-soon':
        return { badge: 'Use Soon', badgeColor: 'text-yellow-600 bg-white/60 dark:bg-white/10 dark:text-yellow-400' };
      case 'priority':
        return { badge: 'Expiring', badgeColor: 'text-red-500 bg-white/60 dark:bg-white/10 dark:text-red-400' };
      default:
        return { badge: '', badgeColor: '' };
    }
  };

  const filteredItems = items
    .filter((item) => item.location.toLowerCase() === activeTab.toLowerCase())
    .map((item) => ({
      ...item,
      ...getBadgeInfo(item.freshness),
    }));

  const handleDelete = async (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    await setInventory(next);
  };

  const handleUpdateName = async (id: string, name: string) => {
    const next = items.map((i) => (i.id === id ? { ...i, name } : i));
    setItems(next);
    await setInventory(next);
  };

  const handleAddLocation = () => {
    if (newLocationName.trim()) {
      setTabs((prev) => [...prev, newLocationName.trim().toLowerCase()]);
      setActiveTab(newLocationName.trim().toLowerCase());
      setNewLocationName('');
      setIsAddLocationOpen(false);
    }
  };

  const handleAddItem = async (name: string, _image?: string) => {
    // Add new item via Voice/Text
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: name,
      quantity: 1,
      unit: 'pcs',
      freshness: 'fresh',
      location: activeTab as any, // Fallback type cast
      addedAt: Date.now(),
    };
    const next = [newItem, ...items];
    setItems(next);
    await setInventory(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-display text-slate-900 overflow-hidden bg-black">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-white/5 dark:bg-black/20 backdrop-blur-[2px] z-0" />

      {/* Background Image (Optional, matching home) */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1584269600464-3704b6c3a379?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center opacity-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full w-full">
        {/* Header - Floating Dark Pill */}
        <header className="px-4 pt-14 pb-2 flex justify-center z-30 shrink-0">
          <div className="w-full max-w-[340px] h-12 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-between px-1.5 shadow-2xl">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px] font-bold">arrow_back_ios_new</span>
            </button>
            <h1 className="text-[15px] font-bold tracking-wide text-white">Inventory</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="px-4 pb-4 flex justify-center z-20 shrink-0">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center p-1 shadow-lg overflow-x-auto no-scrollbar max-w-full">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsAddLocationOpen(true)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors ml-1 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>

        {/* List */}
        <main className="flex-1 overflow-y-auto px-6 pt-2 pb-32 no-scrollbar z-10 w-full max-w-lg mx-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <SwipeableInventoryItem
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onUpdateName={handleUpdateName}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 opacity-40">
              <span className="material-symbols-outlined text-4xl mb-2 text-white">inbox</span>
              <p className="text-white font-medium capitalize">No items in {activeTab}</p>
            </div>
          )}
        </main>

        {/* Add Location Modal */}
        {isAddLocationOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
              onClick={() => setIsAddLocationOpen(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-xs liquid-modal dark:bg-[#1E1E1E] rounded-[2rem] p-6 shadow-2xl border border-white/40">
              <h3 className="text-lg font-bold text-center mb-6 text-slate-900 dark:text-white tracking-tight">
                New Location
              </h3>
              <div className="relative mb-6">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Basement"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
                  className="w-full bg-slate-100/50 dark:bg-white/5 border-none rounded-2xl px-4 py-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 placeholder-slate-400 font-medium text-center focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddLocationOpen(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-200/50 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="flex-1 py-3.5 rounded-2xl bg-[#007AFF] text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Floating Bar */}
        <NewCravingSlider
          onCravingIdentified={handleAddItem}
          title="New Item"
          subtitle="Speak to add..."
          variant="dark"
          skipImageGeneration={true}
        />
      </div>
    </div>
  );
}

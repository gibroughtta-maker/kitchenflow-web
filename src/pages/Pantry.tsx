import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getPantryStaples,
    addPantryStaple,
    incrementPantryScore,
    decrementPantryScore,
    deletePantryStaple,
    type PantryStaple,
} from '../services/pantryService';
import { getDeviceId } from '../services/supabaseClient';
import PantryItemCard from '../components/PantryItemCard';

export default function Pantry() {
    const navigate = useNavigate();
    const [items, setItems] = useState<PantryStaple[]>([]);
    const [loading, setLoading] = useState(true);
    const [newItemName, setNewItemName] = useState('');
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const deviceId = getDeviceId();

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getPantryStaples(deviceId);
            setItems(data);
        } catch (err) {
            console.error(err);
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newItemName.trim() || adding) return;

        try {
            setAdding(true);
            await addPantryStaple(deviceId, newItemName.trim());
            setNewItemName('');
            await loadItems();
        } catch (err) {
            console.error(err);
            alert('Failed to add item');
        } finally {
            setAdding(false);
        }
    };

    const handleIncrement = async (id: string) => {
        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, score: Math.min(100, item.score + 20) } : item
        ));
        try {
            await incrementPantryScore(id, 20);
            loadItems(); // Refresh to be sure
        } catch (err) {
            console.error(err);
            loadItems(); // Revert
        }
    };

    const handleDecrement = async (id: string) => {
        // Optimistic update
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, score: Math.max(0, item.score - 10) } : item
        ));
        try {
            await decrementPantryScore(id, 10);
            loadItems();
        } catch (err) {
            console.error(err);
            loadItems();
        }
    };

    const handleDelete = async (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        try {
            await deletePantryStaple(id);
        } catch (err) {
            console.error(err);
            loadItems();
        }
    };

    // Group items
    const lowStockItems = items.filter(item => item.score < 30);
    const mediumStockItems = items.filter(item => item.score >= 30 && item.score < 60);
    const wellStockedItems = items.filter(item => item.score >= 60);

    return (
        <div className="flex flex-col h-full">
            {/* Background (mimic Layout but specialized if needed, Layout handles general bg) */}

            {/* Header - Matches ShoppingList style */}
            <header className="px-6 pt-4 pb-2 z-20 flex justify-center shrink-0">
                <div className="w-full max-w-[340px] h-12 bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/15 rounded-full flex items-center justify-between px-1.5 shadow-2xl">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white active:scale-90"
                    >
                        <span className="material-symbols-outlined text-[20px] font-bold">arrow_back_ios_new</span>
                    </button>
                    <h1 className="text-[15px] font-bold tracking-wide text-white">Pantry Staples</h1>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-4 pb-32 no-scrollbar">
                {/* Add Section */}
                <form onSubmit={handleAddItem} className="mb-8">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Add staple (e.g. Rice, Salt)"
                            className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:bg-white/20 transition-all font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!newItemName.trim() || adding}
                            className="bg-[#007AFF] text-white px-5 rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                        >
                            {adding ? '...' : 'Add'}
                        </button>
                    </div>
                </form>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : error ? (
                    <div className="text-red-400 text-center">{error}</div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <span className="text-6xl mb-4">🥫</span>
                        <h3 className="text-white text-xl font-bold mb-2">No Staples Yet</h3>
                        <p className="text-white/60 text-center max-w-xs">Add items you always keep in stock to track inventory levels.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Low Stock */}
                        {lowStockItems.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-red-400 text-sm font-bold uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                    Low Stock ({lowStockItems.length})
                                </h2>
                                {lowStockItems.map(item => (
                                    <PantryItemCard
                                        key={item.id}
                                        item={item}
                                        onIncrement={() => handleIncrement(item.id)}
                                        onDecrement={() => handleDecrement(item.id)}
                                        onDelete={() => handleDelete(item.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Medium Stock */}
                        {mediumStockItems.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <h2 className="text-orange-400 text-sm font-bold uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                                    Medium Stock ({mediumStockItems.length})
                                </h2>
                                {mediumStockItems.map(item => (
                                    <PantryItemCard
                                        key={item.id}
                                        item={item}
                                        onIncrement={() => handleIncrement(item.id)}
                                        onDecrement={() => handleDecrement(item.id)}
                                        onDelete={() => handleDelete(item.id)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Well Stocked */}
                        {wellStockedItems.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                <h2 className="text-green-400 text-sm font-bold uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                                    Well Stocked ({wellStockedItems.length})
                                </h2>
                                {wellStockedItems.map(item => (
                                    <PantryItemCard
                                        key={item.id}
                                        item={item}
                                        onIncrement={() => handleIncrement(item.id)}
                                        onDecrement={() => handleDecrement(item.id)}
                                        onDelete={() => handleDelete(item.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

import { PantryStaple } from '../services/pantryService';

interface PantryItemCardProps {
    item: PantryStaple;
    onIncrement: () => void;
    onDecrement: () => void;
    onDelete: () => void;
}

export default function PantryItemCard({
    item,
    onIncrement,
    onDecrement,
    onDelete,
}: PantryItemCardProps) {
    // Determine stock level color
    const getStockColor = (score: number) => {
        if (score < 30) return 'bg-red-500 text-red-100 border-red-400/30';
        if (score < 60) return 'bg-orange-500 text-orange-100 border-orange-400/30';
        return 'bg-green-500 text-green-100 border-green-400/30';
    };

    // Determine stock level text
    const getStockText = (score: number) => {
        if (score === 0) return 'Out of Stock';
        if (score < 30) return 'Low Stock';
        if (score < 60) return 'Medium Stock';
        return 'Well Stocked';
    };

    const stockColorClass = getStockColor(item.score); // For badges/progress
    const stockText = getStockText(item.score);

    return (
        <div className="glass-panel rounded-2xl p-4 mb-3 flex flex-col gap-3 group relative overflow-hidden transition-all hover:bg-white/10">
            {/* Header */}
            <div className="flex justify-between items-center z-10">
                <h3 className="text-white font-bold text-lg truncate flex-1">{item.name}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border bg-opacity-20 backdrop-blur-md ${stockColorClass}`}>
                    {stockText}
                </span>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-3 z-10">
                <div className="flex-1 h-2.5 bg-black/20 rounded-full overflow-hidden border border-white/5">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${item.score < 30 ? 'bg-red-500' : item.score < 60 ? 'bg-orange-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.max(5, item.score)}%` }} // Min width 5%
                    />
                </div>
                <span className="text-white/60 text-xs font-medium w-8 text-right">{item.score}%</span>
            </div>

            {/* Controls */}
            <div className="flex gap-3 z-10 pt-1">
                <button
                    onClick={onDecrement}
                    disabled={item.score === 0}
                    className="flex-1 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 active:bg-red-500/40 disabled:opacity-30 disabled:cursor-not-allowed border border-red-500/20 text-red-200 text-sm font-bold transition-colors flex justify-center items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[16px]">remove</span>
                    Use
                </button>
                <button
                    onClick={onIncrement}
                    disabled={item.score === 100}
                    className="flex-1 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 active:bg-green-500/40 disabled:opacity-30 disabled:cursor-not-allowed border border-green-500/20 text-green-200 text-sm font-bold transition-colors flex justify-center items-center gap-1"
                >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Restock
                </button>
            </div>

            {/* Delete Button (Corner or Long Press equivalent) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${item.name}"?`)) onDelete();
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-white/10 hover:text-red-400 hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Item"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
}

import type { ShoppingRouteResult } from '../services/gemini';

interface ShoppingRouteModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: ShoppingRouteResult | null;
    isLoading: boolean;
}

export default function ShoppingRouteModal({ isOpen, onClose, result, isLoading }: ShoppingRouteModalProps) {
    if (!isOpen) return null;

    return (
        // Fixed fullscreen overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Card - Responsive */}
            <div className="relative w-full max-w-[360px] max-h-[80vh] liquid-modal dark:bg-[#1E1E1E]/95 bg-white/95 backdrop-blur-xl rounded-[2rem] p-5 shadow-2xl border border-white/20 flex flex-col gap-4 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Handle Bar */}
                <div className="w-12 h-1.5 bg-gray-300/30 rounded-full mx-auto shrink-0" />

                {isLoading ? (
                    <div className="flex flex-col items-center py-8 gap-4">
                        <div className="w-12 h-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 font-medium animate-pulse">Planning best route...</p>
                    </div>
                ) : result ? (
                    <>
                        {/* Header - Fixed */}
                        <div className="text-center space-y-1 shrink-0">
                            <h3 className="text-lg font-bold dark:text-white text-[#1C1C1E] tracking-tight">
                                Shopping Route
                            </h3>
                            <p className="text-xs dark:text-gray-400 text-gray-500 font-medium line-clamp-2 px-2">
                                {result.overview}
                            </p>
                        </div>

                        {/* Route Steps - Scrollable */}
                        <div className="flex-1 min-h-0 overflow-y-auto">
                            <div className="w-full flex flex-col gap-3 relative pr-1">
                                {/* Vertical Line */}
                                <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700" />

                                {result.steps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className={`
                                            w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2 dark:border-[#1E1E1E] border-white
                                            ${idx === 0 ? 'bg-blue-100 text-blue-600' :
                                                idx === result.steps.length - 1 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}
                                        `}>
                                            <span className="material-symbols-outlined text-[16px]">
                                                {idx === 0 ? 'turn_right' :
                                                    idx === result.steps.length - 1 ? 'flag' : 'straight'}
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <h4 className="font-semibold text-[13px] dark:text-white text-[#1C1C1E] leading-snug">
                                                {step.instruction}
                                            </h4>
                                            <p className="text-[11px] dark:text-gray-400 text-gray-500 mt-0.5">
                                                {step.distance} • {step.duration}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer - Fixed */}
                        <div className="shrink-0 flex flex-col gap-3 pt-3 border-t border-gray-200/10">
                            {/* Stats */}
                            <div className="flex items-center justify-center gap-2 text-sm font-medium dark:text-gray-300 text-gray-600">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                <span>Total: <b className="dark:text-white text-[#1C1C1E]">{result.totalDuration}</b></span>
                            </div>

                            {/* Open in Maps Button */}
                            <a
                                href={result.mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-11 bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">map</span>
                                Open in Maps
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        Could not plan route. Please try again.
                    </div>
                )}
            </div>
        </div>
    );
}

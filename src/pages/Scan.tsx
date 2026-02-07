import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { scanFridge, getInventory } from '../services/api';
import type { FridgeSnapshotResult } from '../types';

type StorageLocation = 'fridge' | 'freezer' | 'pantry' | string;

export default function Scan() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [scanResult, setScanResult] = useState<FridgeSnapshotResult | null>(null);

  // Custom Location State
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');

  // Dynamic Locations from Inventory
  const [existingLocations, setExistingLocations] = useState<string[]>(['fridge', 'freezer', 'pantry']);

  useEffect(() => {
    // Fetch existing locations from inventory to show as options
    getInventory().then(items => {
      const locs = new Set<string>(['fridge', 'freezer', 'pantry']);
      items.forEach(i => {
        if (i.location) locs.add(i.location.toLowerCase());
      });
      setExistingLocations(Array.from(locs));
    }).catch(console.error);
  }, []);

  const onSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next = Array.from(list).slice(0, 5);
    setFiles(next);
    const urls = next.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => {
      prev.forEach(URL.revokeObjectURL);
      return urls;
    });
    setError('');
  }, []);

  // Check for captured file from Home camera
  const location = useLocation();
  useEffect(() => {
    const state = location.state as { capturedFile?: File } | null;
    if (state?.capturedFile) {
      const file = state.capturedFile;
      setFiles([file]);
      setPreviews([URL.createObjectURL(file)]);
      // Optional: Auto-start scan? Maybe better to let user confirm.
      // But user context implies "taking a photo", so maybe just showing it is enough for now.
      // Clear state to avoid re-play? Routes handle this.
    }
  }, [location.state]);

  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) resolve({ mimeType: match[1], base64: match[2] });
        else reject(new Error('parse'));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleScan = async () => {
    if (files.length === 0) {
      setError('请先选择 1～5 张照片');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const images = await Promise.all(files.map(fileToBase64));
      const result = await scanFridge(images);

      if (!result?.items?.length) {
        setError('未识别到食材，请重试或换几张照片');
        setLoading(false);
        return;
      }

      // Store result and show modal instead of navigating immediately
      setScanResult(result);
      setLoading(false);
      setShowLocationModal(true);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '扫描失败，请重试');
      setLoading(false);
    }
  };

  const handleLocationConfirm = (location: StorageLocation) => {
    if (!scanResult) return;

    const withLocation: FridgeSnapshotResult = {
      items: scanResult.items.map((i) => ({ ...i, storageLocation: location })),
      scanQuality: scanResult.scanQuality ?? 'medium',
    };

    navigate('/scan-results', { state: { result: withLocation } });
  };

  return (
    <div className="space-y-6 relative">
      <label className="block w-full aspect-[2/1] max-h-52 rounded-3xl glass-frame overflow-hidden relative cursor-pointer bg-white/5 transition-all active:scale-[0.98]">
        <input type="file" accept="image/*" multiple className="hidden" onChange={onSelect} />
        {previews[0] ? (
          <img src={previews[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-glass-secondary">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-80">photo_camera</span>
            <span className="text-sm font-medium">点击选择照片（1～5 张）</span>
          </div>
        )}
      </label>

      {previews.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {previews.map((src, i) => (
            <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0 border border-white/10" />
          ))}
        </div>
      )}

      {error && <p className="text-red-300 text-sm bg-red-500/10 px-4 py-2 rounded-xl text-center backdrop-blur-md">{error}</p>}

      <button
        type="button"
        onClick={handleScan}
        disabled={loading || files.length === 0}
        className="btn-primary-glass disabled:opacity-50 disabled:cursor-not-allowed mt-8"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
            AI 识别中…
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">center_focus_weak</span>
            开始扫描
          </>
        )}
      </button>

      {/* Location Selection Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-fade-in" onClick={() => setShowLocationModal(false)} />

          <div className="w-full max-w-[340px] max-h-[80vh] overflow-y-auto no-scrollbar milky-glass-modal rounded-[2rem] p-6 relative z-10 animate-slide-in shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/20">
            <h3 className="text-white text-xl font-bold text-center mb-6 drop-shadow-md">Add to Location?</h3>

            {isAddingLocation ? (
              <div className="space-y-4 animate-slide-in">
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Wine Cellar"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLocationName.trim()) {
                      handleLocationConfirm(newLocationName.trim());
                    }
                  }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsAddingLocation(false)}
                    className="flex-1 py-3 text-glass-secondary font-medium hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newLocationName.trim()) handleLocationConfirm(newLocationName.trim());
                    }}
                    className="flex-1 py-3 bg-blue-500 rounded-xl text-white font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {existingLocations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => handleLocationConfirm(loc)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl liquid-card hover:bg-white/10 transition-all active:scale-[0.98] group border border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center border border-white/20 group-hover:border-white/40 transition-colors">
                          <span className="text-xl">
                            {loc === 'fridge' ? '❄️' : loc === 'freezer' ? '🧊' : loc === 'pantry' ? '🥫' : '📦'}
                          </span>
                        </div>
                        <span className="text-white font-medium text-lg capitalize">{loc}</span>
                      </div>
                      <div className="size-6 rounded-full border-2 border-white/30 group-hover:border-white/60 transition-colors relative">
                        <div className="absolute inset-1 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  className="w-full mt-6 py-3 text-glass-secondary text-sm font-medium hover:text-white transition-colors"
                  onClick={() => setIsAddingLocation(true)}
                >
                  + Add New Location
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

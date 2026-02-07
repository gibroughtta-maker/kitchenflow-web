import { useNavigate } from 'react-router-dom';
import { useCamera } from '../contexts/CameraContext';

export default function Home() {
  const navigate = useNavigate();
  const { isCameraActive, setIsCameraActive, capturePhoto } = useCamera();

  const handleMainButtonClick = async () => {
    if (!isCameraActive) {
      setIsCameraActive(true);
    } else {
      // Capture photo and navigate
      if (capturePhoto) { // Check if function exists
        const file = await capturePhoto();
        if (file) {
          navigate('/scan', { state: { capturedFile: file } });
        } else {
          // Fallback if capture fails (e.g. video not ready)
          navigate('/scan');
        }
      } else {
        navigate('/scan');
      }
    }
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 relative">
      {/* 中间取景框 + 提示 */}
      {!isCameraActive && (
        <div className="flex-1 flex items-center justify-center px-6 pointer-events-none">
          <div className="relative w-72 h-72 rounded-[32px] overflow-hidden flex items-center justify-center">
            {/* 取景框四角 */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-white/80 rounded-tl-2xl z-10" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-white/80 rounded-tr-2xl z-10" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-white/80 rounded-bl-2xl z-10" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-white/80 rounded-br-2xl z-10" />
            {/* 扫描线动效（与 AI Studio 一致）*/}
            <div className="absolute left-0 right-0 h-[2px] bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] animate-scan-y opacity-80" />
            {/* 取景框内提示 */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10">
              <div className="glass-panel !bg-white/10 !border-white/20 rounded-full px-4 py-1.5 flex items-center gap-2 backdrop-blur-md border">
                <span className="material-symbols-outlined text-white text-base">center_focus_weak</span>
                <span className="text-white text-xs font-medium tracking-wide">Point at your fridge to scan</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部：渐变 + 快门 */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-24 px-5 flex flex-col items-center justify-end bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none z-20">
        <div className="pointer-events-auto flex flex-col items-center gap-8 w-full max-w-[340px]">
          {/* 快门 → Activate Camera or Scan */}
          <button
            type="button"
            onClick={handleMainButtonClick}
            className="group relative w-20 h-20 rounded-full border-[4px] border-white/30 flex items-center justify-center transition-all active:scale-90 hover:border-white/50"
            aria-label={isCameraActive ? "扫描冰箱" : "开启相机"}
          >
            <div className={`w-[66px] h-[66px] bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.3)] group-hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-shadow ${!isCameraActive ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

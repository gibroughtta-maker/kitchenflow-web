import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavigationDrawer from './NavigationDrawer';

const titles: Record<string, string> = {
  '/': 'KitchenFlow',
  '/scan': '扫描冰箱',
  '/scan-results': '扫描结果',
  '/cravings': '想吃清单',
  '/shopping': '购物清单',
  '/inventory': '库存',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const title = titles[path] ?? 'KitchenFlow';
  const isHome = path === '/';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollBottomPadding = path === '/scan-results' ? 'pb-44' : 'pb-8';

  // Gesture Logic - Use refs to avoid re-renders during swipe
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      setDrawerOpen(true);
    }

    if (isLeftSwipe && drawerOpen) {
      setDrawerOpen(false);
    }
  };

  return (
    <div
      className="immersive-bg fixed inset-0 min-h-[100dvh] touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="immersive-overlay absolute inset-0 z-0" />
      <div
        className={`relative z-10 flex min-h-full w-full flex-col overflow-y-auto overflow-x-hidden no-scrollbar ${scrollBottomPadding}`}
      >
        <header className="sticky top-0 z-50 flex w-full items-center justify-between px-5 pt-6 pb-4 shrink-0">
          {isHome ? (
            /* 首页：药丸栏（网格 + 标题 + 右侧占位）*/
            <div className="flex flex-1 justify-center w-full px-6">
              <div className="flex flex-1 max-w-[340px] items-center justify-between gap-3 glass-panel-thick !bg-black/30 !backdrop-blur-xl !border-white/10 rounded-full px-5 py-3 shadow-lg">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="p-1 rounded-full text-glass-primary hover:bg-white/10 active:scale-90 transition-colors transition-transform duration-200"
                  aria-label="打开菜单"
                >
                  <span className="material-symbols-outlined text-white text-[24px]">grid_view</span>
                </button>
                <span className="text-white font-bold tracking-wide text-base flex-1 text-center">KitchenFlow</span>
                <div className="w-8 shrink-0" aria-hidden />
              </div>
            </div>
          ) : (
            /* 子页：返回 + 标题 */
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="liquid-card flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/20 active:scale-90 transition-colors transition-transform duration-200 text-white"
                aria-label="返回"
              >
                <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
              </button>
              <h1 className="text-glass-primary text-lg font-bold tracking-wide truncate">
                {title}
              </h1>
              <div className="size-10 shrink-0" />
            </>
          )}
        </header>

        <main className={`flex-1 w-full min-w-0 flex flex-col ${isHome ? 'p-0' : 'px-5 pt-2'}`}>
          {children}
        </main>
      </div>

      <NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

import { useNavigate } from 'react-router-dom';

const navItems: { path: string; label: string; sub: string; icon: string; iconGradient: string }[] = [
  { path: '/cravings', label: '想吃清单', sub: 'Cravings', icon: 'ramen_dining', iconGradient: 'bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/20' },
  { path: '/inventory', label: '库存', sub: 'Inventory', icon: 'inventory_2', iconGradient: 'bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-500/20' },
  { path: '/shopping', label: '购物清单', sub: 'Shopping List', icon: 'shopping_cart', iconGradient: 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20' },
];

export default function NavigationDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-md transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div
        className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] z-[70] transition-transform duration-500 ease-drawer ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        aria-modal="true"
        aria-label="主导航"
        hidden={!isOpen}
      >
        <div className="h-full w-full bg-white/20 dark:bg-black/60 backdrop-blur-[50px] border-r border-white/20 shadow-2xl overflow-hidden relative flex flex-col">
          <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[60%] bg-gradient-to-br from-blue-400/20 to-transparent blur-3xl opacity-40 rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[50%] bg-gradient-to-tl from-purple-400/20 to-transparent blur-3xl opacity-30 rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col h-full px-8 py-12">
            <div className="flex flex-col mb-10 pl-2">
              <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-sm">KitchenFlow</h1>
              <p className="text-white/60 text-xs mt-1 font-medium tracking-wide pl-0.5 uppercase">Liquid Assistant</p>
            </div>

            <nav className="flex-1 space-y-6">
              {navItems.map(({ path, label, sub, icon, iconGradient }) => (
                <div key={path} role="button" tabIndex={0} onClick={() => handleNav(path)} onKeyDown={(e) => e.key === 'Enter' && handleNav(path)} className="group relative cursor-pointer active:scale-95 transition-transform duration-200">
                  <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br from-white/10 to-white/5 hover:bg-white/20 transition-colors backdrop-blur-md p-4 flex items-center space-x-4 shadow-glass-card">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-lg shrink-0 ${iconGradient}`}>
                      <span className="material-symbols-outlined text-xl text-white">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-base tracking-wide">{label}</h3>
                      <p className="text-white/60 text-[10px] font-medium truncate">{sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

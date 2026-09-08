import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  LogOut,
  Menu,
  X,
  Store,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

export type Page = 'dashboard' | 'pos' | 'products' | 'customers' | 'sales';

type LayoutProps = {
  current: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
};

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'sales', label: 'Sales History', icon: Receipt },
];

export function Layout({ current, onNavigate, children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Store className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">ELECTRO-POS</p>
            <p className="text-[10px] text-slate-400 leading-tight">Electronic Point of Sale</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.email ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-slate-500">Cashier</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-slate-900 text-white border-b border-slate-800">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">ELECTRO-POS</span>
          </div>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile close button when sidebar open */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed top-4 right-4 z-[60] lg:hidden text-white"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

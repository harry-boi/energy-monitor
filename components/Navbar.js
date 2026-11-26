'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, signOut } from '../lib/dataService.js';
import { 
  Zap, 
  LayoutDashboard, 
  Tv, 
  CalendarClock, 
  CreditCard, 
  BarChart3, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleSignOut = async () => {
    // Re-arm the dashboard alert summary so it greets the next sign-in.
    try { sessionStorage.removeItem('energyAlertModalShown'); } catch (e) {}
    await signOut();
    router.push('/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Appliances', href: '/appliances', icon: Tv },
    { label: 'Daily Usage', href: '/usage', icon: CalendarClock },
    { label: 'Recharges & Meter', href: '/recharges', icon: CreditCard },
    { label: 'Analysis', href: '/analysis', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings },
    { label: 'Reports', href: '/reports', icon: FileText },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      {/* Top Bar with Branding and Caretaker Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-950">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Link href="/" className="font-bold text-lg text-white hover:text-amber-400 transition">
                  Goodness Lodge
                </Link>
              </div>
              <div className="text-xs text-slate-400">Energy Monitoring & Prediction · Ikot Ekpene</div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2.5">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-200">Caretaker</div>
              <div className="text-[11px] text-slate-400">{user?.email || 'caretaker@goodnesslodge.example'}</div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1 text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded transition font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-white p-2 rounded-md"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links Bar */}
      <nav className="bg-slate-800 border-t border-slate-700/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-700 flex flex-col gap-2">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center space-x-1.5 text-xs bg-red-600 text-white py-2 rounded font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

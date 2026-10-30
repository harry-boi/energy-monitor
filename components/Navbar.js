'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getCurrentUser,
  signOut,
  resetToSampleData,
  clearAllData,
  getDataMode,
} from '../lib/dataService.js';
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
  RotateCcw,
  Trash2,
  Sparkles,
  Menu,
  X
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dataMode, setDataMode] = useState('sample');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setDataMode(getDataMode());
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleResetSampleData = () => {
    if (confirm('Load Goodness Lodge sample report scenario (14–20 Oct 2026)?')) {
      resetToSampleData();
      window.location.reload();
    }
  };

  const handleClearAllData = () => {
    if (
      confirm(
        'Are you sure you want to CLEAR ALL DATA and start completely fresh?\n\nThis will remove all sample appliances, recharges, meter readings, and usage records so you can begin live tracking for your actual lodge.'
      )
    ) {
      clearAllData();
      window.location.reload();
    }
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
                {/* Data Mode Indicator Badge */}
                {dataMode === 'clean' ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Live Real Tracking
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                    Sample Report Data
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400">Energy Monitoring & Prediction · Ikot Ekpene</div>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2.5">
            {dataMode === 'sample' ? (
              <button
                onClick={handleClearAllData}
                title="Wipe sample data and start fresh with blank lodge"
                className="flex items-center space-x-1.5 text-xs text-red-300 hover:text-white bg-red-950/60 hover:bg-red-800 px-2.5 py-1.5 rounded border border-red-700/60 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Start Fresh (Clear Sample Data)</span>
              </button>
            ) : (
              <button
                onClick={handleResetSampleData}
                title="Reload the Goodness Lodge report sample data"
                className="flex items-center space-x-1.5 text-xs text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-800 px-2.5 py-1.5 rounded border border-amber-700/60 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Load Sample Report Data</span>
              </button>
            )}

            <div className="h-6 w-px bg-slate-700 mx-1"></div>

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
            {dataMode === 'sample' ? (
              <button
                onClick={handleClearAllData}
                className="flex items-center justify-center space-x-1.5 text-xs text-red-200 bg-red-900/60 py-2 rounded border border-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Start Fresh (Clear Sample Data)</span>
              </button>
            ) : (
              <button
                onClick={handleResetSampleData}
                className="flex items-center justify-center space-x-1.5 text-xs text-amber-200 bg-amber-900/60 py-2 rounded border border-amber-700"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Load Sample Report Data</span>
              </button>
            )}
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

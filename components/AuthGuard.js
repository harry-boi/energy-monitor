'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/dataService.js';

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Login page does not require auth
    if (pathname === '/login') {
      setAuthorized(true);
      setChecking(false);
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      setAuthorized(false);
      router.replace('/login');
    } else {
      setAuthorized(true);
    }
    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center space-x-2 text-sm font-medium">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying authorization...</span>
        </div>
      </div>
    );
  }

  if (!authorized && pathname !== '/login') {
    return null;
  }

  return children;
}

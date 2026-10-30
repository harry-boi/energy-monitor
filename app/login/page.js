'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '../../lib/dataService.js';
import { Zap, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('caretaker@goodnesslodge.example');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn(email, password);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Access refused: invalid credentials.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('caretaker@goodnesslodge.example');
    setPassword('caretaker123');
    setError('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="inline-flex bg-amber-500 p-3 rounded-2xl text-slate-950 shadow-md mb-3">
            <Zap className="h-8 w-8 fill-current" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Goodness Lodge</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Energy Monitoring & Prediction System · Ikot Ekpene
          </p>
          <div className="mt-3 text-sm font-medium text-slate-700 bg-slate-100 py-1.5 px-3 rounded-lg inline-block border border-slate-200">
            Caretaker Sign-in
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-3 text-red-700 text-sm">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <span className="font-semibold">Access refused:</span> {error}
            </div>
          </div>
        )}

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Email
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="caretaker@goodnesslodge.example"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Password
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition disabled:opacity-50"
            >
              {loading ? 'Verifying credentials...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline"
          >
            Fill Demo Credentials (caretaker123)
          </button>
          <span className="text-[11px] text-slate-400 mt-1">
            Sign-in is restricted to the Goodness Lodge Caretaker.
          </span>
        </div>
      </div>
    </div>
  );
}

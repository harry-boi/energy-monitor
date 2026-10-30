'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../lib/dataService.js';
import { Settings as SettingsIcon, Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    averaging_days: 7,
    alert_days: 3,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await getSettings();
        if (s) {
          setForm({
            averaging_days: s.averaging_days || 7,
            alert_days: s.alert_days || 3,
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await saveSettings(form);
      setSuccess('Alert and calculation settings saved successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Alert Preferences & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure prediction averaging parameters and low-energy warning thresholds.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded text-red-700 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3.5 rounded text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Settings Form (Matching Figure 3.11) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Recent days used for the average
            </label>
            <input
              type="number"
              min="3"
              max="30"
              required
              value={form.averaging_days}
              onChange={(e) => setForm({ ...form, averaging_days: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default is 7 days. Must be between 3 and 30 days.
            </span>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Warn when the recharge will last (days) or less
            </label>
            <input
              type="number"
              min="2"
              max="14"
              required
              value={form.alert_days}
              onChange={(e) => setForm({ ...form, alert_days: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Default is 3 days. Triggers a LOW alert when projected recharge duration falls below this threshold. Must be between 2 and 14 days.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition text-xs disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../lib/dataService.js';
import { Settings as SettingsIcon, Save, CheckCircle, AlertCircle, Mail, Send } from 'lucide-react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    averaging_days: 7,
    alert_days: 3,
    alert_email: '',
    alerts_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const s = await getSettings();
        if (s) {
          setForm({
            averaging_days: s.averaging_days || 7,
            alert_days: s.alert_days || 3,
            alert_email: s.alert_email || '',
            alerts_enabled: Boolean(s.alerts_enabled),
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

  const handleTestAlert = async () => {
    setTestMsg('');
    setError('');
    setTesting(true);
    try {
      // Save first so the test goes to the address currently in the form.
      await saveSettings(form);
      const res = await fetch('/api/alerts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Test alert failed.');
      }
      if (data.email && data.email.sent) {
        setTestMsg(`Test alert sent to ${data.email.to}. Check that inbox.`);
      } else if (data.email && data.email.dryRun) {
        setTestMsg(
          'Settings saved, but the mail server is not configured on the deployment yet (RESEND_API_KEY / ALERT_FROM_EMAIL), so no email actually went out.'
        );
      } else {
        setTestMsg('Test request completed.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Alert Preferences & Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure prediction averaging parameters and low-energy warning thresholds.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-3.5 rounded text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-3.5 rounded text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Settings Form (Matching Figure 3.11) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              Recent days used for the average
            </label>
            <input
              type="number"
              min="3"
              max="30"
              required
              value={form.averaging_days}
              onChange={(e) => setForm({ ...form, averaging_days: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
              Default is 7 days. Must be between 3 and 30 days.
            </span>
          </div>

          <div>
            <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
              Warn when the recharge will last (days) or less
            </label>
            <input
              type="number"
              min="2"
              max="14"
              required
              value={form.alert_days}
              onChange={(e) => setForm({ ...form, alert_days: Number(e.target.value) })}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
              Default is 3 days. Triggers a LOW alert when projected recharge duration falls below this threshold. Must be between 2 and 14 days.
            </span>
          </div>

          {/* Email Alerts */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Email alerts
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              The dashboard shows the alert status in the app. Email alerts also reach the
              caretaker without opening the app: a scheduled check runs every day, and when the
              projected depletion falls to Low or Critical, one email is sent for that episode.
            </p>

            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.alerts_enabled}
                onChange={(e) => setForm({ ...form, alerts_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-amber-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-200">Enable email alerts</span>
            </label>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                Caretaker email for alerts
              </label>
              <input
                type="email"
                placeholder="caretaker@example.com"
                value={form.alert_email}
                onChange={(e) => setForm({ ...form, alert_email: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                Low and Critical alerts are sent to this address.
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleTestAlert}
                disabled={testing}
                className="inline-flex items-center space-x-2 py-2 px-4 bg-white dark:bg-slate-900 border border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 font-bold rounded-lg transition text-xs disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{testing ? 'Sending...' : 'Send test alert'}</span>
              </button>
              {testMsg && <span className="text-[11px] text-slate-500 dark:text-slate-400">{testMsg}</span>}
            </div>
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

'use client';

import { useState, useEffect } from 'react';
import {
  getAppliances,
  getUsageRecords,
  saveDailyUsage,
  deleteDailyUsage,
  getDataMode,
} from '../../lib/dataService.js';
import {
  estimateApplianceEnergy,
  estimateDailyEnergy,
} from '../../lib/calculations.js';
import {
  Calendar,
  Sparkles,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Trash2,
} from 'lucide-react';

export default function DailyUsagePage() {
  const [appliances, setAppliances] = useState([]);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState('2026-10-14');
  const [hasExistingRecords, setHasExistingRecords] = useState(false);
  const [hoursMap, setHoursMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Set default date on mount
  useEffect(() => {
    const mode = getDataMode();
    if (mode === 'clean') {
      setSelectedDate(todayStr);
    }
  }, [todayStr]);

  // Load appliances & existing records for date
  const loadData = async (date) => {
    setLoading(true);
    try {
      const apps = await getAppliances();
      setAppliances(apps);

      const records = await getUsageRecords({ fromDate: date, toDate: date });
      const newHoursMap = {};

      if (records && records.length > 0) {
        setHasExistingRecords(true);
        records.forEach((r) => {
          newHoursMap[r.appliance_id] = r.hours;
        });
      } else {
        setHasExistingRecords(false);
        // If no records exist, default to estimated daily hours for ON appliances
        apps.forEach((a) => {
          newHoursMap[a.id] = (a.state || 'ON') === 'ON' ? a.daily_hours : 0;
        });
      }
      setHoursMap(newHoursMap);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleFillEstimatedHours = () => {
    const filled = {};
    appliances.forEach((a) => {
      filled[a.id] = (a.state || 'ON') === 'ON' ? a.daily_hours : 0;
    });
    setHoursMap(filled);
    setSuccess('Hours filled with estimated daily operating values.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleHourChange = (appId, val) => {
    setHoursMap((prev) => ({
      ...prev,
      [appId]: val,
    }));
  };

  // Live estimated energy calculation for the day (Figure 3.8)
  const usageItemsForCalculation = appliances.map((a) => ({
    power_watts: a.power_watts,
    quantity: a.quantity,
    hours: Number(hoursMap[a.id]) || 0,
  }));
  const liveDayEnergy = estimateDailyEnergy(usageItemsForCalculation);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = appliances.map((a) => ({
        appliance_id: a.id,
        power_watts: a.power_watts,
        quantity: a.quantity,
        hours: Number(hoursMap[a.id]) || 0,
      }));

      await saveDailyUsage(selectedDate, payload);
      setSuccess(`Daily usage records for ${selectedDate} saved successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Record Daily Usage</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record the hours for which appliances were operated on a specific day.
          </p>
        </div>
      </div>

      {/* Global Alerts */}
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

      {/* Main Daily Usage Form Container (Matching Figure 3.8) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Date Selection Control */}
        <div className="max-w-xs">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1.5">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            <span>Usage Date</span>
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Appliances Usage Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Appliance</th>
                <th className="py-3 px-4">Power Rating</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4 w-44">Hours used</th>
                <th className="py-3 px-4 text-right">Est. Energy (kWh)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {appliances.map((app) => {
                const currentHours = hoursMap[app.id] ?? 0;
                const recEnergy = estimateApplianceEnergy(
                  app.power_watts,
                  app.quantity,
                  currentHours
                );

                return (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {app.name}
                      <span className="text-[11px] font-normal text-slate-400 block">
                        Category: {app.category} · State: {app.state || 'ON'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{app.power_watts} W</td>
                    <td className="py-3 px-4">{app.quantity}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="any"
                          required
                          value={currentHours}
                          onChange={(e) => handleHourChange(app.id, e.target.value)}
                          className="w-24 p-1.5 border border-slate-300 rounded text-sm text-center font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                        />
                        <span className="text-slate-400 text-xs">hrs</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {recEnergy.toFixed(2)} kWh
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Live Estimated Energy for the Day (Figure 3.8) */}
        <div className="p-4 bg-slate-900 text-white rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold">Estimated energy for the day:</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {liveDayEnergy.toFixed(1)} <span className="text-sm font-normal text-slate-300">kWh</span>
          </div>
        </div>

        {/* Actions (Figure 3.8 Buttons) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleFillEstimatedHours}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 rounded-lg transition"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>Fill with estimated hours</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 px-6 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

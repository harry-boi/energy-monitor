'use client';

import { useState, useEffect } from 'react';
import {
  getRecharges,
  saveRecharge,
  deleteRecharge,
  getMeterReadings,
  saveMeterReading,
  deleteMeterReading,
  getUsageRecords,
  getDataMode,
} from '../../lib/dataService.js';
import {
  costPerKwh,
  estimateBalance,
  calculateMeterDifference,
  formatNaira,
} from '../../lib/calculations.js';
import {
  CreditCard,
  Gauge,
  Plus,
  Save,
  CheckCircle,
  AlertCircle,
  Coins,
  History,
  Calendar,
  Trash2,
} from 'lucide-react';

export default function RechargesAndMeterPage() {
  const [recharges, setRecharges] = useState([]);
  const [readings, setReadings] = useState([]);
  const [usageRecords, setUsageRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('recharge'); // 'recharge' | 'meter'

  // Default date to today
  const todayStr = new Date().toISOString().split('T')[0];

  // Recharge Form State (Figure 3.9)
  const [rechargeForm, setRechargeForm] = useState({
    recharge_date: '2026-10-14',
    amount_naira: 40000,
    units_kwh: 200,
  });

  // Meter Reading Form State (Figure 3.10)
  const [readingForm, setReadingForm] = useState({
    reading_date: '2026-10-20',
    balance_kwh: 90.0,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = async () => {
    try {
      const [recList, readList, uList] = await Promise.all([
        getRecharges(),
        getMeterReadings(),
        getUsageRecords(),
      ]);
      setRecharges(recList);
      setReadings(readList);
      setUsageRecords(uList);

      // If in clean mode or no records, default forms to today
      const mode = getDataMode();
      if (mode === 'clean' || recList.length === 0) {
        setRechargeForm((prev) => ({ ...prev, recharge_date: todayStr }));
        setReadingForm((prev) => ({ ...prev, reading_date: todayStr }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live Calculations for Recharge Form
  const liveCostPerKwh = costPerKwh(
    rechargeForm.amount_naira,
    rechargeForm.units_kwh
  );

  // Live Calculations for Meter Reading Form
  // Estimated balance up to the reading date
  const estBalResult = estimateBalance(recharges, usageRecords, null);
  const liveDifference = calculateMeterDifference(
    readingForm.balance_kwh,
    estBalResult.balance
  );

  const handleSaveRecharge = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await saveRecharge(rechargeForm);
      setSuccess('Prepaid electricity recharge recorded successfully.');
      setTimeout(() => setSuccess(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveReading = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await saveMeterReading(readingForm, estBalResult.balance);
      setSuccess('Prepaid meter balance reading recorded successfully.');
      setTimeout(() => setSuccess(''), 4000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteRecharge = async (id) => {
    if (!confirm('Are you sure you want to delete this recharge purchase?')) return;
    try {
      await deleteRecharge(id);
      setSuccess('Recharge record deleted.');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteReading = async (id) => {
    if (!confirm('Are you sure you want to delete this meter reading?')) return;
    try {
      await deleteMeterReading(id);
      setSuccess('Meter reading record deleted.');
      setTimeout(() => setSuccess(''), 3000);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Recharges & Meter Readings
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record prepaid electricity token purchases and physical meter balance readings to reconcile estimates.
        </p>
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

      {/* Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('recharge'); setError(''); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'recharge'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Record Prepaid Recharge</span>
        </button>
        <button
          onClick={() => { setActiveTab('meter'); setError(''); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'meter'
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gauge className="h-4 w-4" />
          <span>Record Meter Balance Reading</span>
        </button>
      </div>

      {/* TAB 1: RECHARGE MODULE (Matching Figure 3.9) */}
      {activeTab === 'recharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharge Input Form */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <span>New Recharge</span>
            </h2>

            <form onSubmit={handleSaveRecharge} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={rechargeForm.recharge_date}
                  onChange={(e) => setRechargeForm({ ...rechargeForm, recharge_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Amount paid (₦)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={rechargeForm.amount_naira}
                  onChange={(e) => setRechargeForm({ ...rechargeForm, amount_naira: e.target.value })}
                  placeholder="e.g. 40000"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Energy units received (kWh)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={rechargeForm.units_kwh}
                  onChange={(e) => setRechargeForm({ ...rechargeForm, units_kwh: e.target.value })}
                  placeholder="e.g. 200"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium"
                />
              </div>

              {/* Live Cost per kWh (Figure 3.9) */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 text-xs italic">
                Cost per kWh: <span className="font-bold text-slate-950 not-italic">{formatNaira(liveCostPerKwh)}</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition text-xs"
              >
                Save
              </button>
            </form>
          </div>

          {/* Recharge History Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <History className="h-4 w-4 text-slate-500" />
                <span>Recharge History ({recharges.length})</span>
              </h2>
            </div>

            {recharges.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recharge purchases recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount Paid</th>
                      <th className="py-3 px-4">Units Received</th>
                      <th className="py-3 px-4">Cost / kWh</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recharges.map((rec) => {
                      const cost = costPerKwh(rec.amount_naira, rec.units_kwh);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {formatDate(rec.recharge_date)}
                          </td>
                          <td className="py-3 px-4">{formatNaira(rec.amount_naira)}</td>
                          <td className="py-3 px-4 font-medium">{rec.units_kwh} kWh</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {formatNaira(cost)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteRecharge(rec.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                              title="Delete recharge record"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: METER READING MODULE (Matching Figure 3.10) */}
      {activeTab === 'meter' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meter Reading Form */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-purple-600" />
              <span>Record Meter Reading</span>
            </h2>

            <form onSubmit={handleSaveReading} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={readingForm.reading_date}
                  onChange={(e) => setReadingForm({ ...readingForm, reading_date: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Balance shown on the meter (kWh)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={readingForm.balance_kwh}
                  onChange={(e) => setReadingForm({ ...readingForm, balance_kwh: e.target.value })}
                  placeholder="e.g. 90.0"
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                />
              </div>

              {/* Live Drift Displays (Figure 3.10) */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5 text-xs">
                <div className="text-slate-600 italic">
                  Estimated balance: <span className="font-semibold text-slate-900 not-italic">{estBalResult.balance.toFixed(1)} kWh</span>
                </div>
                <div className="text-slate-600 italic">
                  Difference (meter less estimate):{' '}
                  <span
                    className={`font-bold not-italic ${
                      liveDifference < 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    {liveDifference > 0 ? `+${liveDifference.toFixed(1)}` : liveDifference.toFixed(1)} kWh
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition text-xs"
              >
                Save
              </button>
            </form>
          </div>

          {/* Meter Readings History Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <History className="h-4 w-4 text-slate-500" />
                <span>Recorded Meter Readings ({readings.length})</span>
              </h2>
            </div>

            {readings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No physical meter readings entered yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Meter Balance (kWh)</th>
                      <th className="py-3 px-4">Estimated At Time</th>
                      <th className="py-3 px-4">Drift Difference</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {readings.map((r) => {
                      const diff = calculateMeterDifference(r.balance_kwh, r.estimated_kwh);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {formatDate(r.reading_date)}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">{r.balance_kwh} kWh</td>
                          <td className="py-3 px-4 text-slate-600">{r.estimated_kwh} kWh</td>
                          <td className="py-3 px-4 font-semibold">
                            <span
                              className={
                                diff < 0 ? 'text-amber-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'
                              }
                            >
                              {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kWh
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteReading(r.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                              title="Delete meter reading"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

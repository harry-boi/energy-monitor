'use client';

import { useState, useEffect } from 'react';
import {
  getUsageRecords,
  getRecharges,
  getMeterReadings,
  getSettings,
  getAppliances,
} from '../../lib/dataService.js';
import {
  estimateBalance,
  averageDailyEnergy,
  estimateDuration,
  projectDepletionDate,
  formatDuration,
  formatNaira,
} from '../../lib/calculations.js';
import { Printer, Calendar, FileText } from 'lucide-react';

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState('2026-10-14');
  const [toDate, setToDate] = useState('2026-10-20');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [allUsage, allRecharges, allReadings, settings, appliances] = await Promise.all([
        getUsageRecords(),
        getRecharges(),
        getMeterReadings(),
        getSettings(),
        getAppliances(),
      ]);

      // Filter usage in range
      const periodUsage = allUsage.filter(
        (u) => u.usage_date >= fromDate && u.usage_date <= toDate
      );

      // Group usage by date
      const groupedUsage = {};
      periodUsage.forEach((u) => {
        groupedUsage[u.usage_date] = (groupedUsage[u.usage_date] || 0) + Number(u.energy_kwh);
      });

      const sortedDates = Object.keys(groupedUsage).sort();
      const dailyRows = sortedDates.map((d) => ({
        date: d,
        energy: Number(groupedUsage[d].toFixed(1)),
      }));

      const totalConsumption = dailyRows.reduce((sum, r) => sum + r.energy, 0);
      const avgDaily = dailyRows.length > 0 ? totalConsumption / dailyRows.length : 0;

      // Recharges in period
      const periodRecharges = allRecharges.filter(
        (r) => r.recharge_date >= fromDate && r.recharge_date <= toDate
      );
      const totalRechargeUnits = periodRecharges.reduce((sum, r) => sum + Number(r.units_kwh), 0);
      const totalRechargeAmount = periodRecharges.reduce((sum, r) => sum + Number(r.amount_naira), 0);

      // Estimated balance at the end of the period
      const usageUpToEnd = allUsage.filter((u) => u.usage_date <= toDate);
      const rechargesUpToEnd = allRecharges.filter((r) => r.recharge_date <= toDate);
      const readingBeforeOrAtEnd = allReadings.find((r) => r.reading_date <= toDate) || null;

      const balResult = estimateBalance(rechargesUpToEnd, usageUpToEnd, readingBeforeOrAtEnd);
      const duration = estimateDuration(balResult.balance, avgDaily);
      const depletionDate = projectDepletionDate(toDate, duration);

      setReportData({
        totalConsumption,
        avgDaily,
        rechargesCount: periodRecharges.length,
        totalRechargeUnits,
        totalRechargeAmount,
        estimatedBalance: balResult.balance,
        duration,
        depletionDate,
        dailyRows,
        periodRecharges,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [fromDate, toDate]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Consumption and Recharge Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Official summary report for Goodness Lodge caretakers and lodge management.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-lg shadow-sm transition"
        >
          <Printer className="h-4 w-4" />
          <span>Print / Save PDF</span>
        </button>
      </div>

      {/* Date Range Selection (Hidden when printing) */}
      <div className="print:hidden bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="p-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Printable Report Document (Figure 3.14 Layout) */}
      {loading || !reportData ? (
        <div className="text-center py-12 text-slate-400 text-xs">Generating report...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-sm print:border-none print:shadow-none print:p-0 max-w-4xl mx-auto space-y-6 text-slate-900 font-sans">
          {/* Header */}
          <div className="text-center border-b border-slate-300 pb-5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Goodness Lodge, Ikot Ekpene
            </h1>
            <h2 className="text-sm font-semibold text-slate-700 mt-1">
              Consumption and Recharge Report: {formatDateDisplay(fromDate)} to {formatDateDisplay(toDate)}
            </h2>
            <div className="text-[11px] text-slate-500 mt-1">
              Generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Key Summary Lines (Figure 3.14) */}
          <div className="space-y-1.5 text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200 print:bg-transparent print:p-0 print:border-none">
            <p>
              <strong className="font-semibold">Total estimated consumption:</strong>{' '}
              {reportData.totalConsumption.toFixed(1)} kWh
            </p>
            <p>
              <strong className="font-semibold">Average daily consumption:</strong>{' '}
              {reportData.avgDaily.toFixed(2)} kWh
            </p>
            <p>
              <strong className="font-semibold">Recharges in the period:</strong>{' '}
              {reportData.rechargesCount}{' '}
              {reportData.rechargesCount > 0 &&
                `(${reportData.totalRechargeUnits} kWh for ${formatNaira(reportData.totalRechargeAmount)})`}
            </p>
            <p>
              <strong className="font-semibold">Estimated balance at {formatDateDisplay(toDate)}:</strong>{' '}
              {reportData.estimatedBalance.toFixed(1)} kWh
            </p>
            <p>
              <strong className="font-semibold">Estimated recharge duration:</strong>{' '}
              {formatDuration(reportData.duration)} (projected depletion{' '}
              {formatDateDisplay(reportData.depletionDate)})
            </p>
          </div>

          {/* Section 1: Daily Consumption Table (Figure 3.14) */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Daily consumption
            </h3>
            <table className="min-w-full border border-slate-300 text-xs divide-y divide-slate-300">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="py-2 px-3 text-left border-r border-slate-300">Date</th>
                  <th className="py-2 px-3 text-right">Estimated energy (kWh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.dailyRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2 px-3 border-r border-slate-200">
                      {formatDateDisplay(row.date)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {row.energy.toFixed(1)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-extrabold text-slate-950 border-t-2 border-slate-400">
                  <td className="py-2 px-3 border-r border-slate-300">Total</td>
                  <td className="py-2 px-3 text-right">
                    {reportData.totalConsumption.toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Recharge History Table (Figure 3.14) */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Recharge history
            </h3>
            {reportData.periodRecharges.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-3 border border-slate-200 rounded">
                No recharges recorded during this period.
              </div>
            ) : (
              <table className="min-w-full border border-slate-300 text-xs divide-y divide-slate-300">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="py-2 px-3 text-left border-r border-slate-300">Date</th>
                    <th className="py-2 px-3 text-left border-r border-slate-300">Amount paid</th>
                    <th className="py-2 px-3 text-right">Units received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.periodRecharges.map((rec) => (
                    <tr key={rec.id}>
                      <td className="py-2 px-3 border-r border-slate-200">
                        {formatDateDisplay(rec.recharge_date)}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        {formatNaira(rec.amount_naira)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {rec.units_kwh} kWh
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Print Button at Bottom (Figure 3.14) */}
          <div className="print:hidden text-center pt-6">
            <button
              onClick={handlePrint}
              className="py-2.5 px-8 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 font-bold text-xs rounded-lg shadow-sm transition"
            >
              Print
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

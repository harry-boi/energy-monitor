'use client';

import { useEffect, useState } from 'react';
import {
  getAppliances,
  getUsageRecords,
  getRecharges,
  getMeterReadings,
  getSettings,
  getStateEvents,
} from '../lib/dataService.js';
import {
  estimateBalance,
  estimateLoad,
  averageDailyEnergy,
  estimateDuration,
  projectDepletionDate,
  costPerKwh,
  estimatedDailyCost,
  alertStatus,
  formatDuration,
  formatNaira,
  estimateLiveConsumption,
  estimateLiveBalance,
  estimateTimeToDepletion,
} from '../lib/calculations.js';
import {
  AlertTriangle,
  CheckCircle,
  AlertOctagon,
  BatteryCharging,
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  Coins,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts';
import Link from 'next/link';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Live clock: re-render every second so the balance visibly depletes.
  // Accuracy does not depend on this interval: the live figures are a pure
  // function of the recorded switch timestamps and the current time, so a
  // 1-second tick gives exactly the value a 30-second tick would give at
  // the same moment, just sooner. The tick is pure arithmetic on data
  // already loaded; the database is only re-read on the slower refresh
  // below (e.g. a switch flipped on the Appliances page in another tab).
  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    const refresh = setInterval(() => loadDashboardData(true), 60000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, []);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [appliances, usageRecords, recharges, meterReadings, settings, stateEvents] = await Promise.all([
        getAppliances(),
        getUsageRecords(),
        getRecharges(),
        getMeterReadings(),
        getSettings(),
        getStateEvents(),
      ]);

      const latestMeterReading = meterReadings.length > 0 ? meterReadings[0] : null;
      const latestRecharge = recharges.length > 0 ? recharges[0] : null;

      // 1. Estimated Balance (Eq 3.4)
      const balResult = estimateBalance(recharges, usageRecords, latestMeterReading);

      // 1b. Live base balance: Eq 3.4 over records dated BEFORE today.
      // Today's consumption is tracked live from appliance state events,
      // so today's manual usage records (if any) are excluded here to
      // avoid counting the same energy twice.
      const nowD = new Date();
      const todayStr = `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${String(
        nowD.getDate()
      ).padStart(2, '0')}`;
      const todayStartMs = new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate()).getTime();
      const usageBeforeToday = usageRecords.filter((u) => !u.usage_date || u.usage_date < todayStr);
      const baseBalResult = estimateBalance(recharges, usageBeforeToday, latestMeterReading);

      // 2. Estimated Load of ON appliances (Eq 3.3)
      const loadKw = estimateLoad(appliances);
      const onAppliancesCount = appliances.filter((a) => (a.state || 'ON').toUpperCase() === 'ON').length;

      // 3. Average Daily Consumption (Eq 3.5)
      const avgResult = averageDailyEnergy(usageRecords, settings.averaging_days || 7, appliances);

      // 4. Recharge Duration & Depletion Date (Eq 3.6)
      const duration = estimateDuration(balResult.balance, avgResult.average);
      const depletionDate = projectDepletionDate(balResult.asAtDate, duration);

      // 5. Cost per kWh & Estimated Daily Cost (Eq 3.7 & 3.8)
      const kwhCost = latestRecharge ? costPerKwh(latestRecharge.amount_naira, latestRecharge.units_kwh) : 0;
      const dailyCost = estimatedDailyCost(avgResult.average, kwhCost);

      // 6. Alert Status (Table 3.8)
      const status = alertStatus(balResult.balance, duration, settings.alert_days || 3);

      // 7. Last 7 recorded days for the bar chart
      // Group all usage by date
      const groupedUsage = {};
      usageRecords.forEach((u) => {
        if (!u.usage_date) return;
        groupedUsage[u.usage_date] = (groupedUsage[u.usage_date] || 0) + Number(u.energy_kwh);
      });
      const sortedDates = Object.keys(groupedUsage).sort();
      const last7Dates = sortedDates.slice(-7);
      const chartData = last7Dates.map((dateStr) => {
        const d = new Date(dateStr);
        const dayLabel = isNaN(d.getTime())
          ? dateStr
          : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return {
          date: dateStr,
          displayDate: dayLabel,
          energy: Number(groupedUsage[dateStr].toFixed(1)),
        };
      });

      setData({
        appliances,
        usageRecords,
        recharges,
        settings,
        latestMeterReading,
        latestRecharge,
        balance: balResult.balance,
        balanceDate: balResult.asAtDate,
        baseBalance: baseBalResult.balance,
        stateEvents,
        todayStartMs,
        todayStr,
        loadKw,
        onAppliancesCount,
        averageEnergy: avgResult.average,
        isApplianceEstimate: avgResult.isEstimate,
        duration,
        depletionDate,
        kwhCost,
        dailyCost,
        status,
        chartData,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return 'Not recorded';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading dashboard estimates...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Live figures, recomputed on every tick from the appliance switching
  // history: how much has been consumed today so far, the balance left
  // right now, and how long it lasts at the current load.
  const liveConsumption = estimateLiveConsumption(
    data.appliances,
    data.stateEvents,
    data.todayStartMs,
    nowMs
  );
  const liveBalance = estimateLiveBalance(data.baseBalance, liveConsumption.totalKwh);
  const liveDuration = estimateDuration(liveBalance, data.averageEnergy);
  const liveStatus = alertStatus(liveBalance, liveDuration, data.settings?.alert_days || 3);
  const liveDepletionDate = projectDepletionDate(data.todayStr, liveDuration);
  const ttd = estimateTimeToDepletion(liveBalance, data.loadKw, nowMs);
  const ttdTimeLabel = ttd.depletionTimestamp
    ? new Date(ttd.depletionTimestamp).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Goodness Lodge, Ikot Ekpene · Real-time estimated electricity monitoring & prediction
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            href="/usage"
            className="inline-flex items-center space-x-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            <span>Record Today's Usage</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 1. Alert Status Banner (Matching Figure 3.12 & Table 3.8) */}
      <div
        className={`rounded-xl border p-4 shadow-sm flex items-start space-x-3.5 transition ${
          liveStatus === 'Critical'
            ? 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900'
            : liveStatus === 'Low'
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {liveStatus === 'Critical' ? (
            <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400 animate-pulse" />
          ) : liveStatus === 'Low' ? (
            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm tracking-wide uppercase">
            Alert status: {liveStatus}
          </div>
          <p className="text-xs mt-0.5 font-medium">
            {liveStatus === 'Critical' &&
              (data.balance <= 0
                ? 'Warning: The energy balance has depleted (0 kWh). Recharge immediately!'
                : 'Warning: Remaining energy is projected to last 1 day or less. Critical depletion imminent!')}
            {liveStatus === 'Low' &&
              `Warning: Energy is projected to last ${data.settings?.alert_days || 3} days or less (${data.duration.toFixed(
                1
              )} days remaining). A recharge should be bought soon.`}
            {liveStatus === 'Normal' &&
              `The energy is expected to last longer than ${data.settings?.alert_days || 3} days (${liveDuration.toFixed(
                1
              )} days remaining). No immediate recharge action is required.`}
          </p>
        </div>
      </div>

      {/* 2. Six Output Metric Cards (Matching Figure 3.12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Live Balance (depletes in real time from appliance states) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live balance</span>
            </span>
            <BatteryCharging className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {liveBalance.toFixed(3)} <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">kWh</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-0.5">
            <div>
              {liveConsumption.totalKwh.toFixed(2)} kWh used today so far · burning {data.loadKw.toFixed(2)} kW now
            </div>
            <div className="font-medium text-slate-600 dark:text-slate-300">
              {ttd.hoursRemaining !== null
                ? `Runs out in about ${
                    ttd.hoursRemaining >= 24
                      ? `${(ttd.hoursRemaining / 24).toFixed(1)} days`
                      : `${Math.floor(ttd.hoursRemaining)}h ${Math.round((ttd.hoursRemaining % 1) * 60)}m`
                  } at this rate (by ${ttdTimeLabel})`
                : 'Not depleting right now, every appliance is OFF'}
            </div>
          </div>
        </div>

        {/* Card 2: Average Daily Use */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average daily use</span>
            <TrendingUp className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {data.averageEnergy.toFixed(2)} <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">kWh</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {data.isApplianceEstimate
              ? 'based on appliance estimate (no usage history recorded)'
              : `last ${data.chartData.length} recorded days`}
          </div>
        </div>

        {/* Card 3: Estimated Recharge Duration */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated recharge duration</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {formatDuration(liveDuration)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            to projected depletion
          </div>
        </div>

        {/* Card 4: Projected Depletion Date */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Projected depletion date</span>
            <Calendar className="h-4 w-4 text-purple-500 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">
            {formatDateDisplay(liveDepletionDate)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            based on average of {data.averageEnergy.toFixed(2)} kWh/day
          </div>
        </div>

        {/* Card 5: Estimated Load Now */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated load now</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {data.loadKw.toFixed(2)} <span className="text-lg font-semibold text-slate-600 dark:text-slate-300">kW</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {data.onAppliancesCount} {data.onAppliancesCount === 1 ? 'appliance' : 'appliances'} ON
          </div>
        </div>

        {/* Card 6: Estimated Daily Cost */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated daily cost</span>
            <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
            {formatNaira(data.dailyCost)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            at {formatNaira(data.kwhCost)} per kWh
          </div>
        </div>
      </div>

      {/* 3. Daily Consumption Chart (Last 7 days - Matching Figure 3.12) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 uppercase tracking-wider">
              Daily consumption, last 7 days (kWh)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical daily energy estimates computed from caretaker entries
            </p>
          </div>
          <Link
            href="/analysis"
            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold"
          >
            Detailed Analysis →
          </Link>
        </div>

        {data.chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
            No daily usage records available yet.
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  unit=" kWh"
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
                          <p className="font-semibold">{payload[0].payload.date}</p>
                          <p className="text-amber-400 font-bold mt-1">
                            {payload[0].value} kWh
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="energy" fill="#cbd5e1" radius={[4, 4, 0, 0]}>
                  {data.chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === data.chartData.length - 1 ? '#f59e0b' : '#94a3b8'}
                    />
                  ))}
                  <LabelList
                    dataKey="energy"
                    position="top"
                    style={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

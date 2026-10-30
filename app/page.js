'use client';

import { useEffect, useState } from 'react';
import {
  getAppliances,
  getUsageRecords,
  getRecharges,
  getMeterReadings,
  getSettings,
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

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [appliances, usageRecords, recharges, meterReadings, settings] = await Promise.all([
        getAppliances(),
        getUsageRecords(),
        getRecharges(),
        getMeterReadings(),
        getSettings(),
      ]);

      const latestMeterReading = meterReadings.length > 0 ? meterReadings[0] : null;
      const latestRecharge = recharges.length > 0 ? recharges[0] : null;

      // 1. Estimated Balance (Eq 3.4)
      const balResult = estimateBalance(recharges, usageRecords, latestMeterReading);

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
      setLoading(false);
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
      <div className="flex justify-center items-center py-20 text-slate-500">
        <div className="flex items-center space-x-2 text-sm">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading dashboard estimates...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Page Title & Scope Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
          data.status === 'Critical'
            ? 'bg-red-50 border-red-300 text-red-900'
            : data.status === 'Low'
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-emerald-50 border-emerald-300 text-emerald-900'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {data.status === 'Critical' ? (
            <AlertOctagon className="h-6 w-6 text-red-600 animate-pulse" />
          ) : data.status === 'Low' ? (
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          ) : (
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm tracking-wide uppercase">
            Alert status: {data.status}
          </div>
          <p className="text-xs mt-0.5 font-medium">
            {data.status === 'Critical' &&
              (data.balance <= 0
                ? 'Warning: The energy balance has depleted (0 kWh). Recharge immediately!'
                : 'Warning: Remaining energy is projected to last 1 day or less. Critical depletion imminent!')}
            {data.status === 'Low' &&
              `Warning: Energy is projected to last ${data.settings?.alert_days || 3} days or less (${data.duration.toFixed(
                1
              )} days remaining). A recharge should be bought soon.`}
            {data.status === 'Normal' &&
              `The energy is expected to last longer than ${data.settings?.alert_days || 3} days (${data.duration.toFixed(
                1
              )} days remaining). No immediate recharge action is required.`}
          </p>
        </div>
      </div>

      {/* 2. Six Output Metric Cards (Matching Figure 3.12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Estimated Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated balance</span>
            <BatteryCharging className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {data.balance.toFixed(1)} <span className="text-lg font-semibold text-slate-600">kWh</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center space-x-1">
            <span>as at {formatDateDisplay(data.balanceDate)}</span>
          </div>
        </div>

        {/* Card 2: Average Daily Use */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average daily use</span>
            <TrendingUp className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {data.averageEnergy.toFixed(2)} <span className="text-lg font-semibold text-slate-600">kWh</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {data.isApplianceEstimate
              ? 'based on appliance estimate (no usage history recorded)'
              : `last ${data.chartData.length} recorded days`}
          </div>
        </div>

        {/* Card 3: Estimated Recharge Duration */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated recharge duration</span>
            <Clock className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {formatDuration(data.duration)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            to projected depletion
          </div>
        </div>

        {/* Card 4: Projected Depletion Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Projected depletion date</span>
            <Calendar className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {formatDateDisplay(data.depletionDate)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            based on average of {data.averageEnergy.toFixed(2)} kWh/day
          </div>
        </div>

        {/* Card 5: Estimated Load Now */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated load now</span>
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {data.loadKw.toFixed(2)} <span className="text-lg font-semibold text-slate-600">kW</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {data.onAppliancesCount} {data.onAppliancesCount === 1 ? 'appliance' : 'appliances'} ON
          </div>
        </div>

        {/* Card 6: Estimated Daily Cost */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated daily cost</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {formatNaira(data.dailyCost)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            at {formatNaira(data.kwhCost)} per kWh
          </div>
        </div>
      </div>

      {/* 3. Daily Consumption Chart (Last 7 days - Matching Figure 3.12) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Daily consumption, last 7 days (kWh)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical daily energy estimates computed from caretaker entries
            </p>
          </div>
          <Link
            href="/analysis"
            className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
          >
            Detailed Analysis →
          </Link>
        </div>

        {data.chartData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
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

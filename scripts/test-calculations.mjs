/**
 * Appendix B: Test Script for Calculation Functions (Table 4.3)
 * Goodness Lodge Energy Monitoring and Prediction System
 * Runs all 16 acceptance test cases and verifies 100% agreement.
 */

import {
  estimateApplianceEnergy,
  estimateDailyEnergy,
  estimateLoad,
  estimateBalance,
  calculateMeterDifference,
  applianceShare,
  periodChange,
  averageDailyEnergy,
  estimateDuration,
  projectDepletionDate,
  costPerKwh,
  estimatedDailyCost,
  alertStatus,
} from '../lib/calculations.js';

const sampleAppliances = [
  { name: 'Ceiling fan', category: 'Cooling', power_watts: 75, quantity: 10, daily_hours: 8, state: 'ON' },
  { name: 'LED bulb', category: 'Lighting', power_watts: 10, quantity: 30, daily_hours: 6, state: 'ON' },
  { name: 'Refrigerator', category: 'Refrigeration', power_watts: 150, quantity: 2, daily_hours: 10, state: 'ON' },
  { name: 'Television', category: 'Entertainment', power_watts: 100, quantity: 4, daily_hours: 5, state: 'ON' },
  { name: 'Electric iron', category: 'Heating', power_watts: 1000, quantity: 2, daily_hours: 1, state: 'ON' },
];

const dailyHistory = [
  { usage_date: '2026-10-14', energy_kwh: 14.8 },
  { usage_date: '2026-10-15', energy_kwh: 15.6 },
  { usage_date: '2026-10-16', energy_kwh: 13.2 },
  { usage_date: '2026-10-17', energy_kwh: 16.0 },
  { usage_date: '2026-10-18', energy_kwh: 14.4 },
  { usage_date: '2026-10-19', energy_kwh: 15.2 },
  { usage_date: '2026-10-20', energy_kwh: 14.0 },
];

let passedCount = 0;
let totalCount = 16;
const results = [];

function assert(testNo, name, expected, actual, condition) {
  const status = condition ? 'Passed' : 'FAILED';
  if (condition) passedCount++;
  results.push({ testNo, name, expected, actual, status });
  const icon = condition ? '✓' : '✗';
  console.log(`${icon} Test ${testNo}: ${name}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual:   ${actual}`);
  console.log(`   Status:   ${status}\n`);
}

console.log('===============================================================');
console.log('Testing Calculation Functions against Table 4.3 Specifications');
console.log('===============================================================\n');

// Test 1: Estimated energy of an appliance
const t1_energy = estimateApplianceEnergy(75, 10, 8);
assert(1, 'Estimated energy of an appliance', '6.0 kWh', `${t1_energy.toFixed(1)} kWh`, t1_energy === 6.0);

// Test 2: Total estimated daily energy
const t2_total = sampleAppliances.reduce((sum, a) => sum + estimateApplianceEnergy(a.power_watts, a.quantity, a.daily_hours), 0);
assert(2, 'Total estimated daily energy', '14.8 kWh', `${t2_total.toFixed(1)} kWh`, Math.abs(t2_total - 14.8) < 0.01);

// Test 3: Estimated load
const t3_loadAll = estimateLoad(sampleAppliances);
const appliancesWithoutIron = sampleAppliances.map(a => a.name === 'Electric iron' ? { ...a, state: 'OFF' } : a);
const t3_loadNoIron = estimateLoad(appliancesWithoutIron);
assert(
  3,
  'Estimated load',
  '3.75 kW, then 1.75 kW',
  `${t3_loadAll.toFixed(2)} kW, then ${t3_loadNoIron.toFixed(2)} kW`,
  t3_loadAll === 3.75 && t3_loadNoIron === 1.75
);

// Test 4: Energy of one day of usage records
const day14Usage = [
  { power_watts: 75, quantity: 10, hours: 8 },
  { power_watts: 10, quantity: 30, hours: 6 },
  { power_watts: 150, quantity: 2, hours: 10 },
  { power_watts: 100, quantity: 4, hours: 5 },
  { power_watts: 1000, quantity: 2, hours: 1 },
];
const t4_energy = estimateDailyEnergy(day14Usage);
assert(4, 'Energy of one day of usage records', '14.8 kWh', `${t4_energy.toFixed(1)} kWh`, Math.abs(t4_energy - 14.8) < 0.01);

// Test 5: Cost per kWh of a recharge
const t5_cost = costPerKwh(40000, 200);
assert(5, 'Cost per kWh of a recharge', '₦200.00 per kWh', `₦${t5_cost.toFixed(2)} per kWh`, t5_cost === 200);

// Test 6: Estimated balance without a meter reading
const recharges_t6 = [{ recharge_date: '2026-10-14', units_kwh: 200 }];
const t6_bal = estimateBalance(recharges_t6, dailyHistory, null);
assert(6, 'Estimated balance without a meter reading', '96.8 kWh', `${t6_bal.balance.toFixed(1)} kWh`, Math.abs(t6_bal.balance - 96.8) < 0.01);

// Test 7: Meter reading as the starting balance
const t7_diff = calculateMeterDifference(90.0, 96.8);
const meterReading_t7 = { reading_date: '2026-10-20', balance_kwh: 90.0 };
const usageAfterReading = [...dailyHistory, { usage_date: '2026-10-21', energy_kwh: 14.8 }];
const t7_bal = estimateBalance(recharges_t6, usageAfterReading, meterReading_t7);
assert(
  7,
  'Meter reading as the starting balance',
  'Difference −6.8 kWh; balance 75.2 kWh',
  `Difference ${t7_diff.toFixed(1)} kWh; balance ${t7_bal.balance.toFixed(1)} kWh`,
  t7_diff === -6.8 && Math.abs(t7_bal.balance - 75.2) < 0.01
);

// Test 8: Prediction with a Normal status
const t8_avg = averageDailyEnergy(dailyHistory, 7);
const t8_dur = estimateDuration(96.8, t8_avg.average);
const t8_depletion = projectDepletionDate('2026-10-20', t8_dur);
const t8_status = alertStatus(96.8, t8_dur, 3);
const t8_dailyCost = estimatedDailyCost(t8_avg.average, 200);
assert(
  8,
  'Prediction with a Normal status',
  'Average 14.74 kWh; duration 6.57 days; depletion 2026-10-26; Normal; ₦2,948.57 a day',
  `Average ${t8_avg.average.toFixed(2)} kWh; duration ${t8_dur.toFixed(2)} days; depletion ${t8_depletion}; ${t8_status}; ₦${t8_dailyCost.toFixed(2)} a day`,
  Math.abs(t8_avg.average - 14.74) <= 0.01 &&
    Math.abs(t8_dur - 6.57) <= 0.01 &&
    t8_depletion === '2026-10-26' &&
    t8_status === 'Normal' &&
    Math.abs(t8_dailyCost - 2948.57) <= 0.5
);

// Test 9: Low alert
const t9_dur = estimateDuration(30, t8_avg.average);
const t9_status = alertStatus(30, t9_dur, 3);
assert(9, 'Low alert', 'Duration 2.03 days; Low', `Duration ${t9_dur.toFixed(2)} days; ${t9_status}`, Math.abs(t9_dur - 2.03) <= 0.01 && t9_status === 'Low');

// Test 10: Critical alert
const t10_dur = estimateDuration(10, t8_avg.average);
const t10_status = alertStatus(10, t10_dur, 3);
assert(10, 'Critical alert', 'Duration 0.68 days; Critical', `Duration ${t10_dur.toFixed(2)} days; ${t10_status}`, Math.abs(t10_dur - 0.68) <= 0.01 && t10_status === 'Critical');

// Test 11: Prediction without usage history
const t11_avg = averageDailyEnergy([], 7, sampleAppliances);
const t11_dur = estimateDuration(100, t11_avg.average);
assert(
  11,
  'Prediction without usage history',
  'Appliance estimate 14.8 kWh; duration 6.76 days',
  `Appliance estimate ${t11_avg.average.toFixed(1)} kWh; duration ${t11_dur.toFixed(2)} days`,
  Math.abs(t11_avg.average - 14.8) < 0.01 && Math.abs(t11_dur - 6.76) <= 0.01 && t11_avg.isEstimate === true
);

// Test 12: Balance cannot be negative
const t12_bal = estimateBalance([{ recharge_date: '2026-10-01', units_kwh: 200 }], [{ usage_date: '2026-10-02', energy_kwh: 320 }], null);
const t12_status = alertStatus(t12_bal.balance, 0, 3);
assert(12, 'Balance cannot be negative', 'Balance 0 kWh; Critical', `Balance ${t12_bal.balance} kWh; ${t12_status}`, t12_bal.balance === 0 && t12_status === 'Critical');

// Test 13: Average over three days
const t13_avg = averageDailyEnergy(dailyHistory, 3);
assert(13, 'Average over three days', '14.53 kWh', `${t13_avg.average.toFixed(2)} kWh`, Math.abs(t13_avg.average - 14.53) <= 0.01);

// Test 14: Consumption analysis totals
const t14_total = dailyHistory.reduce((s, d) => s + d.energy_kwh, 0);
const t14_avg = t14_total / dailyHistory.length;
const sorted = [...dailyHistory].sort((a, b) => b.energy_kwh - a.energy_kwh);
const t14_highest = sorted[0];
const t14_lowest = sorted[sorted.length - 1];
assert(
  14,
  'Consumption analysis totals',
  'Total 103.2 kWh; average 14.74 kWh; highest 2026-10-17 (16.0); lowest 2026-10-16 (13.2)',
  `Total ${t14_total.toFixed(1)} kWh; average ${t14_avg.toFixed(2)} kWh; highest ${t14_highest.usage_date} (${t14_highest.energy_kwh.toFixed(1)}); lowest ${t14_lowest.usage_date} (${t14_lowest.energy_kwh.toFixed(1)})`,
  Math.abs(t14_total - 103.2) < 0.01 &&
    Math.abs(t14_avg - 14.74) <= 0.01 &&
    t14_highest.usage_date === '2026-10-17' &&
    t14_highest.energy_kwh === 16.0 &&
    t14_lowest.usage_date === '2026-10-16' &&
    t14_lowest.energy_kwh === 13.2
);

// Test 15: Share of an appliance and change between periods
const t15_share = applianceShare(6.0, 14.8);
const t15_change = periodChange(103.2, 98.0);
assert(
  15,
  'Share of an appliance and change between periods',
  '40.5%; +5.3%',
  `${t15_share.toFixed(1)}%; +${t15_change.toFixed(1)}%`,
  Math.abs(t15_share - 40.5) <= 0.1 && Math.abs(t15_change - 5.3) <= 0.1
);

// Test 16: Depletion date after a meter reading
const t16_dur = estimateDuration(75.2, 14.74);
const t16_depletion = projectDepletionDate('2026-10-21', t16_dur);
assert(
  16,
  'Depletion date after a meter reading',
  'Duration 5.10 days; depletion 2026-10-26',
  `Duration ${t16_dur.toFixed(2)} days; depletion ${t16_depletion}`,
  Math.abs(t16_dur - 5.10) <= 0.01 && t16_depletion === '2026-10-26'
);

console.log('===============================================================');
console.log(`Results: ${passedCount} of ${totalCount} tests passed.`);
console.log('===============================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}

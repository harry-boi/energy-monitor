/**
 * Test Script for Table 4.4 Validation, Business Logic and Access Rules
 * Goodness Lodge Energy Monitoring and Prediction System
 */

import {
  saveAppliance,
  deleteAppliance,
  saveDailyUsage,
  saveRecharge,
  saveMeterReading,
  saveSettings,
  signIn,
  GOODNESS_LODGE_SAMPLE_APPLIANCES,
} from '../lib/dataService.js';
import {
  alertStatus,
  averageDailyEnergy,
  estimateDuration,
} from '../lib/calculations.js';

let passed = 0;
let total = 0;

function check(testNo, title, condition, details) {
  total++;
  if (condition) {
    passed++;
    console.log(`✓ [Test ${testNo}] ${title} — Passed`);
  } else {
    console.error(`✗ [Test ${testNo}] ${title} — FAILED: ${details}`);
  }
}

console.log('===============================================================');
console.log('Testing Interface, Validation & Logic Rules (Table 4.4)');
console.log('===============================================================\n');

// 1. Sign in with valid details
const validLogin = await signIn('caretaker@goodnesslodge.example', 'caretaker123');
check(1, 'Sign in with valid details', validLogin.success === true, validLogin.error);

// 2. Sign in with wrong password
const wrongLogin = await signIn('caretaker@goodnesslodge.example', 'wrongpass');
check(2, 'Sign in with wrong password', wrongLogin.success === false && wrongLogin.error.includes('refused'), wrongLogin.error);

// 4. Add an appliance (valid)
let newApp;
try {
  newApp = await saveAppliance({
    name: 'Standing Fan Special',
    category: 'Cooling',
    power_watts: 75,
    quantity: 10,
    daily_hours: 8,
    state: 'ON',
  });
  check(4, 'Add an appliance (valid)', newApp.name === 'Standing Fan Special', 'Failed to save');
} catch (e) {
  check(4, 'Add an appliance (valid)', false, e.message);
}

// 5. Reject a power rating of zero
try {
  await saveAppliance({
    name: 'Zero Power Load',
    category: 'Cooling',
    power_watts: 0,
    quantity: 1,
    daily_hours: 5,
    state: 'ON',
  });
  check(5, 'Reject power rating of zero', false, 'Accepted 0 power');
} catch (e) {
  check(5, 'Reject power rating of zero', e.message.includes('greater than 0'), e.message);
}

// 6. Reject hours above 24
try {
  await saveAppliance({
    name: 'Overtime Load',
    category: 'Cooling',
    power_watts: 100,
    quantity: 1,
    daily_hours: 25,
    state: 'ON',
  });
  check(6, 'Reject hours above 24', false, 'Accepted 25 hours');
} catch (e) {
  check(6, 'Reject hours above 24', e.message.includes('0 to 24'), e.message);
}

// 7. Reject duplicate appliance name
try {
  await saveAppliance({
    name: 'Standing Fan Special',
    category: 'Cooling',
    power_watts: 75,
    quantity: 2,
    daily_hours: 4,
    state: 'ON',
  });
  check(7, 'Reject duplicate appliance name', false, 'Allowed duplicate');
} catch (e) {
  check(7, 'Reject duplicate appliance name', e.message.includes('already exists'), e.message);
}

// 8. Record daily usage (valid)
try {
  const usageRes = await saveDailyUsage('2026-10-14', [
    { appliance_id: 'app-1', power_watts: 75, quantity: 10, hours: 8 },
    { appliance_id: 'app-2', power_watts: 10, quantity: 30, hours: 6 },
    { appliance_id: 'app-3', power_watts: 150, quantity: 2, hours: 10 },
    { appliance_id: 'app-4', power_watts: 100, quantity: 4, hours: 5 },
    { appliance_id: 'app-5', power_watts: 1000, quantity: 2, hours: 1 },
  ]);
  const daySum = usageRes.reduce((s, r) => s + r.energy_kwh, 0);
  check(8, 'Record daily usage', usageRes.length === 5 && Math.abs(daySum - 14.8) < 0.01, `Energy was ${daySum}`);
} catch (e) {
  check(8, 'Record daily usage', false, e.message);
}

// 10. Record a recharge (valid)
try {
  const rec = await saveRecharge({
    recharge_date: '2026-10-14',
    amount_naira: 40000,
    units_kwh: 200,
  });
  check(10, 'Record a recharge', rec.amount_naira === 40000 && rec.units_kwh === 200, 'Recharge failed');
} catch (e) {
  check(10, 'Record a recharge', false, e.message);
}

// 11. Reject recharge units of zero
try {
  await saveRecharge({
    recharge_date: '2026-10-14',
    amount_naira: 40000,
    units_kwh: 0,
  });
  check(11, 'Reject recharge units of zero', false, 'Allowed units 0');
} catch (e) {
  check(11, 'Reject recharge units of zero', e.message.includes('greater than 0'), e.message);
}

// 12. Warning on the dashboard (Low alert at 30 kWh, Critical at 10 kWh)
const lowStatus = alertStatus(30, 2.03, 3);
const critStatus = alertStatus(10, 0.68, 3);
check(12, 'Dashboard alert warnings', lowStatus === 'Low' && critStatus === 'Critical', `Got ${lowStatus}, ${critStatus}`);

// 13. Prediction without usage history (appliance fallback)
const fallbackAvg = averageDailyEnergy([], 7, GOODNESS_LODGE_SAMPLE_APPLIANCES);
const fallbackDur = estimateDuration(100, fallbackAvg.average);
check(
  13,
  'Prediction without usage history',
  fallbackAvg.isEstimate === true && Math.abs(fallbackAvg.average - 14.8) < 0.01 && Math.abs(fallbackDur - 6.76) <= 0.01,
  `Got avg=${fallbackAvg.average}, dur=${fallbackDur}, isEst=${fallbackAvg.isEstimate}`
);

// Delete restriction test: appliance with usage records cannot be deleted
try {
  await deleteAppliance('app-1');
  check('DeleteConstraint', 'Reject deleting appliance with usage records', false, 'Allowed deleting app-1');
} catch (e) {
  check('DeleteConstraint', 'Reject deleting appliance with usage records', e.message.includes('cannot be deleted'), e.message);
}

console.log('\n===============================================================');
console.log(`Validation Results: ${passed} of ${total} tests passed.`);
console.log('===============================================================\n');

if (passed !== total) process.exit(1);

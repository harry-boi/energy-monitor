/**
 * Goodness Lodge Energy Monitoring and Prediction System
 * Calculation Functions (Estimator & Predictor)
 * Source of truth: Project Report Chapter 3 (Section 3.6.8) and Chapter 4 (Table 4.2)
 *
 * Hard rule: Pure functions, zero external dependencies, no direct database or UI coupling.
 */

// ==========================================
// ESTIMATOR FUNCTIONS (Equations 3.1, 3.2, 3.3, 3.4, 3.9, 3.10)
// ==========================================

/**
 * Equation 3.1: Energy of an appliance (in kWh)
 * E = (P / 1000) * Q * H
 * @param {number} powerWatts - Power rating of one unit in watts (P)
 * @param {number} quantity - Number of units (Q)
 * @param {number} hours - Hours of use (H)
 * @returns {number} Energy in kWh
 */
export function estimateApplianceEnergy(powerWatts, quantity, hours) {
  const p = Number(powerWatts) || 0;
  const q = Number(quantity) || 0;
  const h = Number(hours) || 0;
  if (p <= 0 || q <= 0 || h <= 0) return 0;
  const energy = (p / 1000) * q * h;
  return Number(energy.toFixed(4));
}

/**
 * Equation 3.2: Daily consumption (in kWh)
 * Sum of the energies of the usage records for that date: D = E1 + E2 + ... + En
 * @param {Array<{ energy_kwh?: number, power_watts?: number, quantity?: number, hours?: number }>} records
 * @returns {number} Total daily energy in kWh
 */
export function estimateDailyEnergy(records) {
  if (!Array.isArray(records) || records.length === 0) return 0;
  const total = records.reduce((sum, item) => {
    if (item.energy_kwh !== undefined && item.energy_kwh !== null) {
      return sum + Number(item.energy_kwh);
    }
    return sum + estimateApplianceEnergy(item.power_watts, item.quantity, item.hours);
  }, 0);
  return Number(total.toFixed(4));
}

/**
 * Equation 3.3: Estimated load (in kW)
 * Load of appliances whose operating state is ON: L = sum(P * Q) / 1000
 * @param {Array<{ power_watts: number, quantity: number, state?: string }>} appliances
 * @returns {number} Estimated load in kW
 */
export function estimateLoad(appliances) {
  if (!Array.isArray(appliances) || appliances.length === 0) return 0;
  const totalWatts = appliances
    .filter((a) => (a.state || 'ON').toUpperCase() === 'ON')
    .reduce((sum, a) => sum + (Number(a.power_watts) || 0) * (Number(a.quantity) || 0), 0);
  return Number((totalWatts / 1000).toFixed(4));
}

/**
 * Equation 3.4: Energy balance (in kWh)
 * B = B0 + R - U
 * If there is a meter reading, count only recharges and usage records dated AFTER the reading date.
 * If B < 0, balance is set to 0.
 *
 * @param {Array<{ recharge_date: string, units_kwh: number }>} recharges
 * @param {Array<{ usage_date: string, energy_kwh: number }>} usageRecords
 * @param {{ reading_date: string, balance_kwh: number } | null} latestMeterReading
 * @returns {{ balance: number, asAtDate: string | null, difference?: number }}
 */
export function estimateBalance(recharges = [], usageRecords = [], latestMeterReading = null) {
  let b0 = 0;
  let cutoffDate = null;
  let dates = [];

  if (latestMeterReading && latestMeterReading.reading_date) {
    b0 = Number(latestMeterReading.balance_kwh) || 0;
    cutoffDate = latestMeterReading.reading_date;
    dates.push(cutoffDate);
  }

  // Filter recharges and usage records after cutoffDate if meter reading exists
  const relevantRecharges = recharges.filter((r) => {
    if (r.recharge_date) dates.push(r.recharge_date);
    if (!cutoffDate) return true;
    return r.recharge_date > cutoffDate;
  });

  const relevantUsage = usageRecords.filter((u) => {
    if (u.usage_date) dates.push(u.usage_date);
    if (!cutoffDate) return true;
    return u.usage_date > cutoffDate;
  });

  const rTotal = relevantRecharges.reduce((sum, r) => sum + (Number(r.units_kwh) || 0), 0);
  const uTotal = relevantUsage.reduce((sum, u) => sum + (Number(u.energy_kwh) || 0), 0);

  let rawBalance = b0 + rTotal - uTotal;
  const balance = rawBalance < 0 ? 0 : Number(rawBalance.toFixed(4));

  // Determine latest recorded date
  dates.sort();
  const asAtDate = dates.length > 0 ? dates[dates.length - 1] : null;

  return {
    balance,
    rawBalance,
    asAtDate,
    b0,
    rTotal,
    uTotal,
  };
}

/**
 * Calculates drift difference when a meter reading is entered.
 * Difference = meter reading balance less estimated balance (before the meter reading is applied).
 * @param {number} meterReadingBalance
 * @param {number} estimatedBalance
 * @returns {number}
 */
export function calculateMeterDifference(meterReadingBalance, estimatedBalance) {
  const diff = Number(meterReadingBalance) - Number(estimatedBalance);
  return Number(diff.toFixed(2));
}

/**
 * Equation 3.9: Appliance share (%)
 * Share (%) = (energy of the appliance / total energy) * 100
 * @param {number} applianceEnergy
 * @param {number} totalEnergy
 * @returns {number} Percentage (0-100)
 */
export function applianceShare(applianceEnergy, totalEnergy) {
  const ae = Number(applianceEnergy) || 0;
  const te = Number(totalEnergy) || 0;
  if (te <= 0) return 0;
  return Number(((ae / te) * 100).toFixed(1));
}

/**
 * Equation 3.10: Period change (%)
 * Change (%) = ((current total - previous total) / previous total) * 100
 * @param {number} currentTotal
 * @param {number} previousTotal
 * @returns {number} Percentage change
 */
export function periodChange(currentTotal, previousTotal) {
  const curr = Number(currentTotal) || 0;
  const prev = Number(previousTotal) || 0;
  if (prev === 0) return 0;
  return Number((((curr - prev) / prev) * 100).toFixed(1));
}


// ==========================================
// PREDICTOR FUNCTIONS (Equations 3.5, 3.6, 3.7, 3.8, Table 3.8)
// ==========================================

/**
 * Equation 3.5: Average daily consumption (in kWh)
 * Mean of the daily totals of the most recent N recorded days.
 * If no usage records exist, uses the estimated daily energy of appliances that are ON.
 *
 * @param {Array<{ usage_date: string, energy_kwh: number }> | number[]} usageInput - Usage records or daily totals
 * @param {number} averagingDays - Number of days N (default 7)
 * @param {Array<{ power_watts: number, quantity: number, daily_hours: number, state?: string }>} [fallbackAppliances=[]]
 * @returns {{ average: number, count: number, isEstimate: boolean }}
 */
export function averageDailyEnergy(usageInput = [], averagingDays = 7, fallbackAppliances = []) {
  const n = Math.max(1, Number(averagingDays) || 7);

  // If array of daily total numbers was passed directly
  let dailyTotals = [];
  if (Array.isArray(usageInput) && usageInput.length > 0) {
    if (typeof usageInput[0] === 'number') {
      dailyTotals = usageInput;
    } else {
      // Group records by usage_date
      const grouped = {};
      usageInput.forEach((rec) => {
        if (!rec.usage_date) return;
        grouped[rec.usage_date] = (grouped[rec.usage_date] || 0) + (Number(rec.energy_kwh) || 0);
      });
      const sortedDates = Object.keys(grouped).sort();
      dailyTotals = sortedDates.map((d) => grouped[d]);
    }
  }

  if (dailyTotals.length > 0) {
    // Take the most recent N recorded days
    const recent = dailyTotals.slice(-n);
    const sum = recent.reduce((acc, v) => acc + v, 0);
    const avg = sum / recent.length;
    return {
      average: Number(avg.toFixed(4)),
      count: recent.length,
      isEstimate: false,
    };
  }

  // Fallback: estimate from appliances that are ON
  if (Array.isArray(fallbackAppliances) && fallbackAppliances.length > 0) {
    const onAppliances = fallbackAppliances.filter(
      (a) => (a.state || 'ON').toUpperCase() === 'ON'
    );
    const totalEst = onAppliances.reduce((sum, a) => {
      return sum + estimateApplianceEnergy(a.power_watts, a.quantity, a.daily_hours);
    }, 0);
    return {
      average: Number(totalEst.toFixed(4)),
      count: 0,
      isEstimate: true,
    };
  }

  return { average: 0, count: 0, isEstimate: false };
}

/**
 * Equation 3.6: Recharge duration (in days)
 * T = B / A
 * @param {number} balance - Remaining energy balance in kWh (B)
 * @param {number} averageDailyConsumption - Average daily consumption in kWh (A)
 * @returns {number} Duration in days (rounded to 2 decimal places in calculations, display to 1 d.p.)
 */
export function estimateDuration(balance, averageDailyConsumption) {
  const b = Number(balance) || 0;
  const a = Number(averageDailyConsumption) || 0;
  if (a <= 0 || b <= 0) return 0;
  return Number((b / a).toFixed(2));
}

/**
 * Equation 3.6 (part 2): Projected depletion date
 * Balance date plus the whole number of days in T (Math.floor(T)).
 * @param {string | Date} balanceDate - Date as string 'YYYY-MM-DD' or Date object
 * @param {number} durationDays - Recharge duration T in days
 * @returns {string | null} Date string 'YYYY-MM-DD'
 */
export function projectDepletionDate(balanceDate, durationDays) {
  if (!balanceDate) return null;
  const days = Math.floor(Number(durationDays) || 0);
  const d = new Date(balanceDate);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Equation 3.7: Cost per kWh
 * Cost per kWh = amount paid / units received
 * @param {number} amountNaira - Amount paid in Naira
 * @param {number} unitsKwh - Energy units received in kWh
 * @returns {number} Cost per kWh in Naira
 */
export function costPerKwh(amountNaira, unitsKwh) {
  const amt = Number(amountNaira) || 0;
  const units = Number(unitsKwh) || 0;
  if (units <= 0 || amt <= 0) return 0;
  return Number((amt / units).toFixed(2));
}

/**
 * Equation 3.8: Estimated daily cost
 * Estimated daily cost = A * cost per kWh
 * @param {number} averageDailyEnergy - Average daily consumption in kWh (A)
 * @param {number} costPerKwh - Cost of one kWh in Naira
 * @returns {number} Daily cost in Naira
 */
export function estimatedDailyCost(averageDailyEnergy, costPerKwh) {
  const a = Number(averageDailyEnergy) || 0;
  const cost = Number(costPerKwh) || 0;
  return Number((a * cost).toFixed(2));
}

/**
 * Table 3.8: Alert status
 * - Critical: Balance is 0 or duration <= 1 day
 * - Low: duration > 1 and duration <= alertDays (default 3)
 * - Normal: duration > alertDays
 *
 * @param {number} balance - Balance in kWh
 * @param {number} durationDays - Duration T in days
 * @param {number} alertDays - Configurable threshold for Low alert (default 3)
 * @returns {'Critical' | 'Low' | 'Normal'}
 */
export function alertStatus(balance, durationDays, alertDays = 3) {
  const b = Number(balance) || 0;
  const t = Number(durationDays) || 0;
  const threshold = Number(alertDays) || 3;

  if (b <= 0 || t <= 1) {
    return 'Critical';
  }
  if (t <= threshold) {
    return 'Low';
  }
  return 'Normal';
}

/**
 * Formats a duration for UI display (1 decimal place as specified in Section 3.6.7)
 * e.g., 6.57 -> "6.6 days"
 * @param {number} durationDays
 * @returns {string}
 */
export function formatDuration(durationDays) {
  const t = Number(durationDays) || 0;
  return `${t.toFixed(1)} days`;
}

/**
 * Formats Naira currency
 * e.g., 2948.57 -> "₦2,948.57"
 * @param {number} amount
 * @returns {string}
 */
export function formatNaira(amount) {
  const val = Number(amount) || 0;
  return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

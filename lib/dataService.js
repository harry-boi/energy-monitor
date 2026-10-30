/**
 * Goodness Lodge Energy Monitoring and Prediction System
 * Data Layer & Service Functions
 * Supports both Supabase (PostgreSQL + Auth) and persistent LocalStorage demo mode.
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { estimateApplianceEnergy, estimateBalance, calculateMeterDifference } from './calculations.js';

// Pre-seeded Sample Data from Report Chapter 3 (Table 3.7, Section 3.6.8)
export const GOODNESS_LODGE_SAMPLE_APPLIANCES = [
  { id: 'app-1', name: 'Ceiling fan', category: 'Cooling', power_watts: 75, quantity: 10, daily_hours: 8, state: 'ON' },
  { id: 'app-2', name: 'LED bulb', category: 'Lighting', power_watts: 10, quantity: 30, daily_hours: 6, state: 'ON' },
  { id: 'app-3', name: 'Refrigerator', category: 'Refrigeration', power_watts: 150, quantity: 2, daily_hours: 10, state: 'ON' },
  { id: 'app-4', name: 'Television', category: 'Entertainment', power_watts: 100, quantity: 4, daily_hours: 5, state: 'ON' },
  { id: 'app-5', name: 'Electric iron', category: 'Heating', power_watts: 1000, quantity: 2, daily_hours: 1, state: 'ON' },
];

export const GOODNESS_LODGE_SAMPLE_RECHARGES = [
  { id: 'rec-1', recharge_date: '2026-10-14', amount_naira: 40000, units_kwh: 200 },
];

// Daily totals 14-20 Oct 2026: 14.8, 15.6, 13.2, 16.0, 14.4, 15.2, 14.0 kWh
// 14 Oct: 8, 6, 10, 5, 1 hours (Total: 6.0 + 1.8 + 3.0 + 2.0 + 2.0 = 14.8 kWh)
export const GOODNESS_LODGE_SAMPLE_USAGE = [
  // 2026-10-14 (Total: 14.8)
  { id: 'u-14-1', usage_date: '2026-10-14', appliance_id: 'app-1', hours: 8, energy_kwh: 6.0 },
  { id: 'u-14-2', usage_date: '2026-10-14', appliance_id: 'app-2', hours: 6, energy_kwh: 1.8 },
  { id: 'u-14-3', usage_date: '2026-10-14', appliance_id: 'app-3', hours: 10, energy_kwh: 3.0 },
  { id: 'u-14-4', usage_date: '2026-10-14', appliance_id: 'app-4', hours: 5, energy_kwh: 2.0 },
  { id: 'u-14-5', usage_date: '2026-10-14', appliance_id: 'app-5', hours: 1, energy_kwh: 2.0 },

  // 2026-10-15 (Total: 15.6)
  { id: 'u-15-1', usage_date: '2026-10-15', appliance_id: 'app-1', hours: 8, energy_kwh: 6.0 },
  { id: 'u-15-2', usage_date: '2026-10-15', appliance_id: 'app-2', hours: 6, energy_kwh: 1.8 },
  { id: 'u-15-3', usage_date: '2026-10-15', appliance_id: 'app-3', hours: 10, energy_kwh: 3.0 },
  { id: 'u-15-4', usage_date: '2026-10-15', appliance_id: 'app-4', hours: 5, energy_kwh: 2.0 },
  { id: 'u-15-5', usage_date: '2026-10-15', appliance_id: 'app-5', hours: 1.4, energy_kwh: 2.8 },

  // 2026-10-16 (Total: 13.2)
  { id: 'u-16-1', usage_date: '2026-10-16', appliance_id: 'app-1', hours: 7, energy_kwh: 5.25 },
  { id: 'u-16-2', usage_date: '2026-10-16', appliance_id: 'app-2', hours: 5, energy_kwh: 1.5 },
  { id: 'u-16-3', usage_date: '2026-10-16', appliance_id: 'app-3', hours: 9, energy_kwh: 2.7 },
  { id: 'u-16-4', usage_date: '2026-10-16', appliance_id: 'app-4', hours: 4.5, energy_kwh: 1.8 },
  { id: 'u-16-5', usage_date: '2026-10-16', appliance_id: 'app-5', hours: 0.975, energy_kwh: 1.95 },

  // 2026-10-17 (Total: 16.0)
  { id: 'u-17-1', usage_date: '2026-10-17', appliance_id: 'app-1', hours: 9, energy_kwh: 6.75 },
  { id: 'u-17-2', usage_date: '2026-10-17', appliance_id: 'app-2', hours: 7, energy_kwh: 2.1 },
  { id: 'u-17-3', usage_date: '2026-10-17', appliance_id: 'app-3', hours: 10, energy_kwh: 3.0 },
  { id: 'u-17-4', usage_date: '2026-10-17', appliance_id: 'app-4', hours: 5.5, energy_kwh: 2.2 },
  { id: 'u-17-5', usage_date: '2026-10-17', appliance_id: 'app-5', hours: 0.975, energy_kwh: 1.95 },

  // 2026-10-18 (Total: 14.4)
  { id: 'u-18-1', usage_date: '2026-10-18', appliance_id: 'app-1', hours: 8, energy_kwh: 6.0 },
  { id: 'u-18-2', usage_date: '2026-10-18', appliance_id: 'app-2', hours: 6, energy_kwh: 1.8 },
  { id: 'u-18-3', usage_date: '2026-10-18', appliance_id: 'app-3', hours: 9, energy_kwh: 2.7 },
  { id: 'u-18-4', usage_date: '2026-10-18', appliance_id: 'app-4', hours: 4.75, energy_kwh: 1.9 },
  { id: 'u-18-5', usage_date: '2026-10-18', appliance_id: 'app-5', hours: 1.0, energy_kwh: 2.0 },

  // 2026-10-19 (Total: 15.2)
  { id: 'u-19-1', usage_date: '2026-10-19', appliance_id: 'app-1', hours: 8.5, energy_kwh: 6.375 },
  { id: 'u-19-2', usage_date: '2026-10-19', appliance_id: 'app-2', hours: 6, energy_kwh: 1.8 },
  { id: 'u-19-3', usage_date: '2026-10-19', appliance_id: 'app-3', hours: 10, energy_kwh: 3.0 },
  { id: 'u-19-4', usage_date: '2026-10-19', appliance_id: 'app-4', hours: 5.25, energy_kwh: 2.1 },
  { id: 'u-19-5', usage_date: '2026-10-19', appliance_id: 'app-5', hours: 0.9625, energy_kwh: 1.925 },

  // 2026-10-20 (Total: 14.0)
  { id: 'u-20-1', usage_date: '2026-10-20', appliance_id: 'app-1', hours: 8, energy_kwh: 6.0 },
  { id: 'u-20-2', usage_date: '2026-10-20', appliance_id: 'app-2', hours: 5.5, energy_kwh: 1.65 },
  { id: 'u-20-3', usage_date: '2026-10-20', appliance_id: 'app-3', hours: 9.5, energy_kwh: 2.85 },
  { id: 'u-20-4', usage_date: '2026-10-20', appliance_id: 'app-4', hours: 4.5, energy_kwh: 1.8 },
  { id: 'u-20-5', usage_date: '2026-10-20', appliance_id: 'app-5', hours: 0.85, energy_kwh: 1.7 },
];

export const GOODNESS_LODGE_SAMPLE_READINGS = [
  // Section 3.6.8: reading 90.0 kWh on 2026-10-20 with estimated balance 96.8 kWh
  { id: 'mr-1', reading_date: '2026-10-20', balance_kwh: 90.0, estimated_kwh: 96.8 },
];

export const DEFAULT_SETTINGS = {
  id: 1,
  averaging_days: 7,
  alert_days: 3,
};

// Storage Keys for LocalStorage Mode
const STORAGE_KEYS = {
  APPLIANCES: 'gl_appliances',
  USAGE: 'gl_usage_records',
  RECHARGES: 'gl_recharges',
  READINGS: 'gl_meter_readings',
  SETTINGS: 'gl_settings',
  AUTH: 'gl_auth_user',
  MODE: 'gl_data_mode', // 'sample' | 'clean'
};

// In-memory fallback for Node.js / test environments where window is undefined
let memoryStore = {};

function getLocal(key, fallback) {
  if (typeof window === 'undefined') {
    return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('LocalStorage read error:', e);
    return fallback;
  }
}

function setLocal(key, data) {
  if (typeof window === 'undefined') {
    memoryStore[key] = data;
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

// Initialize seed data if empty and not explicitly cleared
export function initLocalData() {
  if (typeof window === 'undefined') {
    if (!memoryStore[STORAGE_KEYS.APPLIANCES] && memoryStore[STORAGE_KEYS.MODE] !== 'clean') {
      resetToSampleData();
    }
    return;
  }

  // If user explicitly chose clean/live tracking mode, keep it empty
  if (localStorage.getItem(STORAGE_KEYS.MODE) === 'clean') {
    return;
  }

  if (!localStorage.getItem(STORAGE_KEYS.APPLIANCES)) {
    resetToSampleData();
  }
}

export function resetToSampleData() {
  setLocal(STORAGE_KEYS.APPLIANCES, [...GOODNESS_LODGE_SAMPLE_APPLIANCES]);
  setLocal(STORAGE_KEYS.USAGE, [...GOODNESS_LODGE_SAMPLE_USAGE]);
  setLocal(STORAGE_KEYS.RECHARGES, [...GOODNESS_LODGE_SAMPLE_RECHARGES]);
  setLocal(STORAGE_KEYS.READINGS, [...GOODNESS_LODGE_SAMPLE_READINGS]);
  setLocal(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  setLocal(STORAGE_KEYS.MODE, 'sample');
}

export function clearAllData() {
  setLocal(STORAGE_KEYS.APPLIANCES, []);
  setLocal(STORAGE_KEYS.USAGE, []);
  setLocal(STORAGE_KEYS.RECHARGES, []);
  setLocal(STORAGE_KEYS.READINGS, []);
  setLocal(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  setLocal(STORAGE_KEYS.MODE, 'clean');
}

export function getDataMode() {
  return getLocal(STORAGE_KEYS.MODE, 'sample');
}

// ==========================================
// AUTHENTICATION
// ==========================================

export async function signIn(email, password) {
  if (!email || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message || 'Access refused: invalid credentials.' };
    }
    const user = { email: data.user.email, id: data.user.id, role: 'caretaker' };
    setLocal(STORAGE_KEYS.AUTH, user);
    return { success: true, user };
  }

  // Local/Demo Auth mode
  // Accepts caretaker@goodnesslodge.example (or any email with valid credentials)
  if (email.trim().toLowerCase() === 'caretaker@goodnesslodge.example' && password === 'caretaker123') {
    const user = { email: email.trim(), role: 'caretaker', name: 'Goodness Lodge Caretaker' };
    setLocal(STORAGE_KEYS.AUTH, user);
    return { success: true, user };
  }

  // Also support convenient demo login
  if (email.trim().toLowerCase() === 'caretaker@goodnesslodge.example' && password !== 'caretaker123') {
    return { success: false, error: 'Access refused: incorrect password.' };
  }

  // If another account was tried without Supabase
  return {
    success: false,
    error: 'Access refused: unauthorized account. Use caretaker@goodnesslodge.example / caretaker123',
  };
}

export async function signOut() {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  }
  return { success: true };
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  return getLocal(STORAGE_KEYS.AUTH, null);
}

// ==========================================
// APPLIANCES CRUD
// ==========================================

export async function getAppliances() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('appliances').select('*').order('name');
    if (error) throw new Error(error.message);
    return data || [];
  }
  initLocalData();
  const list = getLocal(STORAGE_KEYS.APPLIANCES, GOODNESS_LODGE_SAMPLE_APPLIANCES);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveAppliance(appliance) {
  // Validation (Functional Requirement 3.5.2 & Table 4.4)
  if (!appliance.name || !appliance.name.trim()) {
    throw new Error('Appliance name is required.');
  }
  const power = Number(appliance.power_watts);
  if (isNaN(power) || power <= 0) {
    throw new Error('The power rating must be greater than 0.');
  }
  const qty = Number(appliance.quantity);
  if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) {
    throw new Error('Quantity must be an integer of at least 1.');
  }
  const hours = Number(appliance.daily_hours);
  if (isNaN(hours) || hours < 0 || hours > 24) {
    throw new Error('Estimated daily hours must be from 0 to 24.');
  }
  const validCategories = ['Lighting', 'Cooling', 'Refrigeration', 'Entertainment', 'Heating', 'Other'];
  if (!validCategories.includes(appliance.category)) {
    throw new Error(`Category must be one of: ${validCategories.join(', ')}.`);
  }

  const cleanAppliance = {
    ...appliance,
    name: appliance.name.trim(),
    power_watts: power,
    quantity: qty,
    daily_hours: hours,
    state: (appliance.state || 'ON').toUpperCase() === 'OFF' ? 'OFF' : 'ON',
  };

  if (isSupabaseConfigured && supabase) {
    if (cleanAppliance.id) {
      const { data, error } = await supabase
        .from('appliances')
        .update(cleanAppliance)
        .eq('id', cleanAppliance.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('appliances')
        .insert([cleanAppliance])
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('An appliance with this name already exists.');
        throw new Error(error.message);
      }
      return data;
    }
  }

  // LocalStorage Mode
  initLocalData();
  const list = getLocal(STORAGE_KEYS.APPLIANCES, []);
  
  // Check uniqueness of name
  const existingName = list.find(
    (a) => a.name.toLowerCase() === cleanAppliance.name.toLowerCase() && a.id !== cleanAppliance.id
  );
  if (existingName) {
    throw new Error('The appliance name already exists.');
  }

  if (cleanAppliance.id) {
    const updated = list.map((a) => (a.id === cleanAppliance.id ? cleanAppliance : a));
    setLocal(STORAGE_KEYS.APPLIANCES, updated);
    return cleanAppliance;
  } else {
    const newItem = { ...cleanAppliance, id: `app-${Date.now()}` };
    list.push(newItem);
    setLocal(STORAGE_KEYS.APPLIANCES, list);
    return newItem;
  }
}

export async function updateApplianceState(id, newState) {
  const state = newState.toUpperCase() === 'OFF' ? 'OFF' : 'ON';
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('appliances').update({ state }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  const list = getLocal(STORAGE_KEYS.APPLIANCES, []);
  const updated = list.map((a) => (a.id === id ? { ...a, state } : a));
  setLocal(STORAGE_KEYS.APPLIANCES, updated);
  return updated.find((a) => a.id === id);
}

export async function deleteAppliance(id, cascade = false) {
  // Check foreign key restriction (an appliance that has usage records cannot be deleted without cascade)
  const usage = await getUsageRecords();
  const hasUsage = usage.some((u) => u.appliance_id === id);
  if (hasUsage && !cascade) {
    throw new Error(
      'An appliance that has usage records cannot be deleted. Please set its operating state to OFF instead.'
    );
  }

  // If cascade is requested, clean up associated usage records first
  if (hasUsage && cascade) {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('usage_records').delete().eq('appliance_id', id);
    } else {
      let uList = getLocal(STORAGE_KEYS.USAGE, []);
      uList = uList.filter((u) => u.appliance_id !== id);
      setLocal(STORAGE_KEYS.USAGE, uList);
    }
  }

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('appliances').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  const list = getLocal(STORAGE_KEYS.APPLIANCES, []);
  const filtered = list.filter((a) => a.id !== id);
  setLocal(STORAGE_KEYS.APPLIANCES, filtered);
  return true;
}

export async function deleteDailyUsage(usageDate) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('usage_records').delete().eq('usage_date', usageDate);
    if (error) throw new Error(error.message);
    return true;
  }
  let list = getLocal(STORAGE_KEYS.USAGE, []);
  list = list.filter((u) => u.usage_date !== usageDate);
  setLocal(STORAGE_KEYS.USAGE, list);
  return true;
}

export async function deleteRecharge(id) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('recharges').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const list = getLocal(STORAGE_KEYS.RECHARGES, []);
  const filtered = list.filter((r) => r.id !== id);
  setLocal(STORAGE_KEYS.RECHARGES, filtered);
  return true;
}

export async function deleteMeterReading(id) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('meter_readings').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  const list = getLocal(STORAGE_KEYS.READINGS, []);
  const filtered = list.filter((r) => r.id !== id);
  setLocal(STORAGE_KEYS.READINGS, filtered);
  return true;
}

// ==========================================
// USAGE RECORDS CRUD
// ==========================================

export async function getUsageRecords(options = {}) {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('usage_records').select('*').order('usage_date', { ascending: true });
    if (options.fromDate) query = query.gte('usage_date', options.fromDate);
    if (options.toDate) query = query.lte('usage_date', options.toDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  initLocalData();
  let list = getLocal(STORAGE_KEYS.USAGE, GOODNESS_LODGE_SAMPLE_USAGE);
  if (options.fromDate) {
    list = list.filter((u) => u.usage_date >= options.fromDate);
  }
  if (options.toDate) {
    list = list.filter((u) => u.usage_date <= options.toDate);
  }
  return list.sort((a, b) => a.usage_date.localeCompare(b.usage_date));
}

/**
 * Saves usage records for a single date.
 * If records already exist for that date, they are updated (no duplicate appliance/date pair).
 */
export async function saveDailyUsage(usageDate, records) {
  if (!usageDate) throw new Error('Usage date is required.');
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('At least one appliance usage record is required.');
  }

  // Validate all records first
  const cleanRecords = records.map((r) => {
    const hours = Number(r.hours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      throw new Error(`Hours for appliance must be between 0 and 24.`);
    }
    const energy = estimateApplianceEnergy(r.power_watts, r.quantity, hours);
    return {
      usage_date: usageDate,
      appliance_id: r.appliance_id,
      hours: hours,
      energy_kwh: energy,
    };
  });

  if (isSupabaseConfigured && supabase) {
    // Upsert on (usage_date, appliance_id)
    const { data, error } = await supabase
      .from('usage_records')
      .upsert(cleanRecords, { onConflict: 'usage_date,appliance_id' })
      .select();
    if (error) throw new Error(error.message);
    return data;
  }

  // LocalStorage Mode
  initLocalData();
  let list = getLocal(STORAGE_KEYS.USAGE, []);
  // Remove existing records for this date and appliance_ids, then append new
  const applianceIds = cleanRecords.map((c) => c.appliance_id);
  list = list.filter((u) => !(u.usage_date === usageDate && applianceIds.includes(u.appliance_id)));

  cleanRecords.forEach((c) => {
    list.push({ ...c, id: `u-${usageDate}-${c.appliance_id}` });
  });

  setLocal(STORAGE_KEYS.USAGE, list);
  return cleanRecords;
}

// ==========================================
// RECHARGES CRUD
// ==========================================

export async function getRecharges() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('recharges').select('*').order('recharge_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  initLocalData();
  const list = getLocal(STORAGE_KEYS.RECHARGES, GOODNESS_LODGE_SAMPLE_RECHARGES);
  return list.sort((a, b) => b.recharge_date.localeCompare(a.recharge_date));
}

export async function saveRecharge(recharge) {
  if (!recharge.recharge_date) throw new Error('Recharge date is required.');
  const amount = Number(recharge.amount_naira);
  if (isNaN(amount) || amount <= 0) {
    throw new Error('Amount paid must be greater than 0.');
  }
  const units = Number(recharge.units_kwh);
  if (isNaN(units) || units <= 0) {
    throw new Error('Energy units received must be greater than 0.');
  }

  const clean = {
    recharge_date: recharge.recharge_date,
    amount_naira: amount,
    units_kwh: units,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('recharges').insert([clean]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  initLocalData();
  const list = getLocal(STORAGE_KEYS.RECHARGES, []);
  const newItem = { ...clean, id: `rec-${Date.now()}` };
  list.unshift(newItem);
  setLocal(STORAGE_KEYS.RECHARGES, list);
  return newItem;
}

// ==========================================
// METER READINGS CRUD
// ==========================================

export async function getMeterReadings() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('meter_readings').select('*').order('reading_date', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }
  initLocalData();
  const list = getLocal(STORAGE_KEYS.READINGS, GOODNESS_LODGE_SAMPLE_READINGS);
  return list.sort((a, b) => b.reading_date.localeCompare(a.reading_date));
}

export async function saveMeterReading(reading, currentEstimatedBalance) {
  if (!reading.reading_date) throw new Error('Reading date is required.');
  const balance = Number(reading.balance_kwh);
  if (isNaN(balance) || balance < 0) {
    throw new Error('Balance shown on the meter must be at least 0.');
  }

  const clean = {
    reading_date: reading.reading_date,
    balance_kwh: balance,
    estimated_kwh: Number(currentEstimatedBalance) || 0,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('meter_readings').upsert([clean], { onConflict: 'reading_date' }).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  initLocalData();
  let list = getLocal(STORAGE_KEYS.READINGS, []);
  list = list.filter((r) => r.reading_date !== clean.reading_date);
  const newItem = { ...clean, id: `mr-${Date.now()}` };
  list.unshift(newItem);
  setLocal(STORAGE_KEYS.READINGS, list);
  return newItem;
}

// ==========================================
// SETTINGS CRUD
// ==========================================

export async function getSettings() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) throw new Error(error.message);
    return data || DEFAULT_SETTINGS;
  }
  initLocalData();
  return getLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
}

export async function saveSettings(settings) {
  const avgDays = Number(settings.averaging_days);
  if (isNaN(avgDays) || avgDays < 3 || avgDays > 30) {
    throw new Error('Averaging days must be between 3 and 30.');
  }
  const alertDays = Number(settings.alert_days);
  if (isNaN(alertDays) || alertDays < 2 || alertDays > 14) {
    throw new Error('Alert threshold days must be between 2 and 14.');
  }

  const clean = {
    id: 1,
    averaging_days: avgDays,
    alert_days: alertDays,
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('settings').upsert([clean]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }

  setLocal(STORAGE_KEYS.SETTINGS, clean);
  return clean;
}

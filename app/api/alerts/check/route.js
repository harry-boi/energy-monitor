import { NextResponse, connection } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase.js';
import {
  estimateBalance,
  averageDailyEnergy,
  estimateDuration,
  projectDepletionDate,
  alertStatus,
} from '../../../../lib/calculations.js';
import { decideAlertAction, buildAlertEmail, buildTestEmail } from '../../../../lib/alerts.js';
import { sendEmail } from '../../../../lib/email.js';

const LODGE_NAME = 'Goodness Lodge';

// ==========================================
// ALERT CHECK
// Recomputes the balance, average consumption, projected duration and alert
// status exactly as the dashboard does (Equations 3.4-3.6, Table 3.8), then
// emails the caretaker when the status is Low or Critical, once per episode
// and level. Runs from the Vercel cron schedule (see vercel.json) or on
// demand. Supabase mode only: in sample mode there is no server-side data.
// ==========================================

async function loadSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || { averaging_days: 7, alert_days: 3 };
}

async function saveAlertState(settings, patch) {
  const { error } = await supabase
    .from('settings')
    .update(patch)
    .eq('id', 1);
  if (error) throw new Error(error.message);
  return { ...settings, ...patch };
}

async function runAlertCheck() {
  if (!isSupabaseConfigured || !supabase) {
    return { skipped: 'Supabase is not configured (sample mode); no server-side data to check.' };
  }

  const settings = await loadSettings();

  const [appliancesRes, usageRes, rechargesRes, readingsRes] = await Promise.all([
    supabase.from('appliances').select('*'),
    supabase.from('usage_records').select('*'),
    supabase.from('recharges').select('*').order('recharge_date', { ascending: false }),
    supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }),
  ]);
  for (const r of [appliancesRes, usageRes, rechargesRes, readingsRes]) {
    if (r.error) throw new Error(r.error.message);
  }

  const appliances = appliancesRes.data || [];
  const usageRecords = usageRes.data || [];
  const recharges = rechargesRes.data || [];
  const meterReadings = readingsRes.data || [];
  const latestMeterReading = meterReadings.length > 0 ? meterReadings[0] : null;

  const balResult = estimateBalance(recharges, usageRecords, latestMeterReading);
  const avgResult = averageDailyEnergy(usageRecords, settings.averaging_days || 7, appliances);
  const duration = estimateDuration(balResult.balance, avgResult.average);
  const depletionDate = projectDepletionDate(balResult.asAtDate, duration);
  const status = alertStatus(balResult.balance, duration, settings.alert_days || 3);

  const facts = {
    status,
    balance_kwh: balResult.balance,
    average_daily_kwh: avgResult.average,
    duration_days: duration,
    depletion_date: depletionDate,
  };

  if (!('alerts_enabled' in settings)) {
    return {
      ...facts,
      action: 'unconfigured',
      note: 'The alert columns are missing from the settings table. Run section 8 of schema.sql in Supabase, then enable email alerts in Settings.',
    };
  }

  if (!settings.alerts_enabled || !settings.alert_email) {
    return { ...facts, action: 'disabled', note: 'Email alerts are off or no alert email is set.' };
  }

  const action = decideAlertAction(status, settings.last_alert_level || null);

  if (action === 'rearm') {
    await saveAlertState(settings, { last_alert_level: null });
    return { ...facts, action, note: 'Status recovered to Normal; alert re-armed.' };
  }

  if (action === 'skip') {
    return {
      ...facts,
      action,
      note:
        status === 'Normal'
          ? 'Status is Normal.'
          : `A ${status} alert was already emailed for this episode.`,
    };
  }

  // action === 'send'
  const email = buildAlertEmail({
    status,
    balanceKwh: balResult.balance,
    durationDays: duration,
    depletionDate,
    averageDailyKwh: avgResult.average,
    lodgeName: LODGE_NAME,
  });
  const result = await sendEmail({ to: settings.alert_email, ...email });

  if (result.sent) {
    await saveAlertState(settings, {
      last_alert_level: status,
      last_alert_at: new Date().toISOString(),
    });
    return { ...facts, action: 'sent', email: result };
  }

  return { ...facts, action: 'would-send', email: result };
}

function isAuthorized(request) {
  const cronSecret = process.env.CRON_SECRET;
  const checkKey = process.env.ALERT_CHECK_KEY;
  if (!cronSecret && !checkKey) return true; // nothing configured: allow, the check itself is harmless
  const auth = request.headers.get('authorization') || '';
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const url = new URL(request.url);
  if (checkKey && url.searchParams.get('key') === checkKey) return true;
  return false;
}

export async function GET(request) {
  await connection(); // always run live: the check must read current data
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const result = await runAlertCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

// Test send from the Settings page. Only ever sends to the alert email saved
// in settings, so the endpoint cannot be used to mail arbitrary addresses.
export async function POST(request) {
  await connection();
  try {
    const body = await request.json().catch(() => ({}));
    if (!body || body.test !== true) {
      return NextResponse.json(
        { ok: false, error: 'Only { "test": true } is supported.' },
        { status: 400 }
      );
    }
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        ok: false,
        error: 'Test alerts need Supabase mode; sample-mode data lives in the browser.',
      });
    }
    const settings = await loadSettings();
    if (!settings.alert_email) {
      return NextResponse.json({
        ok: false,
        error: 'No alert email is saved yet. Enter the caretaker email and save first.',
      });
    }
    const email = buildTestEmail(LODGE_NAME);
    const result = await sendEmail({ to: settings.alert_email, ...email });
    return NextResponse.json({ ok: true, test: true, email: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

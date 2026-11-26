import { NextResponse, connection } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../../../lib/supabase.js';
import { decideAlertAction, buildAlertEmail } from '../../../../lib/alerts.js';
import { sendEmail } from '../../../../lib/email.js';

const LODGE_NAME = 'Goodness Lodge';

// ==========================================
// LIVE ALERT
// The dashboard computes a live balance from appliance switch history — a
// figure the server cannot reproduce, because it depends on the current
// time. When the live status becomes Low or Critical, the dashboard posts
// its snapshot here and this endpoint emails the caretaker, once per
// episode and level, using the same rule as the recorded check
// (lib/alerts.js decideAlertAction) but a separate marker
// (settings.live_last_alert_level) so the two mechanisms never interfere.
// A later report of Normal re-arms the marker. The endpoint can only ever
// send to the alert email saved in Settings.
// ==========================================

const VALID_STATUSES = ['Normal', 'Low', 'Critical'];

export async function POST(request) {
  await connection(); // always run live: reads and writes current settings
  try {
    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        ok: true,
        skipped: 'Supabase is not configured (sample mode); live alerts need server-side settings.',
      });
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Body must include a status of Normal, Low or Critical.' },
        { status: 400 }
      );
    }
    const balanceKwh = Number(body.balanceKwh) || 0;
    const durationDays = Number(body.durationDays) || 0;
    const averageDailyKwh = Number(body.averageDailyKwh) || 0;
    const depletionDate =
      typeof body.depletionDate === 'string' && body.depletionDate ? body.depletionDate : null;

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!settings) {
      return NextResponse.json({ ok: true, action: 'unconfigured', note: 'No settings row found.' });
    }

    if (!('live_last_alert_level' in settings)) {
      return NextResponse.json({
        ok: true,
        action: 'unconfigured',
        note: 'The live alert columns are missing from the settings table. Run section 9 of schema.sql in Supabase.',
      });
    }

    if (!settings.alerts_enabled || !settings.alert_email) {
      return NextResponse.json({
        ok: true,
        action: 'disabled',
        note: 'Email alerts are off or no alert email is set.',
      });
    }

    const action = decideAlertAction(status, settings.live_last_alert_level || null);

    if (action === 'rearm') {
      const { error: saveError } = await supabase
        .from('settings')
        .update({ live_last_alert_level: null })
        .eq('id', 1);
      if (saveError) throw new Error(saveError.message);
      return NextResponse.json({
        ok: true,
        action,
        note: 'Live status recovered to Normal; live alert re-armed.',
      });
    }

    if (action === 'skip') {
      return NextResponse.json({
        ok: true,
        action,
        note:
          status === 'Normal'
            ? 'Live status is Normal.'
            : `A live ${status} alert was already emailed for this episode.`,
      });
    }

    // action === 'send'
    const email = buildAlertEmail({
      status,
      balanceKwh,
      durationDays,
      depletionDate,
      averageDailyKwh,
      lodgeName: LODGE_NAME,
    });
    const result = await sendEmail({ to: settings.alert_email, ...email });

    if (result.sent) {
      const { error: saveError } = await supabase
        .from('settings')
        .update({
          live_last_alert_level: status,
          live_last_alert_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (saveError) throw new Error(saveError.message);
      return NextResponse.json({ ok: true, action: 'sent', email: result });
    }

    return NextResponse.json({ ok: true, action: 'would-send', email: result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

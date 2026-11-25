// ==========================================
// EMAIL ALERT DECISIONS + MESSAGE BUILDER
// ==========================================
// The dashboard shows the alert status (Table 3.8) when the caretaker opens
// it. This module is the active half of the alert mechanism: given the
// current status and the level that was last emailed, it decides whether an
// email alert should go out now.
//
// Rules:
// - One email per episode and per level. A Low balance emails once; if it
//   worsens to Critical, that escalation emails again; staying Low does not.
// - When the status recovers to Normal (a recharge has landed), the alert
//   re-arms so the next Low/Critical episode emails afresh.

/**
 * Decide what the alert check should do.
 *
 * @param {'Critical' | 'Low' | 'Normal'} status - Current alert status
 * @param {string | null} lastAlertLevel - Level last emailed ('Low' | 'Critical' | null)
 * @returns {'send' | 'rearm' | 'skip'}
 */
export function decideAlertAction(status, lastAlertLevel) {
  if (status === 'Normal') {
    return lastAlertLevel ? 'rearm' : 'skip';
  }
  // Low or Critical
  return lastAlertLevel === status ? 'skip' : 'send';
}

function formatDateLong(isoDate) {
  if (!isoDate) return 'an unknown date';
  const d = new Date(`${isoDate}T12:00:00`);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Build the alert email for a Low or Critical status.
 *
 * @param {object} facts
 * @param {'Low' | 'Critical'} facts.status
 * @param {number} facts.balanceKwh - Remaining balance in kWh
 * @param {number} facts.durationDays - Projected recharge duration T in days
 * @param {string | null} facts.depletionDate - Projected depletion date 'YYYY-MM-DD'
 * @param {number} facts.averageDailyKwh - Average daily consumption in kWh
 * @param {string} [facts.lodgeName]
 * @returns {{ subject: string, text: string, html: string }}
 */
export function buildAlertEmail(facts) {
  const lodge = facts.lodgeName || 'Goodness Lodge';
  const status = facts.status;
  const balance = (Number(facts.balanceKwh) || 0).toFixed(2);
  const duration = (Number(facts.durationDays) || 0).toFixed(1);
  const average = (Number(facts.averageDailyKwh) || 0).toFixed(2);
  const when = formatDateLong(facts.depletionDate);

  const subject =
    status === 'Critical'
      ? `URGENT: ${lodge} prepaid energy nearly depleted`
      : `Low energy warning: ${lodge} prepaid credit running low`;

  const headline =
    status === 'Critical'
      ? 'The prepaid energy for the lodge is nearly depleted.'
      : 'The prepaid energy for the lodge is running low.';

  const text = [
    headline,
    '',
    `Remaining balance: ${balance} kWh`,
    `Average daily consumption: ${average} kWh per day`,
    `Projected duration: about ${duration} day(s)`,
    `Projected depletion date: ${when}`,
    '',
    'Please arrange a recharge soon so the lodge does not run out of power.',
    '',
    'This alert was sent automatically by the Energy Consumption Monitoring System.',
    'You will not receive another email for this episode unless the situation worsens.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: ${status === 'Critical' ? '#b91c1c' : '#b45309'}; margin-bottom: 8px;">${headline}</h2>
      <table style="border-collapse: collapse; font-size: 14px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Remaining balance</td><td style="padding: 4px 0;"><strong>${balance} kWh</strong></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Average daily consumption</td><td style="padding: 4px 0;">${average} kWh per day</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Projected duration</td><td style="padding: 4px 0;">about ${duration} day(s)</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #64748b;">Projected depletion date</td><td style="padding: 4px 0;"><strong>${when}</strong></td></tr>
      </table>
      <p style="font-size: 14px;">Please arrange a recharge soon so the lodge does not run out of power.</p>
      <p style="font-size: 12px; color: #94a3b8;">This alert was sent automatically by the Energy Consumption Monitoring System. You will not receive another email for this episode unless the situation worsens.</p>
    </div>`;

  return { subject, text, html };
}

/**
 * Build the test email sent from the Settings page, so the caretaker can
 * confirm the alert address works before relying on it.
 */
export function buildTestEmail(lodgeName) {
  const lodge = lodgeName || 'Goodness Lodge';
  const subject = `Test alert: ${lodge} energy email alerts are working`;
  const text = [
    'This is a test of the energy alert email.',
    '',
    `If you are reading this, low-energy alerts for ${lodge} will reach this inbox when the prepaid credit runs low.`,
    '',
    'No action is needed.',
  ].join('\n');
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <h2 style="margin-bottom: 8px;">Test alert received</h2>
      <p style="font-size: 14px;">If you are reading this, low-energy alerts for ${lodge} will reach this inbox when the prepaid credit runs low.</p>
      <p style="font-size: 12px; color: #94a3b8;">No action is needed. Sent by the Energy Consumption Monitoring System.</p>
    </div>`;
  return { subject, text, html };
}

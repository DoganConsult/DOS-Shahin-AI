/**
 * Slack adapter — posts AI-OS alert breaches to a Slack Incoming Webhook.
 *
 * Webhook URL is read from SLACK_WEBHOOK_URL_AI_ALERTS (per-severity overrides
 * SLACK_WEBHOOK_URL_AI_ALERTS_WARNING / _CRITICAL are honoured if set).
 *
 * Fail-open: a missing webhook simply skips delivery (logs a debug line).
 * Non-2xx responses are logged at warn level — alerts already in
 * public.ai_activity_alerts are the durable record; Slack is a notification
 * surface, not a system of record.
 */
import { logger } from '@dos/platform-core/observability';

export interface SlackAlertPayload {
  ruleName: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  tenantId: string | null;
  entityType: string | null;
  entityId: string | null;
  metricSummary: string;
  alertUrl: string;
  firedAt: string;
}

const APP_URL = (process.env.APP_URL || 'https://shahin-ai.com').replace(/\/$/, '');

function resolveWebhookUrl(severity: SlackAlertPayload['severity']): string | null {
  if (severity === 'critical') {
    const u = process.env.SLACK_WEBHOOK_URL_AI_ALERTS_CRITICAL || process.env.SLACK_WEBHOOK_URL_AI_ALERTS;
    return u && u.trim() ? u.trim() : null;
  }
  if (severity === 'warning') {
    const u = process.env.SLACK_WEBHOOK_URL_AI_ALERTS_WARNING || process.env.SLACK_WEBHOOK_URL_AI_ALERTS;
    return u && u.trim() ? u.trim() : null;
  }
  const u = process.env.SLACK_WEBHOOK_URL_AI_ALERTS;
  return u && u.trim() ? u.trim() : null;
}

function severityIcon(s: SlackAlertPayload['severity']): string {
  switch (s) {
    case 'critical': return ':rotating_light:';
    case 'warning':  return ':warning:';
    default:         return ':information_source:';
  }
}

function severityColor(s: SlackAlertPayload['severity']): string {
  switch (s) {
    case 'critical': return '#b91c1c';
    case 'warning':  return '#b45309';
    default:         return '#1f2937';
  }
}

export async function postSlackAiAlert(payload: SlackAlertPayload): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const url = resolveWebhookUrl(payload.severity);
  if (!url) {
    logger.debug?.('[slack] no AI-alert webhook configured, skipping', { severity: payload.severity });
    return { success: false, skipped: true };
  }

  const headerText = `${severityIcon(payload.severity)} *${payload.severity.toUpperCase()}* — ${payload.ruleName}`;
  const tenantLine = payload.tenantId ? `*Tenant:* \`${payload.tenantId}\`` : '*Tenant:* _all_';
  const metricLine = `*Metric:* ${payload.metricSummary}`;
  const firedLine = `*Fired:* ${payload.firedAt}`;
  const ctaUrl = payload.alertUrl || `${APP_URL}/workspace/dnoc/ai-ops`;

  const body = {
    text: `${payload.severity.toUpperCase()} AI alert: ${payload.ruleName}`,
    attachments: [{
      color: severityColor(payload.severity),
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: headerText } },
        { type: 'section', text: { type: 'mrkdwn', text: payload.message } },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: tenantLine },
            { type: 'mrkdwn', text: metricLine },
            { type: 'mrkdwn', text: firedLine },
            { type: 'mrkdwn', text: `*Entity:* ${payload.entityType ?? '—'} / ${payload.entityId ?? '—'}` },
          ],
        },
        {
          type: 'actions',
          elements: [
            { type: 'button', style: payload.severity === 'critical' ? 'danger' : 'primary',
              text: { type: 'plain_text', text: 'Open DNOC AI Ops' }, url: `${APP_URL}/workspace/dnoc/ai-ops` },
            { type: 'button',
              text: { type: 'plain_text', text: 'DSOC AI Security' }, url: `${APP_URL}/workspace/dsoc/ai-security` },
            { type: 'button',
              text: { type: 'plain_text', text: 'Acknowledge' }, url: ctaUrl },
          ],
        },
      ],
    }],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      logger.warn('[slack] AI-alert post non-2xx', { status: res.status, body: t.slice(0, 200), rule: payload.ruleName });
      return { success: false, error: `Slack ${res.status}` };
    }
    logger.info('[slack] AI-alert delivered', { rule: payload.ruleName, severity: payload.severity });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn('[slack] AI-alert post failed', { error: msg, rule: payload.ruleName });
    return { success: false, error: msg };
  }
}

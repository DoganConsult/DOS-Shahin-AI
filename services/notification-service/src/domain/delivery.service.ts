/**
 * Email Delivery Service — Microsoft Graph API primary, SMTP fallback
 *
 * Primary: Microsoft Graph API via OAuth2 Client Credentials
 *   Uses Shahin-ai Server app registration to send as info@doganconsult.com
 *   Requires Mail.Send permission in Azure AD
 *
 * Fallback: SMTP via smtp.office365.com:587
 *   Uses info@doganconsult.com with password authentication
 *
 * @owner DOS Platform
 */
import * as nodemailer from 'nodemailer';
import { logger } from '@dos/platform-core/observability';
import type { TemplateId as MjmlTemplateId, Lang as MjmlLang } from './mjml-renderer.service';

export interface EmailDeliveryResult {
  success: boolean;
  attempts: number;
  provider: 'graph' | 'smtp';
  error?: string;
  messageId?: string;
}

export type EmailTemplateName =
  | 'notification' | 'approval_request' | 'escalation' | 'deadline_reminder'
  | 'incident_alert' | 'report_ready' | 'welcome' | 'invitation'
  | 'email_verification' | 'password_reset'
  | 'ai_alert_warning' | 'ai_alert_critical'
  | 'subscription_renewal_reminder' | 'subscription_payment_failed'
  | 'subscription_grace_started' | 'subscription_grace_ending'
  | 'subscription_renewed' | 'subscription_expired' | 'subscription_extended'
  | 'subscription_upgraded' | 'subscription_downgrade_scheduled'
  | 'subscription_downgraded' | 'subscription_paused' | 'subscription_resumed'
  | 'subscription_cancelled';

export interface EmailTemplateData {
  recipientName?: string;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  language?: 'en' | 'ar';
}

const BRAND_COLOR = process.env.BRAND_COLOR || '#1a56db';
const BRAND_NAME = process.env.BRAND_NAME || 'Shahin-Ai';
const APP_URL = process.env.APP_URL || 'https://shahin-ai.com';
const MAX_RETRIES = 3;

// ── Email From Type ──────────────────────────────────────────────
export type EmailFromType = 'platform' | 'product';

const FROM_PLATFORM = process.env.SMTP_FROM_PLATFORM || 'Dogan-AI-OS <info@doganconsult.com>';
const FROM_PRODUCT = process.env.SMTP_FROM_PRODUCT || 'Shahin-Ai <info@shahin-ai.com>';
const FROM_LEGACY = process.env.SMTP_FROM || `${BRAND_NAME} <noreply@dogan-ai.com>`;

// Email addresses for Graph API (just the address, no display name)
const GRAPH_SENDER_PLATFORM = 'info@doganconsult.com';
const GRAPH_SENDER_PRODUCT = 'info@shahin-ai.com';

function resolveFromAddress(fromType?: EmailFromType): string {
  switch (fromType) {
    case 'platform': return FROM_PLATFORM;
    case 'product': return FROM_PRODUCT;
    default: return FROM_LEGACY;
  }
}

function resolveGraphSender(fromType?: EmailFromType): string {
  return fromType === 'product' ? GRAPH_SENDER_PRODUCT : GRAPH_SENDER_PLATFORM;
}

// ═══════════════════════════════════════════════════════════════════
// MICROSOFT GRAPH API — OAuth2 Client Credentials Flow
// ═══════════════════════════════════════════════════════════════════

const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const GRAPH_ENDPOINT = process.env.GRAPH_API_ENDPOINT || 'https://graph.microsoft.com/v1.0';

let _graphToken: { token: string; expiresAt: number } | null = null;

async function getGraphAccessToken(): Promise<string> {
  if (_graphToken && Date.now() < _graphToken.expiresAt - 60_000) {
    return _graphToken.token;
  }

  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID) {
    throw new Error('Azure AD credentials not configured (AZURE_TENANT_ID, AZURE_CLIENT_ID)');
  }

  const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
  let body: URLSearchParams;

  if (AZURE_CLIENT_SECRET) {
    // Client Credentials flow (app-level, no user password needed)
    body = new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      client_secret: AZURE_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    });
  } else {
    // ROPC flow (user password — uses SMTP_USER + SMTP_PASS as Graph credentials)
    const username = process.env.SMTP_USER || GRAPH_SENDER_PLATFORM;
    const password = process.env.SMTP_PASS || '';
    if (!password) {
      throw new Error('Neither AZURE_CLIENT_SECRET nor SMTP_PASS configured for Graph API auth');
    }
    body = new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      scope: 'https://graph.microsoft.com/Mail.Send offline_access',
      grant_type: 'password',
      username,
      password,
    });
  }

  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Graph token request failed (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  _graphToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  logger.info('[graph] OAuth2 token acquired', { expiresIn: data.expires_in });
  return _graphToken.token;
}

async function sendViaGraph(
  to: string,
  subject: string,
  htmlBody: string,
  senderEmail: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const token = await getGraphAccessToken();

    const message = {
      message: {
        subject,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: true,
    };

    const sendUrl = `${GRAPH_ENDPOINT}/users/${senderEmail}/sendMail`;
    const resp = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(15_000),
    });

    if (resp.status === 202 || resp.ok) {
      return { success: true };
    }

    const errBody = await resp.text().catch(() => '');
    return { success: false, error: `Graph API ${resp.status}: ${errBody.slice(0, 200)}` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Graph API error' };
  }
}

// ═══════════════════════════════════════════════════════════════════
// SMTP FALLBACK — nodemailer via smtp.office365.com
// ═══════════════════════════════════════════════════════════════════

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST || 'smtp.office365.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const domain = process.env.SMTP_DOMAIN || 'doganconsult.com';

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    },
    name: domain,
  } as nodemailer.TransportOptions);

  return _transporter;
}

// ═══════════════════════════════════════════════════════════════════
// EMAIL TEMPLATE RENDERER
// ═══════════════════════════════════════════════════════════════════

export function computeRetryDelay(attempt: number): number {
  return Math.pow(4, attempt) * 1000;
}

export function renderEmailTemplate(
  _template: EmailTemplateName,
  data: EmailTemplateData,
): string {
  const isArabic = data.language === 'ar';
  const dir = isArabic ? 'rtl' : 'ltr';
  const align = isArabic ? 'right' : 'left';

  const greeting = data.recipientName
    ? (isArabic ? `مرحباً ${data.recipientName}،` : `Hello ${data.recipientName},`)
    : (isArabic ? 'مرحباً،' : 'Hello,');

  const ctaBlock = data.ctaLabel && data.ctaUrl
    ? `<tr><td style="padding:24px 0;text-align:center">
        <a href="${data.ctaUrl}" style="background:${BRAND_COLOR};color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">${data.ctaLabel}</a>
       </td></tr>`
    : '';

  const footerText = data.footerNote || (isArabic
    ? 'هذا بريد إلكتروني تلقائي من منصة شاهين للحوكمة والمخاطر والامتثال.'
    : 'This is an automated email from the Shahin-Ai Platform.');

  const platformUrl = process.env.PLATFORM_URL || 'https://dogan-ai.com';
  const productUrl = APP_URL;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${data.title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px">
<tr><td align="center">

<!-- Header -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07)">
  <tr><td style="background:linear-gradient(135deg,${BRAND_COLOR} 0%,${BRAND_COLOR}dd 100%);padding:28px 36px;text-align:${align}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="text-align:${align};vertical-align:middle">
        <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px">${BRAND_NAME}</span>
        <br><span style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase">${isArabic ? 'الحوكمة والمخاطر والامتثال' : 'GOVERNANCE \u00B7 RISK \u00B7 COMPLIANCE'}</span>
      </td>
      <td style="text-align:${isArabic ? 'left' : 'right'};vertical-align:middle">
        <span style="color:rgba(255,255,255,0.6);font-size:11px">${isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'AI-Powered GRC'}</span>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px;text-align:${align};direction:${dir}">
    <p style="color:#6b7280;font-size:14px;margin:0 0 6px;font-weight:500">${greeting}</p>
    <h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 20px;line-height:1.3">${data.title}</h2>
    <div style="color:#374151;font-size:15px;line-height:1.7">${data.body}</div>
  </td></tr>

  <!-- CTA Button -->
  ${ctaBlock}

  <!-- Footer -->
  <tr><td style="padding:20px 36px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="text-align:${align}">
      <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5">${footerText}</p>
    </td></tr>
    <tr><td style="padding-top:12px;text-align:${align}">
      <a href="${productUrl}" style="color:${BRAND_COLOR};text-decoration:none;font-size:12px;font-weight:600">${isArabic ? 'shahin-ai.com' : 'shahin-ai.com'}</a>
      <span style="color:#d1d5db;margin:0 8px">|</span>
      <a href="${platformUrl}" style="color:#6b7280;text-decoration:none;font-size:12px">${isArabic ? 'dogan-ai.com' : 'dogan-ai.com'}</a>
    </td></tr>
    <tr><td style="padding-top:8px;text-align:${align}">
      <p style="color:#d1d5db;font-size:11px;margin:0">\u00A9 ${year} Dogan Consult. ${isArabic ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
    </td></tr>
    </table>
  </td></tr>
</table>

</td></tr>
</table>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════════
// UNIFIED EMAIL DELIVERY — Graph API primary, SMTP fallback
// ═══════════════════════════════════════════════════════════════════

export async function deliverViaEmail(
  to: string,
  subject: string,
  body: string,
  template?: EmailTemplateName,
  templateData?: EmailTemplateData,
  fromType?: EmailFromType,
): Promise<EmailDeliveryResult> {
  const html = template && templateData
    ? renderEmailTemplate(template, templateData)
    : `<div style="font-family:sans-serif;padding:20px">${body}</div>`;

  // Try Graph API first (if Azure credentials configured — supports both client_credentials and ROPC)
  const graphAvailable = AZURE_TENANT_ID && AZURE_CLIENT_ID && (AZURE_CLIENT_SECRET || process.env.SMTP_PASS);
  if (graphAvailable) {
    const sender = resolveGraphSender(fromType);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = await sendViaGraph(to, subject, html, sender);
      if (result.success) {
        logger.info('[email] Delivered via Graph API', { to, subject, sender, attempt });
        return { success: true, attempts: attempt + 1, provider: 'graph', messageId: result.messageId };
      }
      logger.warn('[email] Graph API attempt failed', { to, attempt, error: result.error });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, computeRetryDelay(attempt)));
      }
    }
    logger.warn('[email] Graph API exhausted, falling back to SMTP', { to, subject });
  }

  // Fallback to SMTP
  const from = resolveFromAddress(fromType);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({ from, to, subject, html, text: body });
      logger.info('[email] Delivered via SMTP', { to, subject, messageId: info.messageId, attempt });
      return { success: true, attempts: attempt + 1, provider: 'smtp', messageId: info.messageId };
    } catch (err: any) {
      logger.warn('[email] SMTP attempt failed', { to, attempt, error: err?.message });
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, computeRetryDelay(attempt)));
      }
    }
  }

  logger.error('[email] All delivery methods exhausted', { to, subject });
  return { success: false, attempts: MAX_RETRIES * 2, provider: 'smtp', error: 'All delivery methods failed (Graph API + SMTP)' };
}

// ═══════════════════════════════════════════════════════════════════
// MJML DELIVERY — Enterprise-grade bilingual templates (Phase 8.2)
// ═══════════════════════════════════════════════════════════════════

export async function deliverViaMjml(
  to: string,
  templateId: MjmlTemplateId,
  lang: MjmlLang,
  vars: Record<string, unknown>,
  fromType: EmailFromType = 'platform',
): Promise<EmailDeliveryResult> {
  // Lazy-require keeps the `mjml` dep out of the cold-start path for
  // services that never render email. Using require() here avoids the
  // NodeNext ESM `.js` suffix requirement for dynamic `import(...)`.
   
  const { renderEmail } = require('./mjml-renderer.service') as typeof import('./mjml-renderer.service');
  const enriched = {
    ...vars,
    brandName: (vars.brandName as string | undefined) ?? BRAND_NAME,
  };
  const { subject, html } = renderEmail(templateId, lang, enriched);

  const graphAvailable = AZURE_TENANT_ID && AZURE_CLIENT_ID && (AZURE_CLIENT_SECRET || process.env.SMTP_PASS);
  if (graphAvailable) {
    const sender = resolveGraphSender(fromType);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = await sendViaGraph(to, subject, html, sender);
      if (result.success) {
        logger.info('[email] Delivered via Graph API (MJML)', { to, subject, templateId, lang, sender, attempt });
        return { success: true, attempts: attempt + 1, provider: 'graph', messageId: result.messageId };
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, computeRetryDelay(attempt)));
      }
    }
    logger.warn('[email] Graph API exhausted for MJML delivery, falling back to SMTP', { to, templateId });
  }

  const from = resolveFromAddress(fromType);
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const transporter = getTransporter();
      const info = await transporter.sendMail({ from, to, subject, html });
      logger.info('[email] Delivered via SMTP (MJML)', { to, subject, templateId, lang, attempt });
      return { success: true, attempts: attempt + 1, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      if (attempt === MAX_RETRIES - 1) {
        logger.error('[email] SMTP MJML delivery failed after retries', {
          to, templateId, err: err instanceof Error ? err.message : String(err),
        });
        return {
          success: false,
          attempts: attempt + 1,
          provider: 'smtp',
          error: err instanceof Error ? err.message : String(err),
        };
      }
      await new Promise((r) => setTimeout(r, computeRetryDelay(attempt)));
    }
  }
  return { success: false, attempts: MAX_RETRIES, provider: 'smtp', error: 'unreachable' };
}

export async function deliverViaWebhook(
  url: string,
  payload: unknown,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      logger.warn('[webhook] Delivery failed', { url, status: res.status });
    }
  } catch (err: any) {
    logger.error('[webhook] Delivery error', { url, error: err?.message });
  }
}

// ═══════════════════════════════════════════════════════════════════
// PAGERDUTY DELIVERY — Events API v2
// ═══════════════════════════════════════════════════════════════════

const PAGERDUTY_ROUTING_KEY = process.env.PAGERDUTY_ROUTING_KEY || '';

export async function deliverViaPagerDuty(
  summary: string,
  severity: 'critical' | 'error' | 'warning' | 'info',
  source: string,
  deduplicationKey?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!PAGERDUTY_ROUTING_KEY) {
    logger.warn('[pagerduty] PAGERDUTY_ROUTING_KEY not configured, skipping');
    return { success: false, error: 'PAGERDUTY_ROUTING_KEY not configured' };
  }
  try {
    const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        dedup_key: deduplicationKey,
        payload: { summary, severity, source, component: 'dos-platform', group: 'grc' },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('[pagerduty] Trigger failed', { status: res.status, body: body.slice(0, 200) });
      return { success: false, error: `PagerDuty ${res.status}` };
    }
    logger.info('[pagerduty] Incident triggered', { summary, severity, source });
    return { success: true };
  } catch (err: any) {
    logger.error('[pagerduty] Delivery error', { error: err?.message });
    return { success: false, error: err?.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// OPSGENIE DELIVERY — Alerts API v2
// ═══════════════════════════════════════════════════════════════════

const OPSGENIE_API_KEY = process.env.OPSGENIE_API_KEY || '';
const OPSGENIE_API_URL = process.env.OPSGENIE_API_URL || 'https://api.opsgenie.com';

export async function deliverViaOpsGenie(
  message: string,
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5',
  details: Record<string, string>,
  alias?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!OPSGENIE_API_KEY) {
    logger.warn('[opsgenie] OPSGENIE_API_KEY not configured, skipping');
    return { success: false, error: 'OPSGENIE_API_KEY not configured' };
  }
  try {
    const res = await fetch(`${OPSGENIE_API_URL}/v2/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `GenieKey ${OPSGENIE_API_KEY}`,
      },
      body: JSON.stringify({
        message,
        priority,
        alias,
        source: 'dos-platform',
        tags: ['dos', 'grc'],
        details,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('[opsgenie] Alert creation failed', { status: res.status, body: body.slice(0, 200) });
      return { success: false, error: `OpsGenie ${res.status}` };
    }
    logger.info('[opsgenie] Alert created', { message, priority });
    return { success: true };
  } catch (err: any) {
    logger.error('[opsgenie] Delivery error', { error: err?.message });
    return { success: false, error: err?.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// ALERTMANAGER WEBHOOK HANDLER — Processes Prometheus AlertManager payloads
// ═══════════════════════════════════════════════════════════════════

export interface AlertManagerPayload {
  status: 'firing' | 'resolved';
  alerts: Array<{
    status: 'firing' | 'resolved';
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt: string;
    generatorURL: string;
    fingerprint: string;
  }>;
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
}

export async function handleAlertManagerWebhook(payload: AlertManagerPayload): Promise<void> {
  for (const alert of payload.alerts) {
    const severity = alert.labels.severity || 'warning';
    const alertName = alert.labels.alertname || 'UnknownAlert';
    const summary = alert.annotations.summary || `${alertName} is ${alert.status}`;
    const description = alert.annotations.description || '';

    logger.info('[alertmanager] Processing alert', {
      alertName,
      severity,
      status: alert.status,
      fingerprint: alert.fingerprint,
    });

    // Route critical alerts to PagerDuty
    if (severity === 'critical' && alert.status === 'firing') {
      await deliverViaPagerDuty(
        summary,
        'critical',
        alert.labels.job || 'dos-platform',
        alert.fingerprint,
      );
    }

    // Route warnings to OpsGenie
    if (severity === 'warning' && alert.status === 'firing') {
      await deliverViaOpsGenie(
        summary,
        'P3',
        { alertname: alertName, description, job: alert.labels.job || '', severity },
        alert.fingerprint,
      );
    }
  }
}

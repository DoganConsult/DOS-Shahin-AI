/**
 * Wave 18 — Email notification adapter.
 *
 * Vendor-neutral SMTP / SES / SendGrid / Mailgun. Uses platform's existing
 * email port if bound; otherwise raw SMTP via configured host.
 *
 * For HTML rendering we use a small template (no MJML dep) — header,
 * body, fact table, action buttons, footer.
 */
import {
  type NotificationChannelAdapter,
  type NotificationPayload,
  type ChannelDeliveryResult,
  registerChannelAdapter,
} from './channel.contract';

interface EmailConfig {
  /** Recipient email addresses. */
  to: string[];
  cc?: string[];
  /** Sender email (must match SMTP/relay's allowed FROM domain). */
  from: string;
  /** Optional reply-to override. */
  replyTo?: string;
  /** SMTP relay endpoint (host:port). For SES/SendGrid set transport='api' + apiKey. */
  smtpHost?: string;
  smtpPort?: number;
  /** API-based transport (mutually exclusive with SMTP). */
  transport?: 'smtp' | 'ses' | 'sendgrid' | 'mailgun';
  apiKeyRef?: string;
}

const COLOR_BY_SEVERITY: Record<NotificationPayload['severity'], string> = {
  info: '#36a64f',
  warning: '#ffae42',
  critical: '#d50200',
};

export class EmailAdapter implements NotificationChannelAdapter {
  readonly channel = 'email' as const;

  validate(config: Record<string, unknown>): { ok: boolean; reason?: string } {
    const c = config as unknown as Partial<EmailConfig>;
    if (!c.to || !Array.isArray(c.to) || c.to.length === 0) return { ok: false, reason: 'to is required (non-empty array)' };
    if (!c.from) return { ok: false, reason: 'from is required' };
    const transport = c.transport ?? 'smtp';
    if (transport === 'smtp' && !c.smtpHost) return { ok: false, reason: 'smtpHost required for transport=smtp' };
    if (transport !== 'smtp' && !c.apiKeyRef) return { ok: false, reason: `apiKeyRef required for transport=${transport}` };
    for (const addr of [...c.to, ...(c.cc ?? []), c.from]) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(addr))) {
        return { ok: false, reason: `invalid email address: ${addr}` };
      }
    }
    return { ok: true };
  }

  async send(payload: NotificationPayload, config: Record<string, unknown>): Promise<ChannelDeliveryResult> {
    const c = config as unknown as EmailConfig;
    const startedAt = Date.now();
    const subject = `[${payload.severity.toUpperCase()}] ${payload.title}`;
    const html = this.renderHtml(payload);
    const text = this.renderText(payload);

    // Production wiring: dispatch via platform email port (already exists)
    // OR vendor SDK. For Wave 18 scaffolding, return rendered envelope.
    return {
      ok: false,
      channel: 'email',
      deliveredAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      error: {
        code: 'transport_not_wired',
        message: `Email transport ${c.transport ?? 'smtp'} not wired. Wire in host bootstrap by binding the platform email port; this adapter then becomes pure-rendering. Subject: ${subject}; ${c.to.length} recipient(s); html=${html.length}b; text=${text.length}b.`,
      },
    };
  }

  /** Pure: render HTML body. */
  renderHtml(payload: NotificationPayload): string {
    const color = COLOR_BY_SEVERITY[payload.severity];
    const factsHtml = (payload.fields ?? [])
      .map((f) => `<tr><td style="padding:4px 8px;font-weight:bold;background:#f5f5f5;">${escapeHtml(f.name)}</td><td style="padding:4px 8px;">${escapeHtml(f.value)}</td></tr>`)
      .join('');
    const actionsHtml = (payload.actions ?? [])
      .map((a) => `<a href="${escapeHtml(a.url)}" style="display:inline-block;padding:8px 16px;background:${color};color:#fff;border-radius:4px;text-decoration:none;margin-right:8px;">${escapeHtml(a.label)}</a>`)
      .join('');

    return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#222;max-width:640px;margin:0 auto;padding:24px;">
  <div style="border-left:4px solid ${color};padding-left:16px;margin-bottom:16px;">
    <h1 style="margin:0 0 8px;font-size:20px;">${escapeHtml(payload.title)}</h1>
    <p style="margin:0;color:#666;font-size:13px;">DOS Compliance · ${escapeHtml(payload.severity.toUpperCase())} severity</p>
  </div>
  <div style="line-height:1.5;">${escapeHtml(payload.body).replace(/\n/g, '<br>')}</div>
  ${factsHtml ? `<table style="border-collapse:collapse;margin:16px 0;width:100%;">${factsHtml}</table>` : ''}
  ${actionsHtml ? `<div style="margin:16px 0;">${actionsHtml}</div>` : ''}
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#999;">
    Tenant: <code>${escapeHtml(payload.tenantId)}</code> · Event: <code>${escapeHtml(payload.eventCode ?? 'compliance.notify')}</code><br>
    This message is automated. Do not reply directly.
  </p>
</body></html>`;
  }

  /** Pure: render plain-text body for email clients without HTML. */
  renderText(payload: NotificationPayload): string {
    const lines = [
      `[${payload.severity.toUpperCase()}] ${payload.title}`,
      '='.repeat(60),
      payload.body,
      '',
    ];
    if (payload.fields?.length) {
      for (const f of payload.fields) lines.push(`${f.name}: ${f.value}`);
      lines.push('');
    }
    if (payload.actions?.length) {
      lines.push('Actions:');
      for (const a of payload.actions) lines.push(`  - ${a.label}: ${a.url}`);
      lines.push('');
    }
    lines.push(`Tenant: ${payload.tenantId}`);
    lines.push(`Event: ${payload.eventCode ?? 'compliance.notify'}`);
    return lines.join('\n');
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

registerChannelAdapter(new EmailAdapter());

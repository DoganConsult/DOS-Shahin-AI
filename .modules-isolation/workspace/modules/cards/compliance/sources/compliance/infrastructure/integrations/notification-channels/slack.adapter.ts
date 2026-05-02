/**
 * Wave 18 — Slack notification adapter.
 *
 * Uses Slack Incoming Webhooks (per-tenant, per-channel webhook URL).
 * For richer per-user mentions and thread replies, upgrade to Slack
 * App + bot token (out of Wave 18 scope; Wave 105 ecosystem app).
 *
 * Webhook URL is stored in dispatcher config (encrypted via Wave 11 CMEK).
 */
import {
  type NotificationChannelAdapter,
  type NotificationPayload,
  type ChannelDeliveryResult,
  registerChannelAdapter,
} from './channel.contract';

interface SlackConfig {
  webhookUrl: string;
  defaultChannel?: string;
  username?: string;
  iconEmoji?: string;
}

const COLOR_BY_SEVERITY: Record<NotificationPayload['severity'], string> = {
  info: '#36a64f',     // green
  warning: '#ffae42',  // amber
  critical: '#d50200', // red
};

export class SlackAdapter implements NotificationChannelAdapter {
  readonly channel = 'slack' as const;

  validate(config: Record<string, unknown>): { ok: boolean; reason?: string } {
    const c = config as unknown as Partial<SlackConfig>;
    if (!c.webhookUrl) return { ok: false, reason: 'webhookUrl is required' };
    if (!/^https:\/\/hooks\.slack\.com\//.test(c.webhookUrl)) {
      return { ok: false, reason: 'webhookUrl must be a Slack incoming webhook URL' };
    }
    return { ok: true };
  }

  async send(payload: NotificationPayload, config: Record<string, unknown>): Promise<ChannelDeliveryResult> {
    const c = config as unknown as SlackConfig;
    const startedAt = Date.now();
    const body = this.renderSlackBlocks(payload, c);

    try {
      const res = await fetch(c.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const durationMs = Date.now() - startedAt;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return {
          ok: false,
          channel: 'slack',
          deliveredAt: new Date().toISOString(),
          durationMs,
          error: { code: `http_${res.status}`, message: text.slice(0, 500) },
        };
      }
      return {
        ok: true,
        channel: 'slack',
        deliveredAt: new Date().toISOString(),
        durationMs,
      };
    } catch (err) {
      return {
        ok: false,
        channel: 'slack',
        deliveredAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        error: { code: 'network', message: (err as Error).message },
      };
    }
  }

  /** Pure: render the Slack payload. Exposed for testing without HTTP. */
  renderSlackBlocks(payload: NotificationPayload, config: SlackConfig): Record<string, unknown> {
    const blocks: Array<Record<string, unknown>> = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${this.severityIcon(payload.severity)} ${payload.title}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: payload.body },
      },
    ];

    if (payload.fields && payload.fields.length > 0) {
      blocks.push({
        type: 'section',
        fields: payload.fields.map((f) => ({ type: 'mrkdwn', text: `*${f.name}*\n${f.value}` })),
      });
    }

    if (payload.actions && payload.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: payload.actions.map((a) => ({
          type: 'button',
          text: { type: 'plain_text', text: a.label },
          url: a.url,
        })),
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `Tenant: \`${payload.tenantId}\` · Event: \`${payload.eventCode ?? 'compliance.notify'}\` · Idempotency: \`${payload.idempotencyKey.slice(0, 16)}…\`` },
      ],
    });

    return {
      channel: config.defaultChannel,
      username: config.username ?? 'DOS Compliance',
      icon_emoji: config.iconEmoji ?? ':shield:',
      attachments: [{ color: COLOR_BY_SEVERITY[payload.severity], blocks }],
    };
  }

  private severityIcon(s: NotificationPayload['severity']): string {
    return s === 'critical' ? '🔴' : s === 'warning' ? '🟠' : '🟢';
  }
}

registerChannelAdapter(new SlackAdapter());

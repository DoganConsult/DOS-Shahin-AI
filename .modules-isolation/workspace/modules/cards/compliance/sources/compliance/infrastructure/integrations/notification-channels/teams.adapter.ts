/**
 * Wave 18 — Microsoft Teams notification adapter.
 *
 * Uses Teams Incoming Webhooks with adaptive cards (Schema 1.5).
 * For richer messaging via Bot Framework, see Wave 105 ecosystem app.
 */
import {
  type NotificationChannelAdapter,
  type NotificationPayload,
  type ChannelDeliveryResult,
  registerChannelAdapter,
} from './channel.contract';

interface TeamsConfig {
  webhookUrl: string;
}

const COLOR_BY_SEVERITY: Record<NotificationPayload['severity'], string> = {
  info: 'Good',
  warning: 'Warning',
  critical: 'Attention',
};

export class TeamsAdapter implements NotificationChannelAdapter {
  readonly channel = 'teams' as const;

  validate(config: Record<string, unknown>): { ok: boolean; reason?: string } {
    const c = config as unknown as Partial<TeamsConfig>;
    if (!c.webhookUrl) return { ok: false, reason: 'webhookUrl is required' };
    if (!/^https:\/\/[a-z0-9-]+\.webhook\.office\.com\//i.test(c.webhookUrl) &&
        !/^https:\/\/.*\.logic\.azure\.com:443\//i.test(c.webhookUrl)) {
      return { ok: false, reason: 'webhookUrl must be a Teams incoming-webhook or workflow URL' };
    }
    return { ok: true };
  }

  async send(payload: NotificationPayload, config: Record<string, unknown>): Promise<ChannelDeliveryResult> {
    const c = config as unknown as TeamsConfig;
    const startedAt = Date.now();
    const body = this.renderAdaptiveCard(payload);

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
          channel: 'teams',
          deliveredAt: new Date().toISOString(),
          durationMs,
          error: { code: `http_${res.status}`, message: text.slice(0, 500) },
        };
      }
      return { ok: true, channel: 'teams', deliveredAt: new Date().toISOString(), durationMs };
    } catch (err) {
      return {
        ok: false,
        channel: 'teams',
        deliveredAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        error: { code: 'network', message: (err as Error).message },
      };
    }
  }

  renderAdaptiveCard(payload: NotificationPayload): Record<string, unknown> {
    const facts = (payload.fields ?? []).map((f) => ({ title: f.name, value: f.value }));
    facts.push({ title: 'Tenant', value: payload.tenantId });
    if (payload.eventCode) facts.push({ title: 'Event', value: payload.eventCode });

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            version: '1.5',
            body: [
              {
                type: 'TextBlock',
                text: payload.title,
                size: 'Large',
                weight: 'Bolder',
                color: COLOR_BY_SEVERITY[payload.severity],
                wrap: true,
              },
              {
                type: 'TextBlock',
                text: payload.body,
                wrap: true,
              },
              ...(facts.length
                ? [{ type: 'FactSet', facts }]
                : []),
            ],
            actions: (payload.actions ?? []).map((a) => ({
              type: 'Action.OpenUrl',
              title: a.label,
              url: a.url,
            })),
          },
        },
      ],
    };
  }
}

registerChannelAdapter(new TeamsAdapter());

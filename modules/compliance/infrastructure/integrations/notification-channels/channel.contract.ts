/**
 * Wave 18 — Notification channel adapter contract.
 *
 * The notification dispatcher (createNotificationDispatcherRouter, already
 * in dist) routes outbound messages to channel adapters via this interface.
 * Each adapter handles its vendor-specific delivery, retry, and rate-limit
 * semantics; the dispatcher handles queueing, persistence, DLQ, and audit.
 */
export type NotificationChannel = 'slack' | 'teams' | 'email' | 'webhook' | 'sms';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationPayload {
  /** Tenant the notification belongs to (for region routing + audit). */
  tenantId: string;
  /** Channel-agnostic title (rendered as Slack header / Teams card title / email subject). */
  title: string;
  /** Channel-agnostic body. Markdown-style emphasis allowed. */
  body: string;
  severity: NotificationSeverity;
  /** Optional structured fields (rendered as Slack attachments / Teams facts / email table). */
  fields?: Array<{ name: string; value: string }>;
  /** Action links rendered as buttons in chat channels. */
  actions?: Array<{ label: string; url: string }>;
  /** Originating compliance event (e.g., 'gap_detected', 'attestation_due'). */
  eventCode?: string;
  /** Idempotency key to dedupe retries (hash of (tenantId + eventCode + correlationId)). */
  idempotencyKey: string;
}

export interface ChannelDeliveryResult {
  ok: boolean;
  channel: NotificationChannel;
  vendorMessageId?: string;
  deliveredAt: string;
  durationMs: number;
  error?: { code: string; message: string };
}

export interface NotificationChannelAdapter {
  readonly channel: NotificationChannel;
  /** Validate adapter config (URL, token, region). Cheap; no side effects. */
  validate(config: Record<string, unknown>): { ok: boolean; reason?: string };
  /** Send the notification. Throws are caught by the dispatcher and DLQ'd. */
  send(payload: NotificationPayload, config: Record<string, unknown>): Promise<ChannelDeliveryResult>;
}

const REGISTRY = new Map<NotificationChannel, NotificationChannelAdapter>();

export function registerChannelAdapter(adapter: NotificationChannelAdapter): void {
  REGISTRY.set(adapter.channel, adapter);
}

export function getChannelAdapter(channel: NotificationChannel): NotificationChannelAdapter {
  const a = REGISTRY.get(channel);
  if (!a) throw new Error(`no adapter registered for channel ${channel}`);
  return a;
}

export function listRegisteredChannels(): NotificationChannel[] {
  return [...REGISTRY.keys()];
}

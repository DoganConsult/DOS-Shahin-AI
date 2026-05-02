/**
 * Notification-Dispatcher (W69) — durable per-tenant notification queue over
 * `<tenant_schema>.notifications`. Producers `enqueue()` a queued row, the
 * `dispatch()` drainer picks rows in created_at order, invokes an injected
 * channel handler, and stamps each row `sent` (with sent_at) or `failed`
 * (attempts incremented + last_error captured).
 *
 * Channel enum: email | in_app | sms | webhook
 * Status enum:  queued | sent | failed | cancelled
 *
 * Tenant-safe (regex-guarded schema), single-worker per tenant
 * (no SKIP LOCKED — same model as W60 outbox dispatcher).
 */
import type { DbClient } from '../../db/runner';

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'webhook';
const CHANNELS: ReadonlyArray<NotificationChannel> = [
  'email', 'in_app', 'sms', 'webhook',
];

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'cancelled';
const STATUSES: ReadonlyArray<NotificationStatus> = [
  'queued', 'sent', 'failed', 'cancelled',
];

export interface NotificationRow {
  notificationId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  createdBy: string;
  sentAt: string | null;
}

export interface EnqueueInput {
  tenantSchema: string;
  actorId: string;
  recipientUserId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface ListNotificationsInput {
  tenantSchema: string;
  status?: NotificationStatus;
  channel?: NotificationChannel;
  recipientUserId?: string;
  limit?: number;
  offset?: number;
}

export interface DispatchInput {
  tenantSchema: string;
  batch?: number;
  handler?: (row: NotificationRow) => Promise<void> | void;
}

export interface DispatchResult {
  scanned: number;
  sent: number;
  failed: number;
  rows: NotificationRow[];
}

export interface CancelInput {
  tenantSchema: string;
  actorId: string;
  notificationId: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `notification_id, recipient_user_id, channel, subject, body,
              payload, status, attempts, last_error,
              created_at, created_by, sent_at`;

const mapRow = (x: {
  notification_id: string; recipient_user_id: string;
  channel: string; subject: string; body: string;
  payload: Record<string, unknown> | null; status: string;
  attempts: string | number; last_error: string | null;
  created_at: string; created_by: string; sent_at: string | null;
}): NotificationRow => ({
  notificationId: x.notification_id, recipientUserId: x.recipient_user_id,
  channel: x.channel as NotificationChannel,
  subject: x.subject, body: x.body, payload: x.payload ?? {},
  status: x.status as NotificationStatus,
  attempts: Number(x.attempts), lastError: x.last_error,
  createdAt: x.created_at, createdBy: x.created_by, sentAt: x.sent_at,
});

export async function enqueueNotification(
  client: DbClient,
  input: EnqueueInput,
): Promise<NotificationRow> {
  assertSchema(input.tenantSchema);
  if (!input.recipientUserId || !input.subject) {
    throw Object.assign(
      new Error('recipientUserId and subject required'),
      { code: 'bad_input' },
    );
  }
  if (!CHANNELS.includes(input.channel)) {
    throw Object.assign(
      new Error(`bad channel: ${input.channel}`),
      { code: 'bad_channel' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".notifications
       (recipient_user_id, channel, subject, body, payload, status,
        attempts, last_error, created_by)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'queued', 0, NULL, $6)
     RETURNING ${COLS}`,
    [
      input.recipientUserId, input.channel, input.subject,
      input.body ?? '', JSON.stringify(input.payload ?? {}),
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function listNotifications(
  client: DbClient,
  input: ListNotificationsInput,
): Promise<{ rows: NotificationRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.channel) { params.push(input.channel); where += ` AND channel = $${params.length}`; }
  if (input.recipientUserId) {
    params.push(input.recipientUserId);
    where += ` AND recipient_user_id = $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".notifications
      WHERE ${where} ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".notifications WHERE ${where}`,
    params,
  );
  return {
    rows: rows.rows.map(mapRow as never),
    total: Number(totalR.rows[0]?.n ?? 0),
  };
}

export async function getNotification(
  client: DbClient,
  input: { tenantSchema: string; notificationId: string },
): Promise<NotificationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".notifications
      WHERE notification_id = $1`,
    [input.notificationId],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function markSent(
  client: DbClient,
  input: { tenantSchema: string; notificationId: string },
): Promise<NotificationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".notifications
        SET status = 'sent', sent_at = NOW(),
            attempts = attempts + 1, last_error = NULL
      WHERE notification_id = $1
      RETURNING ${COLS}`,
    [input.notificationId],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function markFailed(
  client: DbClient,
  input: { tenantSchema: string; notificationId: string; error: string },
): Promise<NotificationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".notifications
        SET status = 'failed', attempts = attempts + 1, last_error = $2
      WHERE notification_id = $1
      RETURNING ${COLS}`,
    [input.notificationId, input.error],
  );
  return r.rowCount === 0 ? null : mapRow(r.rows[0] as never);
}

export async function cancelNotification(
  client: DbClient,
  input: CancelInput,
): Promise<NotificationRow> {
  assertSchema(input.tenantSchema);
  const cur = await getNotification(client, {
    tenantSchema: input.tenantSchema, notificationId: input.notificationId,
  });
  if (!cur) {
    throw Object.assign(
      new Error(`notification ${input.notificationId} not found`),
      { code: 'not_found' },
    );
  }
  if (cur.status !== 'queued' && cur.status !== 'failed') {
    throw Object.assign(
      new Error(`notification ${input.notificationId} is ${cur.status}, cannot cancel`),
      { code: 'bad_state' },
    );
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".notifications
        SET status = 'cancelled'
      WHERE notification_id = $1
      RETURNING ${COLS}`,
    [input.notificationId],
  );
  return mapRow(r.rows[0] as never);
}

export async function dispatchQueued(
  client: DbClient,
  input: DispatchInput,
): Promise<DispatchResult> {
  assertSchema(input.tenantSchema);
  const batch = Math.min(Math.max(input.batch ?? 50, 1), 500);
  const pendings = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".notifications
      WHERE status = 'queued'
      ORDER BY created_at ASC LIMIT ${batch}`,
    [],
  );
  let sent = 0; let failed = 0;
  const out: NotificationRow[] = [];
  for (const raw of pendings.rows) {
    const row = mapRow(raw as never);
    try {
      if (input.handler) await input.handler(row);
      const updated = await markSent(client, {
        tenantSchema: input.tenantSchema, notificationId: row.notificationId,
      });
      if (updated) { out.push(updated); sent++; }
    } catch (e) {
      const updated = await markFailed(client, {
        tenantSchema: input.tenantSchema,
        notificationId: row.notificationId,
        error: String((e as Error).message ?? e),
      });
      if (updated) { out.push(updated); failed++; }
    }
  }
  if (!STATUSES.includes('queued')) {
    throw Object.assign(new Error('bad status'), { code: 'bad_status' });
  }
  return { scanned: pendings.rows.length, sent, failed, rows: out };
}

export const NOTIFICATION_CHANNELS = CHANNELS;
export const NOTIFICATION_STATUSES = STATUSES;

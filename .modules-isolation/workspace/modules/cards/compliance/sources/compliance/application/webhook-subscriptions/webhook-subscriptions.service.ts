/**
 * Webhook-Subscriptions (W75) — per-tenant webhook subscription registry over
 * `<tenant_schema>.webhook_subscriptions` plus delivery journal
 * `<tenant_schema>.webhook_deliveries`.
 *
 * Subscription status enum: active | paused | revoked
 * Delivery status enum: succeeded | failed
 *
 * `dispatchEvent` resolves all `active` subscriptions matching either the
 * exact event_type or the `*` wildcard, invokes a host-supplied transport
 * keyed by subscription id (or a single fallback), records each delivery
 * with response_status/duration_ms/error.
 *
 * Tenant-safe (regex-guarded schema). Pure deterministic logic.
 */
import type { DbClient } from '../../db/runner';

export type SubscriptionStatus = 'active' | 'paused' | 'revoked';
const SUB_STATUSES: ReadonlyArray<SubscriptionStatus> = ['active', 'paused', 'revoked'];

export type DeliveryStatus = 'succeeded' | 'failed';
const DEL_STATUSES: ReadonlyArray<DeliveryStatus> = ['succeeded', 'failed'];

export interface WebhookSubscriptionRow {
  subscriptionId: string;
  targetUrl: string;
  eventTypes: string[];
  secret: string | null;
  status: SubscriptionStatus;
  createdAt: string;
  createdBy: string;
}

export interface WebhookDeliveryRow {
  deliveryId: string;
  subscriptionId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: DeliveryStatus;
  responseStatus: number | null;
  durationMs: number;
  error: string | null;
  attemptedAt: string;
}

export interface CreateSubscriptionInput {
  tenantSchema: string;
  actorId: string;
  targetUrl: string;
  eventTypes: string[];
  secret?: string;
}

export interface ChangeStatusInput {
  tenantSchema: string;
  actorId: string;
  subscriptionId: string;
  status: SubscriptionStatus;
}

export interface ListSubscriptionsInput {
  tenantSchema: string;
  status?: SubscriptionStatus;
  eventType?: string;
  limit?: number;
  offset?: number;
}

export interface DispatchEventInput {
  tenantSchema: string;
  actorId: string;
  eventType: string;
  payload: Record<string, unknown>;
  /** Per-subscription transport. Throw → status=failed; return number → response_status. */
  transport?: (sub: WebhookSubscriptionRow, payload: Record<string, unknown>) =>
    Promise<number | void> | number | void;
}

export interface DispatchEventResult {
  matched: number;
  succeeded: number;
  failed: number;
  rows: WebhookDeliveryRow[];
}

export interface ListDeliveriesInput {
  tenantSchema: string;
  subscriptionId?: string;
  status?: DeliveryStatus;
  eventType?: string;
  limit?: number;
  offset?: number;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const URL_RE = /^https?:\/\//i;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const SUB_COLS = `subscription_id, target_url, event_types, secret, status,
                  created_at, created_by`;
const DEL_COLS = `delivery_id, subscription_id, event_type, payload, status,
                  response_status, duration_ms, error, attempted_at`;

const mapSub = (x: {
  subscription_id: string; target_url: string;
  event_types: string[] | null; secret: string | null; status: string;
  created_at: string; created_by: string;
}): WebhookSubscriptionRow => ({
  subscriptionId: x.subscription_id, targetUrl: x.target_url,
  eventTypes: x.event_types ?? [], secret: x.secret,
  status: x.status as SubscriptionStatus,
  createdAt: x.created_at, createdBy: x.created_by,
});

const mapDel = (x: {
  delivery_id: string; subscription_id: string; event_type: string;
  payload: Record<string, unknown> | null; status: string;
  response_status: string | number | null;
  duration_ms: string | number; error: string | null; attempted_at: string;
}): WebhookDeliveryRow => ({
  deliveryId: x.delivery_id, subscriptionId: x.subscription_id,
  eventType: x.event_type, payload: x.payload ?? {},
  status: x.status as DeliveryStatus,
  responseStatus: x.response_status === null ? null : Number(x.response_status),
  durationMs: Number(x.duration_ms), error: x.error,
  attemptedAt: x.attempted_at,
});

export async function createSubscription(
  client: DbClient, input: CreateSubscriptionInput,
): Promise<WebhookSubscriptionRow> {
  assertSchema(input.tenantSchema);
  if (!input.targetUrl || !URL_RE.test(input.targetUrl)) {
    throw Object.assign(
      new Error('targetUrl must be http(s) URL'),
      { code: 'bad_input' },
    );
  }
  if (!Array.isArray(input.eventTypes) || input.eventTypes.length === 0) {
    throw Object.assign(
      new Error('eventTypes[] must be non-empty'),
      { code: 'bad_input' },
    );
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".webhook_subscriptions
       (target_url, event_types, secret, status, created_by)
     VALUES ($1, $2::jsonb, $3, 'active', $4)
     RETURNING ${SUB_COLS}`,
    [input.targetUrl, JSON.stringify(input.eventTypes),
     input.secret ?? null, input.actorId],
  );
  return mapSub(r.rows[0] as never);
}

export async function getSubscription(
  client: DbClient,
  input: { tenantSchema: string; subscriptionId: string },
): Promise<WebhookSubscriptionRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${SUB_COLS} FROM "${input.tenantSchema}".webhook_subscriptions
      WHERE subscription_id = $1`,
    [input.subscriptionId],
  );
  return r.rowCount === 0 ? null : mapSub(r.rows[0] as never);
}

export async function listSubscriptions(
  client: DbClient, input: ListSubscriptionsInput,
): Promise<{ rows: WebhookSubscriptionRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.eventType) {
    params.push(JSON.stringify([input.eventType]));
    where += ` AND event_types @> $${params.length}::jsonb`;
  }
  const r = await client.query(
    `SELECT ${SUB_COLS} FROM "${input.tenantSchema}".webhook_subscriptions
      WHERE ${where} ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".webhook_subscriptions WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapSub as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function changeStatus(
  client: DbClient, input: ChangeStatusInput,
): Promise<WebhookSubscriptionRow> {
  assertSchema(input.tenantSchema);
  if (!SUB_STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status ${input.status}`), { code: 'bad_status' });
  }
  const cur = await getSubscription(client, {
    tenantSchema: input.tenantSchema, subscriptionId: input.subscriptionId,
  });
  if (!cur) {
    throw Object.assign(
      new Error(`subscription ${input.subscriptionId} not found`),
      { code: 'not_found' },
    );
  }
  if (cur.status === 'revoked' && input.status !== 'revoked') {
    throw Object.assign(
      new Error(`subscription ${input.subscriptionId} is revoked, cannot change`),
      { code: 'bad_state' },
    );
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".webhook_subscriptions
        SET status = $2
      WHERE subscription_id = $1
      RETURNING ${SUB_COLS}`,
    [input.subscriptionId, input.status],
  );
  return mapSub(r.rows[0] as never);
}

function matchesEvent(sub: WebhookSubscriptionRow, eventType: string): boolean {
  return sub.eventTypes.includes('*') || sub.eventTypes.includes(eventType);
}

async function recordDelivery(
  client: DbClient, tenantSchema: string,
  subscriptionId: string, eventType: string,
  payload: Record<string, unknown>, status: DeliveryStatus,
  responseStatus: number | null, durationMs: number, error: string | null,
): Promise<WebhookDeliveryRow> {
  const r = await client.query(
    `INSERT INTO "${tenantSchema}".webhook_deliveries
       (subscription_id, event_type, payload, status, response_status,
        duration_ms, error, attempted_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, NOW())
     RETURNING ${DEL_COLS}`,
    [subscriptionId, eventType, JSON.stringify(payload), status,
     responseStatus, durationMs, error],
  );
  return mapDel(r.rows[0] as never);
}

export async function dispatchEvent(
  client: DbClient, input: DispatchEventInput,
): Promise<DispatchEventResult> {
  assertSchema(input.tenantSchema);
  if (!input.eventType) {
    throw Object.assign(new Error('eventType required'), { code: 'bad_input' });
  }
  const subs = await client.query(
    `SELECT ${SUB_COLS} FROM "${input.tenantSchema}".webhook_subscriptions
      WHERE status = 'active'`,
    [],
  );
  const all = subs.rows.map(mapSub as never) as WebhookSubscriptionRow[];
  const matched = all.filter((s) => matchesEvent(s, input.eventType));
  let succeeded = 0; let failed = 0;
  const rows: WebhookDeliveryRow[] = [];
  for (const sub of matched) {
    const t0 = Date.now();
    if (!input.transport) {
      const dur = Date.now() - t0;
      const row = await recordDelivery(
        client, input.tenantSchema, sub.subscriptionId,
        input.eventType, input.payload, 'failed',
        null, dur, 'no transport configured',
      );
      rows.push(row); failed++;
      continue;
    }
    try {
      const code = await input.transport(sub, input.payload);
      const dur = Date.now() - t0;
      const responseStatus = typeof code === 'number' ? code : 200;
      const ok = responseStatus >= 200 && responseStatus < 300;
      const row = await recordDelivery(
        client, input.tenantSchema, sub.subscriptionId,
        input.eventType, input.payload,
        ok ? 'succeeded' : 'failed', responseStatus, dur,
        ok ? null : `non-2xx response ${responseStatus}`,
      );
      rows.push(row);
      if (ok) succeeded++; else failed++;
    } catch (e) {
      const dur = Date.now() - t0;
      const row = await recordDelivery(
        client, input.tenantSchema, sub.subscriptionId,
        input.eventType, input.payload, 'failed',
        null, dur, String((e as Error).message ?? e),
      );
      rows.push(row); failed++;
    }
  }
  if (!DEL_STATUSES.includes('succeeded')) {
    throw Object.assign(new Error('bad status'), { code: 'bad_status' });
  }
  return { matched: matched.length, succeeded, failed, rows };
}

export async function listDeliveries(
  client: DbClient, input: ListDeliveriesInput,
): Promise<{ rows: WebhookDeliveryRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.subscriptionId) {
    params.push(input.subscriptionId);
    where += ` AND subscription_id = $${params.length}`;
  }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.eventType) { params.push(input.eventType); where += ` AND event_type = $${params.length}`; }
  const r = await client.query(
    `SELECT ${DEL_COLS} FROM "${input.tenantSchema}".webhook_deliveries
      WHERE ${where} ORDER BY attempted_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".webhook_deliveries WHERE ${where}`,
    params,
  );
  return { rows: r.rows.map(mapDel as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export const WEBHOOK_SUBSCRIPTION_STATUSES = SUB_STATUSES;
export const WEBHOOK_DELIVERY_STATUSES = DEL_STATUSES;

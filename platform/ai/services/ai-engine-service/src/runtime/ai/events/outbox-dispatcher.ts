// AI-OS — In-process outbox dispatcher.
//
// Drains <tenant>.event_outbox by re-publishing pending rows to the
// in-process EventBus and marking them dispatched. The catch-up producer
// in ai-catch-up-producer.ts writes events into both the EventBus AND
// the outbox; without this dispatcher running somewhere, the outbox
// rows pile up indefinitely (~6,400 stuck events observed in audit).
//
// Why a per-process loop and not a separate worker:
//   - The events are already published to the EventBus by the producer,
//     so subscribers fire immediately. The outbox is the durable replay
//     layer, drained at lower priority.
//   - One engine instance running this is sufficient for a single-DB
//     deployment. For multi-instance, lock per-tenant via SKIP LOCKED
//     so only one drainer claims each row.
//
// Disabled via AI_OUTBOX_DISPATCHER_DISABLED=1.

import { logger } from '../ports/logger.port';

const BATCH_SIZE = parseInt(process.env.AI_OUTBOX_BATCH_SIZE || '100', 10);
const MAX_ATTEMPTS = parseInt(process.env.AI_OUTBOX_MAX_ATTEMPTS || '5', 10);

let _timer: NodeJS.Timeout | null = null;
let _running = false;

interface OutboxRow {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, unknown> | string;
  attempts: number;
}

async function listTenantSchemas(getPool: (..._a: unknown[]) => any): Promise<string[]> {
  const r = await getPool().query(
    `SELECT schema_name FROM information_schema.schemata
      WHERE schema_name ~ '^tenant_[0-9a-f]{32}$'
      ORDER BY schema_name`,
  );
  return r.rows.map((row: { schema_name: string }) => row.schema_name);
}

function deriveTenantId(schema: string): string | null {
  const m = schema.match(/^tenant_([0-9a-f]{32})$/i);
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

async function drainSchema(client: any, schema: string, tenantId: string, eventBus: any): Promise<{ dispatched: number; failed: number }> {
  // Claim a batch. Skip already-locked rows so concurrent drainers don't collide.
  const claim = await client.query(
    `WITH claimed AS (
       SELECT event_id FROM "${schema}".event_outbox
        WHERE status = 'pending' AND attempts < $2
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
     )
     UPDATE "${schema}".event_outbox o
        SET attempts = o.attempts + 1, updated_at = NOW()
       FROM claimed
      WHERE o.event_id = claimed.event_id
      RETURNING o.event_id, o.event_type, o.aggregate_type, o.aggregate_id, o.payload, o.attempts`,
    [BATCH_SIZE, MAX_ATTEMPTS],
  );
  let dispatched = 0; let failed = 0;
  for (const row of (claim.rows || []) as OutboxRow[]) {
    const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    try {
      await eventBus.publish({
        eventType: row.event_type,
        tenantId,
        sourceService: 'ai-engine-outbox-dispatcher',
        severity: 'info',
        payload,
        // idempotencyKey ensures the backbone doesn't double-deliver if
        // a downstream consumer ran twice.
        idempotencyKey: `outbox:${row.event_id}`,
      });
      await client.query(
        `UPDATE "${schema}".event_outbox
            SET status = 'dispatched', dispatched_at = NOW(), updated_at = NOW()
          WHERE event_id = $1`,
        [row.event_id],
      );
      dispatched++;
    } catch (err) {
      const msg = (err as Error).message || String(err);
      const finalStatus = row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await client.query(
        `UPDATE "${schema}".event_outbox
            SET status = $1, error_message = $2, updated_at = NOW()
          WHERE event_id = $3`,
        [finalStatus, msg.slice(0, 1000), row.event_id],
      );
      failed++;
    }
  }
  return { dispatched, failed };
}

export async function runOutboxDispatcherOnce(): Promise<{ tenants: number; dispatched: number; failed: number }> {
  if (_running) return { tenants: 0, dispatched: 0, failed: 0 }; // re-entrancy guard
  _running = true;
  try {
    const { getPool, withTenantClient } = await import('@dos/db');
    const { eventBus } = await import('../ports/events.port.js');
    const schemas = await listTenantSchemas(getPool);
    let totalDispatched = 0; let totalFailed = 0; let tenantsScanned = 0;
    for (const schema of schemas) {
      const tenantId = deriveTenantId(schema);
      if (!tenantId) continue;
      tenantsScanned += 1;
      try {
        await withTenantClient(tenantId, async (client: any) => {
          const r = await drainSchema(client, schema, tenantId, eventBus);
          totalDispatched += r.dispatched;
          totalFailed += r.failed;
        });
      } catch (err) {
        logger.warn(`[outbox-dispatcher] tenant ${tenantId} drain failed: ${(err as Error).message}`);
      }
    }
    if (totalDispatched > 0 || totalFailed > 0) {
      logger.info(`[outbox-dispatcher] tenants=${tenantsScanned} dispatched=${totalDispatched} failed=${totalFailed}`);
    }
    return { tenants: tenantsScanned, dispatched: totalDispatched, failed: totalFailed };
  } finally {
    _running = false;
  }
}

export function startOutboxDispatcher(intervalMs: number = 5_000): void {
  if (_timer) return;
  if (process.env.AI_OUTBOX_DISPATCHER_DISABLED === '1') {
    logger.info('[outbox-dispatcher] disabled via AI_OUTBOX_DISPATCHER_DISABLED=1');
    return;
  }
  // Drain aggressively for the first minute to clear backlog, then settle.
  setTimeout(() => { runOutboxDispatcherOnce().catch(() => undefined); }, 5_000);
  _timer = setInterval(() => { runOutboxDispatcherOnce().catch(() => undefined); }, intervalMs);
  logger.info(`[outbox-dispatcher] started — interval=${intervalMs}ms batch=${BATCH_SIZE} max_attempts=${MAX_ATTEMPTS}`);
}

export function stopOutboxDispatcher(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

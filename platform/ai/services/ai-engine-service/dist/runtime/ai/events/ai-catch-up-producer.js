// AI-OS Wave 2 — Catch-up producer for AI-event subscribers.
//
// registerAiEventSubscribers wires 11 domain event types (risk.created,
// compliance.gap_detected, evidence.collected, ...) but production
// services in this environment do not yet emit them at write-time.
// Until the per-service producers are wired, this scheduled poller scans
// changed rows in each canonical entity table (per tenant), synthesizes
// the corresponding event payload, publishes it to the EventBus, and
// advances a per-entity cursor so events fire exactly once.
//
// Designed to be idempotent: each emit also writes a pending row to
// <tenant>.event_outbox so the modules/compliance dispatcher can take
// over once the source-of-truth producers are wired in those services.
import { logger } from '../ports/logger.port.js';
import { eventBus } from '../ports/events.port.js';
const ENTITIES = [
    { entityType: 'risk', table: 'risks', eventType: 'risk.created', aggregateType: 'risk', idColumn: 'risk_id', titleColumn: 'title', createdAtColumn: 'created_at' },
    { entityType: 'compliance_gap', table: 'compliance_gaps', eventType: 'compliance.gap_detected', aggregateType: 'compliance_gap', idColumn: 'gap_id', titleColumn: 'title', severityColumn: 'severity', createdAtColumn: 'created_at' },
    { entityType: 'evidence', table: 'evidence', eventType: 'evidence.collected', aggregateType: 'evidence', idColumn: 'evidence_id', titleColumn: 'title', createdAtColumn: 'created_at' },
    { entityType: 'control', table: 'controls', eventType: 'control.created', aggregateType: 'control', idColumn: 'control_id', titleColumn: 'title', createdAtColumn: 'created_at' },
    { entityType: 'audit_plan', table: 'audit_plans', eventType: 'audit.plan_created', aggregateType: 'audit_plan', idColumn: 'id', titleColumn: 'name', createdAtColumn: 'created_at' },
];
// Tenant-id matches the canonical UUID format the platform uses
// (32 hex chars after the schema prefix). Legacy short-named schemas
// like 'tenant_dogan' / 'tenant_a765b0362188' cannot be reversed into
// a UUID and are skipped — they hold no real domain content.
function deriveTenantId(schema) {
    const m = schema.match(/^tenant_([0-9a-f]{32})$/i);
    if (!m)
        return null;
    const h = m[1];
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
async function listTenantSchemas(getPool) {
    const r = await getPool().query(`SELECT schema_name FROM information_schema.schemata
      WHERE schema_name ~ '^tenant_[0-9a-f]{32}$'
      ORDER BY schema_name`);
    return r.rows.map((row) => row.schema_name);
}
async function ensureCursor(client, entityType) {
    const r = await client.query(`INSERT INTO ai_event_producer_cursors (entity_type)
     VALUES ($1)
     ON CONFLICT (entity_type) DO UPDATE SET entity_type = EXCLUDED.entity_type
     RETURNING last_seen_at`, [entityType]);
    return new Date(r.rows[0].last_seen_at);
}
async function emitForEntity(client, schema, tenantId, ent) {
    // Skip silently if the source table is missing for this tenant
    const tableExists = await client.query(`SELECT 1 FROM information_schema.tables
      WHERE table_schema = $1 AND table_name = $2 LIMIT 1`, [schema, ent.table]);
    if (tableExists.rows.length === 0)
        return 0;
    const cursor = await ensureCursor(client, ent.entityType);
    // Build the SELECT dynamically — only columns we have.
    const cols = [`${ent.idColumn} AS aggregate_id`, `${ent.createdAtColumn} AS created_at`];
    if (ent.titleColumn)
        cols.push(`${ent.titleColumn} AS title`);
    if (ent.severityColumn)
        cols.push(`${ent.severityColumn} AS severity`);
    const r = await client.query(`SELECT ${cols.join(', ')}
       FROM "${schema}"."${ent.table}"
      WHERE ${ent.createdAtColumn} > $1
      ORDER BY ${ent.createdAtColumn} ASC
      LIMIT 200`, [cursor.toISOString()]);
    if (r.rows.length === 0)
        return 0;
    let emitted = 0;
    let maxSeen = cursor;
    for (const row of r.rows) {
        const payload = {
            entityId: String(row.aggregate_id),
            entityType: ent.aggregateType,
        };
        if (row.title)
            payload.title = row.title;
        if (row.severity)
            payload.severity = row.severity;
        // 1. Publish to in-process EventBus so registered handlers fire.
        try {
            await eventBus.publish?.({
                eventType: ent.eventType,
                tenantId,
                sourceService: 'ai-engine-service',
                severity: 'info',
                payload,
            });
        }
        catch (err) {
            logger.warn(`[catch-up-producer] eventBus.publish failed: ${err.message}`);
        }
        // 2. Mirror to <tenant>.event_outbox so the durable dispatcher in
        //    modules/compliance can deliver the same event cross-service.
        try {
            await client.query(`INSERT INTO event_outbox (event_type, aggregate_type, aggregate_id, payload, status)
         VALUES ($1, $2, $3, $4::jsonb, 'pending')`, [ent.eventType, ent.aggregateType, String(row.aggregate_id), JSON.stringify(payload)]);
        }
        catch { /* outbox insert failure is non-fatal */ }
        const t = new Date(row.created_at);
        if (t > maxSeen)
            maxSeen = t;
        emitted += 1;
    }
    await client.query(`UPDATE ai_event_producer_cursors
        SET last_seen_at = GREATEST(last_seen_at, $2),
            last_run_at  = NOW(),
            rows_emitted = rows_emitted + $3
      WHERE entity_type = $1`, [ent.entityType, maxSeen.toISOString(), emitted]);
    return emitted;
}
export async function runCatchUpProducerOnce() {
    const { getPool, withTenantClient } = await import('@dos/db');
    const schemas = await listTenantSchemas(getPool);
    let totalEmitted = 0;
    let tenantsScanned = 0;
    for (const schema of schemas) {
        const tenantId = deriveTenantId(schema);
        if (!tenantId)
            continue;
        tenantsScanned += 1;
        try {
            await withTenantClient(tenantId, async (client) => {
                for (const ent of ENTITIES) {
                    totalEmitted += await emitForEntity(client, schema, tenantId, ent).catch(() => 0);
                }
            });
        }
        catch (err) {
            logger.warn(`[catch-up-producer] tenant ${tenantId} failed: ${err.message}`);
        }
    }
    if (totalEmitted > 0) {
        logger.info(`[catch-up-producer] tenants=${tenantsScanned} emitted=${totalEmitted}`);
    }
    return { tenants: tenantsScanned, emitted: totalEmitted };
}
let _timer = null;
export function startCatchUpProducer(intervalMs = 60_000) {
    if (_timer)
        return;
    if (process.env.AI_CATCH_UP_PRODUCER_DISABLED === '1') {
        logger.info('[catch-up-producer] disabled via env');
        return;
    }
    // First run a few seconds after boot so DB pool is warm.
    setTimeout(() => { runCatchUpProducerOnce().catch(() => undefined); }, 10_000);
    _timer = setInterval(() => { runCatchUpProducerOnce().catch(() => undefined); }, intervalMs);
    logger.info(`[catch-up-producer] started — interval=${intervalMs}ms`);
}
export function stopCatchUpProducer() {
    if (_timer) {
        clearInterval(_timer);
        _timer = null;
    }
}
//# sourceMappingURL=ai-catch-up-producer.js.map
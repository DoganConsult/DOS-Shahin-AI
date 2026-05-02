import { safeQuery, tenantSchema } from '@dos/db';
import { randomUUID } from 'crypto';
function parseJsonb(val, fallback) {
    if (val === null || val === undefined)
        return fallback;
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            return fallback;
        }
    }
    return val;
}
export async function getConnections(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata, status, created_at FROM "${schema}".integrations_connectors
     WHERE status != 'deleted' ORDER BY created_at DESC LIMIT 100`).catch(() => ({ rows: [] }));
    return result.rows.map((row) => ({
        connectionId: row.id,
        ...parseJsonb(row.metadata, {}),
        status: row.status,
        createdAt: row.created_at,
    }));
}
export async function saveConnection(tenantId, body) {
    const schema = tenantSchema(tenantId);
    const connectionId = body.connectionId || body.id || randomUUID();
    const metadata = { ...body, connectionId };
    delete metadata.id;
    await safeQuery(`INSERT INTO "${schema}".integrations_connectors (id, tenant_id, metadata, status, updated_at)
     VALUES ($1, $2, $3::jsonb, 'active', NOW())
     ON CONFLICT (id) DO UPDATE SET metadata = $3::jsonb, status = 'active', updated_at = NOW()`, [connectionId, tenantId, JSON.stringify(metadata)]);
    return { connectionId, ...metadata };
}
export async function validateConnection(tenantId, connectionId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata, status FROM "${schema}".integrations_connectors WHERE id = $1 LIMIT 1`, [connectionId]).catch(() => ({ rows: [] }));
    if (!result.rows[0]) {
        return { valid: false, connectionId, error: 'Connection not found' };
    }
    return { valid: true, connectionId, status: result.rows[0].status };
}
export async function getFieldMappings(tenantId, connectionId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, metadata FROM "${schema}".integrations_field_mappings
     WHERE metadata->>'connectionId' = $1 ORDER BY created_at DESC`, [connectionId]).catch(() => ({ rows: [] }));
    return result.rows.map((row) => ({
        mappingId: row.id,
        ...parseJsonb(row.metadata, {}),
    }));
}
export async function saveFieldMapping(tenantId, connectionId, mapping) {
    const schema = tenantSchema(tenantId);
    const mappingId = mapping.mappingId || randomUUID();
    const metadata = { ...mapping, connectionId, mappingId };
    await safeQuery(`INSERT INTO "${schema}".integrations_field_mappings (id, tenant_id, metadata, status, updated_at)
     VALUES ($1, $2, $3::jsonb, 'active', NOW())
     ON CONFLICT (id) DO UPDATE SET metadata = $3::jsonb, updated_at = NOW()`, [mappingId, tenantId, JSON.stringify(metadata)]);
    return { mappingId, ...metadata };
}
export async function executeSyncJob(tenantId, connectionId) {
    const schema = tenantSchema(tenantId);
    const jobId = randomUUID();
    const startedAt = new Date().toISOString();
    await safeQuery(`INSERT INTO "${schema}".integrations_sync_logs (id, tenant_id, event_type, payload, created_at)
     VALUES ($1, $2, 'sync_started', $3::jsonb, NOW())`, [jobId, tenantId, JSON.stringify({ connectionId, jobId, startedAt })]).catch(() => { });
    return {
        jobId,
        connectionId,
        status: 'queued',
        startedAt,
        message: 'Sync job queued. Results will be available in sync history.',
    };
}
export async function getSyncHistory(tenantId, connectionId, limit = 50) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT id, event_type, payload, created_at FROM "${schema}".integrations_sync_logs
     WHERE payload->>'connectionId' = $1
     ORDER BY created_at DESC LIMIT $2`, [connectionId, limit]).catch(() => ({ rows: [] }));
    return result.rows.map((row) => ({
        logId: row.id,
        eventType: row.event_type,
        ...parseJsonb(row.payload, {}),
        createdAt: row.created_at,
    }));
}
//# sourceMappingURL=erp-connector.service.js.map
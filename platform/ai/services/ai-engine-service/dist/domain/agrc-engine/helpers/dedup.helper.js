import { query, safeQuery } from '../ports/database.port.js';
import { swallowNull, EC } from '@dos/platform-core/resilience/resilient-catch';
export async function canRunDedupAction(schema, dedupKey, entityType, entityId, actionType, ttlHours = 24) {
    await swallowNull(EC.FALLBACK_QUERY, query(`DELETE FROM "${schema}".agrc_engine_dedup WHERE expires_at < now()`), { operation: 'query agrc_engine_dedup' });
    const existing = await safeQuery(`SELECT dedup_key FROM "${schema}".agrc_engine_dedup WHERE dedup_key = $1::text LIMIT 1`, [dedupKey]);
    if (existing.rows[0])
        return false;
    await safeQuery(`
    INSERT INTO "${schema}".agrc_engine_dedup
    (dedup_key, entity_type, entity_id, action_type, expires_at)
    VALUES ($1::text, $2::text, $3::text, $4::text, now() + ($5::text || ' hours')::interval)
    `, [dedupKey, entityType, entityId, actionType, String(ttlHours)]);
    return true;
}
//# sourceMappingURL=dedup.helper.js.map
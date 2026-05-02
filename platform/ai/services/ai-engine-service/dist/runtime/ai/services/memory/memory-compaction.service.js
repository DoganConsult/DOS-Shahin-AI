import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { chatCompletion } from '../gateway/llm.service.js';
import { getFirstRow } from '@dos/db';
export async function expireStaleMemories(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`UPDATE "${schema}".agent_memories
       SET is_deleted = TRUE
       WHERE tenant_id = $1 AND expires_at IS NOT NULL AND expires_at < NOW() AND is_deleted = FALSE
       RETURNING memory_id`, [tenantId]);
        return result.rows.length;
    }
    catch {
        return 0;
    }
}
export async function mergeDuplicateMemories(tenantId) {
    const schema = tenantSchema(tenantId);
    let merged = 0;
    try {
        const dupes = await safeQuery(`SELECT namespace, content, COUNT(*)::int AS cnt, ARRAY_AGG(memory_id) AS ids
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE
       GROUP BY namespace, content
       HAVING COUNT(*) > 1
       LIMIT 50`, [tenantId]);
        for (const dupe of dupes.rows) {
            const idsToDelete = dupe.ids.slice(1);
            if (idsToDelete.length > 0) {
                await safeQuery(`UPDATE "${schema}".agent_memories SET is_deleted = TRUE WHERE memory_id = ANY($1)`, [idsToDelete]);
                merged += idsToDelete.length;
            }
        }
    }
    catch { /* non-fatal */ }
    return merged;
}
export async function compactOldMemories(tenantId, olderThanDays = 30, batchSize = 20) {
    const schema = tenantSchema(tenantId);
    let compacted = 0;
    try {
        const namespaces = await safeQuery(`SELECT DISTINCT namespace FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE
         AND created_at < NOW() - make_interval(days => $2)
         AND summary IS NULL
       LIMIT 10`, [tenantId, olderThanDays]);
        for (const ns of namespaces.rows) {
            const memories = await safeQuery(`SELECT memory_id, content, importance_score FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND namespace = $2 AND is_deleted = FALSE AND summary IS NULL
         ORDER BY created_at ASC LIMIT $3`, [tenantId, ns.namespace, batchSize]);
            if (memories.rows.length < 3)
                continue;
            const contents = memories.rows.map((m) => m.content).join('\n---\n');
            const messages = [
                { role: 'system', content: 'Summarize the following agent memory entries into a single concise paragraph. Preserve key facts, decisions, and learnings. Output ONLY the summary text.' },
                { role: 'user', content: contents.slice(0, 4000) },
            ];
            try {
                const result = await chatCompletion(messages);
                const summaryText = result.content.slice(0, 2000);
                const ids = memories.rows.map((m) => m.memory_id);
                const keepId = ids[0];
                await safeQuery(`UPDATE "${schema}".agent_memories
           SET content = $1, summary = $2, importance_score = 0.7
           WHERE memory_id = $3`, [summaryText, 'Compacted from ' + ids.length + ' entries', keepId]);
                const deleteIds = ids.slice(1);
                if (deleteIds.length > 0) {
                    await safeQuery(`UPDATE "${schema}".agent_memories SET is_deleted = TRUE WHERE memory_id = ANY($1)`, [deleteIds]);
                }
                compacted += ids.length;
            }
            catch { /* LLM call failed — skip this batch */ }
        }
    }
    catch { /* non-fatal */ }
    return compacted;
}
export async function runCompaction(tenantId) {
    const expired = await expireStaleMemories(tenantId);
    const merged = await mergeDuplicateMemories(tenantId);
    const compacted = await compactOldMemories(tenantId);
    return {
        tenantId,
        memoriesProcessed: expired + merged + compacted,
        memoriesMerged: merged,
        memoriesExpired: expired,
        memoriesCompacted: compacted,
    };
}
export async function getMemoryHealth(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE is_deleted = FALSE)::int AS active,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND is_deleted = FALSE)::int AS expiring_soon,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days' AND summary IS NULL AND is_deleted = FALSE)::int AS old_uncompacted
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1`, [tenantId]);
        const dupeResult = await safeQuery(`SELECT COUNT(*)::int AS dupes FROM (
         SELECT namespace, content FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND is_deleted = FALSE
         GROUP BY namespace, content HAVING COUNT(*) > 1
       ) sub`, [tenantId]);
        const r = getFirstRow(result) || {};
        return {
            totalMemories: r.total || 0,
            activeMemories: r.active || 0,
            expiringSoon: r.expiring_soon || 0,
            oldUncompacted: r.old_uncompacted || 0,
            duplicates: getFirstRow(dupeResult)?.dupes || 0,
        };
    }
    catch {
        return { totalMemories: 0, activeMemories: 0, expiringSoon: 0, oldUncompacted: 0, duplicates: 0 };
    }
}
//# sourceMappingURL=memory-compaction.service.js.map
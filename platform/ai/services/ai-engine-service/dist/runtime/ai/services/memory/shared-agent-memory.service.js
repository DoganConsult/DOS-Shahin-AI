import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
function buildSharedNamespace(tenantId, scope) {
    return `mem:tenant:${tenantId}:shared:${scope}`;
}
export async function writeSharedMemory(tenantId, agentId, scope, content, metadata, importance) {
    const schema = tenantSchema(tenantId);
    const namespace = buildSharedNamespace(tenantId, scope);
    try {
        const result = await safeQuery(`INSERT INTO "${schema}".agent_memories
         (tenant_id, user_id, agent_id, memory_type, namespace, content,
          metadata, importance_score, is_deleted)
       VALUES ($1, NULL, $2, 'task', $3, $4, $5, $6, FALSE)
       RETURNING memory_id`, [
            tenantId, agentId, namespace, content,
            JSON.stringify({ ...metadata, shared: true, writtenBy: agentId }),
            importance ?? 0.6,
        ]);
        return getFirstRow(result)?.memory_id || null;
    }
    catch {
        return null;
    }
}
export async function readSharedMemory(tenantId, scope, limit = 10) {
    const schema = tenantSchema(tenantId);
    const namespace = buildSharedNamespace(tenantId, scope);
    try {
        const result = await safeQuery(`SELECT memory_id, tenant_id, memory_type, namespace, content, metadata,
              importance_score, created_at
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace = $2 AND is_deleted = FALSE
       ORDER BY importance_score DESC, created_at DESC
       LIMIT $3`, [tenantId, namespace, limit]);
        return result.rows.map((r) => ({
            ...r,
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
        }));
    }
    catch {
        return [];
    }
}
export async function readAllSharedScopes(tenantId, agentId, limit = 20) {
    const schema = tenantSchema(tenantId);
    const nsPrefix = `mem:tenant:${tenantId}:shared:`;
    try {
        let q = `SELECT memory_id, tenant_id, memory_type, namespace, content, metadata,
                    importance_score, created_at
             FROM "${schema}".agent_memories
             WHERE tenant_id = $1 AND namespace LIKE $2 AND is_deleted = FALSE`;
        const params = [tenantId, nsPrefix + '%'];
        if (agentId) {
            q += ` AND (agent_id = $3 OR metadata->>'shared' = 'true')`;
            params.push(agentId);
        }
        q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await safeQuery(q, params);
        return result.rows;
    }
    catch {
        return [];
    }
}
export async function writeAgentHandoffMemory(tenantId, fromAgent, toAgent, content, metadata) {
    return writeSharedMemory(tenantId, fromAgent, `handoff:${fromAgent}:${toAgent}`, content, { ...metadata, fromAgent, toAgent, type: 'handoff' }, 0.8);
}
export async function readHandoffMemory(tenantId, toAgent, limit = 5) {
    const schema = tenantSchema(tenantId);
    const nsPattern = `mem:tenant:${tenantId}:shared:handoff:%:${toAgent}`;
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace LIKE $2 AND is_deleted = FALSE
       ORDER BY created_at DESC LIMIT $3`, [tenantId, nsPattern, limit]);
        return result.rows;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=shared-agent-memory.service.js.map
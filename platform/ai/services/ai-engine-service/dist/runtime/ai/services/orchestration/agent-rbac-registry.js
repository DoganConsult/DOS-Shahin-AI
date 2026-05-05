import { safeQuery, tenantSchema } from '../../ports/database.port';
const BUILT_IN_AGENT_IDS = [
    'A01', 'A02', 'A03', 'A04', 'A05', 'A06',
    'A07', 'A08', 'A09', 'A10', 'A11', 'A12',
];
export function getAgentIds() {
    return [...BUILT_IN_AGENT_IDS];
}
export async function getRegisteredAgentIds(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT agent_id FROM "${schema}".ai_agent_registry WHERE is_active = TRUE ORDER BY agent_id`).catch(() => ({ rows: [] }));
    const dbIds = result.rows.map((r) => r.agent_id);
    return [...new Set([...BUILT_IN_AGENT_IDS, ...dbIds])];
}
export async function isAgentAuthorized(tenantId, agentId, action) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT 1 FROM "${schema}".ai_agent_permissions
     WHERE agent_id = $1 AND action_code = $2 AND is_active = TRUE LIMIT 1`, [agentId, action]).catch(() => ({ rows: [] }));
    return result.rows.length > 0 || BUILT_IN_AGENT_IDS.includes(agentId);
}
//# sourceMappingURL=agent-rbac-registry.js.map
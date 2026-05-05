// @ts-nocheck
import { safeQuery } from '../ports/database.port';
export async function listAgents() {
    const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry WHERE is_enabled = TRUE AND status = 'active' ORDER BY sort_order`);
    return result.rows.map(mapAgentRow);
}
export async function listAllAgents() {
    const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry ORDER BY sort_order`);
    return result.rows.map(mapAgentRow);
}
export async function getAgentById(agentId) {
    const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry WHERE agent_id = $1`, [agentId]);
    return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}
export async function getAgentsByModule(moduleCode) {
    const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry WHERE owner_module_code = $1 AND is_enabled = TRUE ORDER BY sort_order`, [moduleCode]);
    return result.rows.map(mapAgentRow);
}
export async function getAgentsByDomain(domainCode) {
    const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry WHERE domain_code = $1 AND is_enabled = TRUE ORDER BY sort_order`, [domainCode]);
    return result.rows.map(mapAgentRow);
}
export async function updateAgentStatus(agentId, status) {
    await safeQuery(`UPDATE public.mcp_agent_registry SET status = $1, updated_at = NOW() WHERE agent_id = $2`, [status, agentId]);
}
export async function updateAgentEnabled(agentId, isEnabled) {
    await safeQuery(`UPDATE public.mcp_agent_registry SET is_enabled = $1, updated_at = NOW() WHERE agent_id = $2`, [isEnabled, agentId]);
}
function mapAgentRow(row) {
    return {
        agentId: row.agent_id,
        nameEn: row.name_en,
        nameAr: row.name_ar,
        summaryEn: row.summary_en,
        summaryAr: row.summary_ar,
        ownerModuleCode: row.owner_module_code,
        domainCode: row.domain_code,
        moduleCodes: row.module_codes || [],
        capabilities: row.capabilities || [],
        tags: row.tags || [],
        guardrails: row.guardrails || {},
        icon: row.icon,
        color: row.color,
        status: row.status,
        version: row.version,
        visibilityScope: row.visibility_scope || 'all',
        isEnabled: row.is_enabled,
        isSystem: row.is_system,
        sortOrder: row.sort_order,
    };
}
//# sourceMappingURL=mcp-agent.repo.js.map
/**
 * MCP Database Loader — Loads agent definitions from the database.
 *
 * Reads agent configurations from the ai_agents table and transforms
 * them into the DbAgent format expected by the MCP server and
 * dynamic tool executor.
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
/**
 * Load all agent definitions from the tenant's database.
 * Returns a Map keyed by agentId.
 */
export async function loadDbAgents(tenantId) {
    const agentMap = new Map();
    const schema = tenantSchema(tenantId);
    try {
        const { rows } = await safeQuery(`SELECT
         a.id AS agent_id,
         a.name_en, a.name_ar,
         COALESCE(a.summary_en, a.description_en, '') AS summary_en,
         COALESCE(a.summary_ar, a.description_ar, '') AS summary_ar,
         COALESCE(a.domain_code, 'general') AS domain_code,
         COALESCE(a.owner_module_code, 'ai') AS owner_module_code,
         COALESCE(a.module_codes, ARRAY[]::text[]) AS module_codes,
         COALESCE(a.capabilities, ARRAY[]::text[]) AS capabilities,
         COALESCE(a.icon, 'bot') AS icon,
         COALESCE(a.color, '#6366f1') AS color,
         COALESCE(a.status, 'active') AS status,
         COALESCE(a.is_enabled, TRUE) AS is_enabled,
         a.system_prompt,
         a.tool_codes,
         a.max_tokens,
         a.temperature,
         a.metadata_json
       FROM "${schema}".ai_agents a
       WHERE a.deleted_at IS NULL
       ORDER BY a.domain_code, a.name_en`);
        for (const row of rows) {
            const agent = {
                agentId: row.agent_id,
                nameEn: row.name_en,
                nameAr: row.name_ar,
                summaryEn: row.summary_en,
                summaryAr: row.summary_ar,
                domainCode: row.domain_code,
                ownerModuleCode: row.owner_module_code,
                moduleCodes: row.module_codes || [],
                capabilities: row.capabilities || [],
                icon: row.icon,
                color: row.color,
                status: row.status,
                isEnabled: row.is_enabled,
                systemPrompt: row.system_prompt,
                toolCodes: row.tool_codes || undefined,
                maxTokens: row.max_tokens,
                temperature: row.temperature,
                ...(row.metadata_json ? row.metadata_json : {}),
            };
            agentMap.set(agent.agentId, agent);
        }
        logger.debug(`[MCP-DbLoader] Loaded ${agentMap.size} agents for tenant ${tenantId}`);
    }
    catch (err) {
        // Table may not exist in all schemas — graceful fallback
        logger.debug('[MCP-DbLoader] Agent table not available', {
            tenantId,
            error: err instanceof Error ? err.message : String(err),
        });
    }
    // Also load from public registry as fallback
    if (agentMap.size === 0) {
        try {
            const { rows } = await safeQuery(`SELECT
           agent_id, name_en, name_ar,
           COALESCE(summary_en, '') AS summary_en,
           COALESCE(summary_ar, '') AS summary_ar,
           COALESCE(domain_code, 'general') AS domain_code,
           COALESCE(owner_module_code, 'ai') AS owner_module_code,
           COALESCE(module_codes, ARRAY[]::text[]) AS module_codes,
           COALESCE(capabilities, ARRAY[]::text[]) AS capabilities,
           COALESCE(icon, 'bot') AS icon,
           COALESCE(color, '#6366f1') AS color,
           'active' AS status,
           TRUE AS is_enabled
         FROM public.agent_registry
         WHERE is_active = TRUE
         ORDER BY domain_code, name_en`);
            for (const row of rows) {
                const agent = {
                    agentId: row.agent_id,
                    nameEn: row.name_en,
                    nameAr: row.name_ar || '',
                    summaryEn: row.summary_en,
                    summaryAr: row.summary_ar,
                    domainCode: row.domain_code,
                    ownerModuleCode: row.owner_module_code,
                    moduleCodes: row.module_codes || [],
                    capabilities: row.capabilities || [],
                    icon: row.icon,
                    color: row.color,
                    status: 'active',
                    isEnabled: true,
                };
                agentMap.set(agent.agentId, agent);
            }
            logger.debug(`[MCP-DbLoader] Loaded ${agentMap.size} agents from public registry`);
        }
        catch {
            // Public registry may not exist either
        }
    }
    return agentMap;
}
/**
 * Load a single agent by ID.
 */
export async function loadDbAgent(tenantId, agentId) {
    const agents = await loadDbAgents(tenantId);
    return agents.get(agentId) ?? null;
}
/**
 * Load agents filtered by domain code.
 */
export async function loadDbAgentsByDomain(tenantId, domainCode) {
    const agents = await loadDbAgents(tenantId);
    return [...agents.values()].filter(a => a.domainCode === domainCode);
}
/**
 * Load agents filtered by module code.
 */
export async function loadDbAgentsByModule(tenantId, moduleCode) {
    const agents = await loadDbAgents(tenantId);
    return [...agents.values()].filter(a => a.ownerModuleCode === moduleCode || a.moduleCodes.includes(moduleCode));
}
//# sourceMappingURL=db-loader.js.map
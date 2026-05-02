/**
 * MCP Database Loader — Loads agent definitions from the database.
 *
 * Reads agent configurations from the ai_agents table and transforms
 * them into the DbAgent format expected by the MCP server and
 * dynamic tool executor.
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';

export interface DbAgent {
  agentId: string;
  nameEn: string;
  nameAr: string;
  summaryEn: string;
  summaryAr: string;
  domainCode: string;
  ownerModuleCode: string;
  moduleCodes: string[];
  capabilities: string[];
  icon: string;
  color: string;
  status: string;
  isEnabled: boolean;
  systemPrompt?: string;
  toolCodes?: string[];
  maxTokens?: number;
  temperature?: number;
  [key: string]: any;
}

/**
 * Load all agent definitions from the tenant's database.
 * Returns a Map keyed by agentId.
 */
export async function loadDbAgents(tenantId: string): Promise<Map<string, DbAgent>> {
  const agentMap = new Map<string, DbAgent>();
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT
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
       ORDER BY a.domain_code, a.name_en`,
    );

    for (const row of rows) {
      const agent: DbAgent = {
        agentId: row.agent_id as string,
        nameEn: row.name_en as string,
        nameAr: row.name_ar as string,
        summaryEn: row.summary_en as string,
        summaryAr: row.summary_ar as string,
        domainCode: row.domain_code as string,
        ownerModuleCode: row.owner_module_code as string,
        moduleCodes: (row.module_codes as string[]) || [],
        capabilities: (row.capabilities as string[]) || [],
        icon: row.icon as string,
        color: row.color as string,
        status: row.status as string,
        isEnabled: row.is_enabled as boolean,
        systemPrompt: row.system_prompt as string | undefined,
        toolCodes: (row.tool_codes as string[]) || undefined,
        maxTokens: row.max_tokens as number | undefined,
        temperature: row.temperature as number | undefined,
        ...(row.metadata_json ? (row.metadata_json as Record<string, unknown>) : {}),
      };
      agentMap.set(agent.agentId, agent);
    }

    logger.debug(`[MCP-DbLoader] Loaded ${agentMap.size} agents for tenant ${tenantId}`);
  } catch (err) {
    // Table may not exist in all schemas — graceful fallback
    logger.debug('[MCP-DbLoader] Agent table not available', {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Also load from public registry as fallback
  if (agentMap.size === 0) {
    try {
      const { rows } = await safeQuery(
        `SELECT
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
         ORDER BY domain_code, name_en`,
      );

      for (const row of rows) {
        const agent: DbAgent = {
          agentId: row.agent_id as string,
          nameEn: row.name_en as string,
          nameAr: (row.name_ar as string) || '',
          summaryEn: row.summary_en as string,
          summaryAr: row.summary_ar as string,
          domainCode: row.domain_code as string,
          ownerModuleCode: row.owner_module_code as string,
          moduleCodes: (row.module_codes as string[]) || [],
          capabilities: (row.capabilities as string[]) || [],
          icon: row.icon as string,
          color: row.color as string,
          status: 'active',
          isEnabled: true,
        };
        agentMap.set(agent.agentId, agent);
      }

      logger.debug(`[MCP-DbLoader] Loaded ${agentMap.size} agents from public registry`);
    } catch {
      // Public registry may not exist either
    }
  }

  return agentMap;
}

/**
 * Load a single agent by ID.
 */
export async function loadDbAgent(tenantId: string, agentId: string): Promise<DbAgent | null> {
  const agents = await loadDbAgents(tenantId);
  return agents.get(agentId) ?? null;
}

/**
 * Load agents filtered by domain code.
 */
export async function loadDbAgentsByDomain(tenantId: string, domainCode: string): Promise<DbAgent[]> {
  const agents = await loadDbAgents(tenantId);
  return [...agents.values()].filter(a => a.domainCode === domainCode);
}

/**
 * Load agents filtered by module code.
 */
export async function loadDbAgentsByModule(tenantId: string, moduleCode: string): Promise<DbAgent[]> {
  const agents = await loadDbAgents(tenantId);
  return [...agents.values()].filter(a =>
    a.ownerModuleCode === moduleCode || a.moduleCodes.includes(moduleCode),
  );
}

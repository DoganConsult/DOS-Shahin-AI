// @ts-nocheck
import { safeQuery } from '../ports/database.port';
import type { McpAgentDef } from '@dos/types';
import type { GenericRow } from '@dos/types';

export async function listAgents(): Promise<McpAgentDef[]> {
  const result = await safeQuery(
    `SELECT * FROM public.mcp_agent_registry WHERE is_enabled = TRUE AND status = 'active' ORDER BY sort_order`,
  );
  return result.rows.map(mapAgentRow);
}

export async function listAllAgents(): Promise<McpAgentDef[]> {
  const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry ORDER BY sort_order`);
  return result.rows.map(mapAgentRow);
}

export async function getAgentById(agentId: string): Promise<McpAgentDef | null> {
  const result = await safeQuery(`SELECT * FROM public.mcp_agent_registry WHERE agent_id = $1`, [agentId]);
  return result.rows.length > 0 ? mapAgentRow(result.rows[0]) : null;
}

export async function getAgentsByModule(moduleCode: string): Promise<McpAgentDef[]> {
  const result = await safeQuery(
    `SELECT * FROM public.mcp_agent_registry WHERE owner_module_code = $1 AND is_enabled = TRUE ORDER BY sort_order`,
    [moduleCode],
  );
  return result.rows.map(mapAgentRow);
}

export async function getAgentsByDomain(domainCode: string): Promise<McpAgentDef[]> {
  const result = await safeQuery(
    `SELECT * FROM public.mcp_agent_registry WHERE domain_code = $1 AND is_enabled = TRUE ORDER BY sort_order`,
    [domainCode],
  );
  return result.rows.map(mapAgentRow);
}

export async function updateAgentStatus(agentId: string, status: string): Promise<void> {
  await safeQuery(`UPDATE public.mcp_agent_registry SET status = $1, updated_at = NOW() WHERE agent_id = $2`, [status, agentId]);
}

export async function updateAgentEnabled(agentId: string, isEnabled: boolean): Promise<void> {
  await safeQuery(`UPDATE public.mcp_agent_registry SET is_enabled = $1, updated_at = NOW() WHERE agent_id = $2`, [isEnabled, agentId]);
}

function mapAgentRow(row: GenericRow): McpAgentDef {
  return {
    agentId: row.agent_id as string,
    nameEn: row.name_en as string,
    nameAr: row.name_ar as string | null,
    summaryEn: row.summary_en as string | null,
    summaryAr: row.summary_ar as string | null,
    ownerModuleCode: row.owner_module_code as string,
    domainCode: row.domain_code as string,
    moduleCodes: (row.module_codes as string[]) || [],
    capabilities: (row.capabilities as string[]) || [],
    tags: (row.tags as string[]) || [],
    guardrails: (row.guardrails as Record<string, unknown>) || {},
    icon: row.icon as string | null,
    color: row.color as string | null,
    status: row.status as string,
    version: row.version as number,
    visibilityScope: (row.visibility_scope as string) || 'all',
    isEnabled: row.is_enabled as boolean,
    isSystem: row.is_system as boolean,
    sortOrder: row.sort_order as number,
  } as McpAgentDef;
}

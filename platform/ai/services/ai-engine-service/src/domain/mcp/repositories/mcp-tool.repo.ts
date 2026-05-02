// @ts-nocheck
import { safeQuery, tenantSchema } from '../ports/database.port';
import type { McpToolDef, McpToolOverride, ToolListFilter, ToolListResult } from '@dos/types';
import type { GenericRow } from '@dos/types';

export async function listTools(tenantId: string, filter: ToolListFilter = {}): Promise<ToolListResult> {
  const { status, agentId, moduleCode, domainCode, category, riskLevel, search, page = 1, pageSize = 50, sortBy = 'sort_order', sortDir = 'ASC' } = filter;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
  if (agentId) { conditions.push(`agent_id = $${idx++}`); params.push(agentId); }
  if (moduleCode) { conditions.push(`owner_module_code = $${idx++}`); params.push(moduleCode); }
  if (domainCode) { conditions.push(`domain_code = $${idx++}`); params.push(domainCode); }
  if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
  if (riskLevel) { conditions.push(`risk_level = $${idx++}`); params.push(riskLevel); }
  if (search) { conditions.push(`(tool_name ILIKE $${idx} OR display_name_en ILIKE $${idx} OR description_en ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const allowedSort = ['sort_order', 'tool_name', 'created_at', 'updated_at', 'risk_level', 'status'];
  const safeSortBy = allowedSort.includes(sortBy) ? sortBy : 'sort_order';
  const safeSortDir = sortDir === 'DESC' ? 'DESC' : 'ASC';
  const offset = (page - 1) * pageSize;

  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM public.mcp_tool_registry ${where}`, params);
  const total = countResult.rows[0]?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM public.mcp_tool_registry ${where} ORDER BY ${safeSortBy} ${safeSortDir} LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, pageSize, offset],
  );

  return { rows: dataResult.rows.map(mapToolRow), total };
}

export async function getToolByName(toolName: string): Promise<McpToolDef | null> {
  const result = await safeQuery(`SELECT * FROM public.mcp_tool_registry WHERE tool_name = $1`, [toolName]);
  return result.rows.length > 0 ? mapToolRow(result.rows[0]) : null;
}

export async function getToolById(toolId: string): Promise<McpToolDef | null> {
  const result = await safeQuery(`SELECT * FROM public.mcp_tool_registry WHERE tool_id = $1`, [toolId]);
  return result.rows.length > 0 ? mapToolRow(result.rows[0]) : null;
}

export async function getToolsForAgent(agentId: string): Promise<McpToolDef[]> {
  const result = await safeQuery(
    `SELECT * FROM public.mcp_tool_registry WHERE agent_id = $1 AND is_enabled = TRUE AND status = 'active' ORDER BY sort_order`,
    [agentId],
  );
  return result.rows.map(mapToolRow);
}

export async function updateToolStatus(toolName: string, status: string): Promise<void> {
  await safeQuery(`UPDATE public.mcp_tool_registry SET status = $1, updated_at = NOW() WHERE tool_name = $2`, [status, toolName]);
}

export async function updateToolEnabled(toolName: string, isEnabled: boolean): Promise<void> {
  await safeQuery(`UPDATE public.mcp_tool_registry SET is_enabled = $1, updated_at = NOW() WHERE tool_name = $2`, [isEnabled, toolName]);
}

export async function getToolOverrides(tenantId: string): Promise<Map<string, McpToolOverride>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".mcp_tool_overrides WHERE tenant_id = $1`, [tenantId]);
  const overrides = new Map<string, McpToolOverride>();
  for (const row of result.rows) {
    overrides.set(row.tool_name as string, {
      toolName: row.tool_name as string,
      isEnabled: row.is_enabled as boolean | null,
      approvalMode: row.approval_mode,
      minAutonomy: row.min_autonomy,
      maxAutonomy: row.max_autonomy,
      defaultAutonomy: row.default_autonomy,
      maxCallsPerMin: row.max_calls_per_min as number | null,
      customInputSchema: row.custom_input_schema as Record<string, unknown> | null,
      executionConfig: row.execution_config as Record<string, unknown> | null,
    });
  }
  return overrides;
}

export async function upsertToolOverride(tenantId: string, override: McpToolOverride): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".mcp_tool_overrides
     (tenant_id, tool_name, is_enabled, approval_mode, min_autonomy, max_autonomy, default_autonomy, max_calls_per_min, custom_input_schema, execution_config, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (tenant_id, tool_name) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled, approval_mode = EXCLUDED.approval_mode,
       min_autonomy = EXCLUDED.min_autonomy, max_autonomy = EXCLUDED.max_autonomy,
       default_autonomy = EXCLUDED.default_autonomy, max_calls_per_min = EXCLUDED.max_calls_per_min,
       custom_input_schema = EXCLUDED.custom_input_schema, execution_config = EXCLUDED.execution_config,
       updated_at = NOW()`,
    [tenantId, override.toolName, override.isEnabled, override.approvalMode, override.minAutonomy, override.maxAutonomy, override.defaultAutonomy, override.maxCallsPerMin, override.customInputSchema ? JSON.stringify(override.customInputSchema) : null, override.executionConfig ? JSON.stringify(override.executionConfig) : null],
  );
}

export async function deleteToolOverride(tenantId: string, toolName: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(`DELETE FROM "${schema}".mcp_tool_overrides WHERE tenant_id = $1 AND tool_name = $2`, [tenantId, toolName]);
}

function mapToolRow(row: GenericRow): McpToolDef {
  return {
    toolId: row.tool_id as string,
    toolName: row.tool_name as string,
    displayNameEn: row.display_name_en as string,
    displayNameAr: row.display_name_ar as string | null,
    descriptionEn: row.description_en as string,
    descriptionAr: row.description_ar as string | null,
    agentId: row.agent_id as string,
    ownerModuleCode: row.owner_module_code as string,
    domainCode: row.domain_code as string,
    category: row.category as string,
    executionType: row.execution_type as string,
    handlerKey: row.handler_key as string,
    providerKey: row.provider_key as string | null,
    executionConfig: (row.execution_config as Record<string, unknown>) || {},
    inputSchema: (row.input_schema as Record<string, unknown>) || {},
    outputSchema: (row.output_schema as Record<string, unknown>) || {},
    riskLevel: row.risk_level as string,
    dataClassification: (row.data_classification as string) || 'internal',
    sensitivityLevel: (row.sensitivity_level as string) || 'normal',
    requiredPermissions: (row.required_permissions as string[]) || [],
    requiredRoles: (row.required_roles as string[]) || [],
    allowedActorTypes: (row.allowed_actor_types as string[]) || [],
    approvalMode: (row.approval_mode as string) || 'none',
    approvalConfig: (row.approval_config as Record<string, unknown>) || {},
    minAutonomy: row.min_autonomy as string,
    maxAutonomy: (row.max_autonomy as string) || 'L3',
    defaultAutonomy: (row.default_autonomy as string) || 'L0',
    humanReviewOnError: row.human_review_on_error as boolean ?? true,
    humanReviewOnSensitiveData: row.human_review_on_sensitive_data as boolean ?? true,
    maxCallsPerMin: row.max_calls_per_min as number,
    status: row.status as string,
    version: row.version as number,
    tags: (row.tags as string[]) || [],
    visibilityScope: (row.visibility_scope as string) || 'all',
    isEnabled: row.is_enabled as boolean,
    isSystem: row.is_system as boolean,
    sortOrder: row.sort_order as number,
  } as McpToolDef;
}

import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// AGRC-OS — Tool Registry Service with Versioning
// Manages tool definitions, versions, and metadata
// Requirements: ai-os-8.1, ai-os-8.2
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';

export interface ToolDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  handlerPath?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  deprecatedAt?: Date;
  replacedBy?: string;
}

export interface ToolVersion {
  toolId: string;
  version: string;
  releasedAt: Date;
  changelog?: string;
  isDefault: boolean;
  isDeprecated: boolean;
}

/**
 * Register or update a tool definition
 */
export async function registerTool(
  tenantId: string,
  tool: ToolDefinition
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".tool_registry
     (id, name, version, description, category, input_schema, output_schema,
      handler_path, is_active, metadata, deprecated_at, replaced_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     ON CONFLICT (id, version) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       input_schema = EXCLUDED.input_schema,
       output_schema = EXCLUDED.output_schema,
       handler_path = EXCLUDED.handler_path,
       is_active = EXCLUDED.is_active,
       metadata = EXCLUDED.metadata,
       deprecated_at = EXCLUDED.deprecated_at,
       replaced_by = EXCLUDED.replaced_by,
       updated_at = NOW()`,
    [
      tool.id,
      tool.name,
      tool.version,
      tool.description,
      tool.category,
      JSON.stringify(tool.inputSchema),
      tool.outputSchema ? JSON.stringify(tool.outputSchema) : null,
      tool.handlerPath || null,
      tool.isActive,
      tool.metadata ? JSON.stringify(tool.metadata) : null,
      tool.deprecatedAt || null,
      tool.replacedBy || null,
    ]
  );

  // Record version
  await safeQuery(
    `INSERT INTO "${schema}".tool_versions
     (tool_id, version, released_at, changelog, is_default, is_deprecated)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tool_id, version) DO UPDATE SET
       changelog = EXCLUDED.changelog,
       is_default = EXCLUDED.is_default,
       is_deprecated = EXCLUDED.is_deprecated`,
    [
      tool.id,
      tool.version,
      tool.deprecatedAt ? tool.deprecatedAt : new Date(),
      tool.metadata?.changelog || null,
      !tool.deprecatedAt, // default if not deprecated
      !!tool.deprecatedAt,
    ]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

/**
 * Get tool definition by ID and version (or latest)
 */
export async function getTool(
  tenantId: string,
  toolId: string,
  version?: string
): Promise<ToolDefinition | null> {
  const schema = tenantSchema(tenantId);
  let query: string;
  let params: unknown[];

  if (version) {
    query = `SELECT * FROM "${schema}".tool_registry WHERE id = $1 AND version = $2 AND is_active = TRUE`;
    params = [toolId, version];
  } else {
    query = `SELECT * FROM "${schema}".tool_registry 
             WHERE id = $1 AND is_active = TRUE 
             ORDER BY version DESC LIMIT 1`;
    params = [toolId];
  }

  try {
    const result = await safeQuery(query, params);
    if (result.rows.length === 0) return null;

    const row = getFirstRow(result);
    return {
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      category: row.category,
      inputSchema: row.input_schema || {},
      outputSchema: row.output_schema || undefined,
      handlerPath: row.handler_path || undefined,
      isActive: row.is_active,
      metadata: row.metadata || undefined,
      deprecatedAt: row.deprecated_at ? new Date(row.deprecated_at) : undefined,
      replacedBy: row.replaced_by || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * List all tools (optionally filtered by category)
 */
export async function listTools(
  tenantId: string,
  category?: string,
  includeDeprecated: boolean = false
): Promise<ToolDefinition[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }

  if (!includeDeprecated) {
    conditions.push(`deprecated_at IS NULL`);
  }

  try {
    const result = await safeQuery(
      `SELECT DISTINCT ON (id) *
       FROM "${schema}".tool_registry
       WHERE ${conditions.join(' AND ')}
       ORDER BY id, version DESC`,
      params
    );

    return result.rows.map((row: GenericRow) => ({
      id: row.id,
      name: row.name,
      version: row.version,
      description: row.description,
      category: row.category,
      inputSchema: row.input_schema || {},
      outputSchema: row.output_schema || undefined,
      handlerPath: row.handler_path || undefined,
      isActive: row.is_active,
      metadata: row.metadata || undefined,
      deprecatedAt: row.deprecated_at ? new Date(row.deprecated_at) : undefined,
      replacedBy: row.replaced_by || undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Get tool versions
 */
export async function getToolVersions(
  tenantId: string,
  toolId: string
): Promise<ToolVersion[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".tool_versions
       WHERE tool_id = $1
       ORDER BY released_at DESC`,
      [toolId]
    );

    return result.rows.map((row: GenericRow) => ({
      toolId: row.tool_id,
      version: row.version,
      releasedAt: new Date(row.released_at),
      changelog: row.changelog || undefined,
      isDefault: row.is_default,
      isDeprecated: row.is_deprecated,
    }));
  } catch {
    return [];
  }
}

/**
 * Deprecate a tool version
 */
export async function deprecateToolVersion(
  tenantId: string,
  toolId: string,
  version: string,
  replacedBy?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".tool_registry
     SET deprecated_at = NOW(), replaced_by = $1, updated_at = NOW()
     WHERE id = $2 AND version = $3`,
    [replacedBy || null, toolId, version]
  );

  await safeQuery(
    `UPDATE "${schema}".tool_versions
     SET is_deprecated = TRUE, is_default = FALSE
     WHERE tool_id = $1 AND version = $2`,
    [toolId, version]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowTemplate {
  template_id: string;
  tenant_id: string | null;
  template_code: string;
  name: string;
  description: string | null;
  category: string | null;
  definition: Record<string, unknown>;
  parameters_schema: Record<string, unknown>;
  is_active: boolean;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  tenantId?: string;
  templateCode: string;
  name: string;
  description?: string;
  category?: string;
  definition: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
  createdBy?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  definition?: Record<string, unknown>;
  parametersSchema?: Record<string, unknown>;
  isActive?: boolean;
  updatedBy?: string;
}

export interface ListTemplatesInput {
  tenantId?: string;
  limit: number;
  offset: number;
  activeOnly?: boolean;
  category?: string;
}

export interface TemplateVersion {
  version_id: string;
  template_id: string;
  version: number;
  definition: Record<string, unknown>;
  parameters_schema: Record<string, unknown>;
  change_notes: string | null;
  created_by: string | null;
  created_at: string;
}

const TPL_COLUMNS = `template_id, tenant_id, template_code, name, description, category,
  definition, parameters_schema, is_active, version, created_by, updated_by, created_at, updated_at`;

const VER_COLUMNS = `version_id, template_id, version, definition, parameters_schema,
  change_notes, created_by, created_at`;

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export async function getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
  try {
    const result = await safeQuery(
      `SELECT ${TPL_COLUMNS}
       FROM dos.workflow_templates
       WHERE template_id = $1`,
      [templateId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowTemplate;
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to fetch template', { templateId, error: toErrorMessage(err) });
    return null;
  }
}

export async function getTemplateByCode(templateCode: string, tenantId?: string): Promise<WorkflowTemplate | null> {
  try {
    const conditions: string[] = ['template_code = $1'];
    const params: unknown[] = [templateCode];

    if (tenantId) {
      conditions.push('(tenant_id = $2 OR tenant_id IS NULL)');
      params.push(tenantId);
    }

    const result = await safeQuery(
      `SELECT ${TPL_COLUMNS}
       FROM dos.workflow_templates
       WHERE ${conditions.join(' AND ')}
       ORDER BY tenant_id NULLS LAST
       LIMIT 1`,
      params,
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowTemplate;
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to fetch template by code', { templateCode, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function createTemplate(input: CreateTemplateInput): Promise<WorkflowTemplate> {
  const templateId = randomUUID();
  const result = await safeQuery(
    `INSERT INTO dos.workflow_templates
       (template_id, tenant_id, template_code, name, description, category,
        definition, parameters_schema, is_active, version, created_by, updated_by,
        created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 1, $9, $9, NOW(), NOW())
     RETURNING ${TPL_COLUMNS}`,
    [
      templateId,
      input.tenantId ?? null,
      input.templateCode,
      input.name,
      input.description ?? null,
      input.category ?? null,
      input.definition,
      input.parametersSchema ?? {},
      input.createdBy ?? null,
    ],
  );
  return result.rows[0] as WorkflowTemplate;
}

export async function updateTemplate(
  templateId: string,
  updates: UpdateTemplateInput,
): Promise<WorkflowTemplate | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx}`);
    params.push(updates.name);
    idx++;
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${idx}`);
    params.push(updates.description);
    idx++;
  }
  if (updates.category !== undefined) {
    setClauses.push(`category = $${idx}`);
    params.push(updates.category);
    idx++;
  }
  if (updates.isActive !== undefined) {
    setClauses.push(`is_active = $${idx}`);
    params.push(updates.isActive);
    idx++;
  }
  if (updates.updatedBy !== undefined) {
    setClauses.push(`updated_by = $${idx}`);
    params.push(updates.updatedBy);
    idx++;
  }

  let newVersion: number | null = null;

  if (updates.definition !== undefined || updates.parametersSchema !== undefined) {
    // Definition change triggers version bump
    const current = await getTemplate(templateId);
    if (!current) return null;

    newVersion = current.version + 1;
    const newDef = updates.definition || (current.definition as Record<string, unknown>);
    const newParams = updates.parametersSchema || (current.parameters_schema as Record<string, unknown>);

    setClauses.push(`definition = $${idx}`);
    params.push(JSON.stringify(newDef));
    idx++;

    setClauses.push(`parameters_schema = $${idx}`);
    params.push(JSON.stringify(newParams));
    idx++;

    setClauses.push(`version = $${idx}`);
    params.push(newVersion);
    idx++;

    // Create version record
    await _createVersionRecord(templateId, newVersion, newDef, newParams, 'Definition updated', updates.updatedBy);
  }

  if (setClauses.length === 0) {
    return getTemplate(templateId);
  }

  setClauses.push('updated_at = NOW()');
  params.push(templateId);

  try {
    const result = await safeQuery(
      `UPDATE dos.workflow_templates SET ${setClauses.join(', ')} WHERE template_id = $${idx}`,
      params,
    );

    if ((result.rowCount || 0) === 0) {
      logger.warn('[WorkflowTemplate] Template not found for update', { templateId });
      return null;
    }

    logger.info('[WorkflowTemplate] Template updated', {
      templateId,
      fields: Object.keys(updates),
      newVersion,
    });

    return getTemplate(templateId);
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to update template', { templateId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function listTemplates(input: ListTemplatesInput): Promise<{ data: WorkflowTemplate[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.tenantId) {
    conditions.push(`(tenant_id = $${idx} OR tenant_id IS NULL)`);
    params.push(input.tenantId);
    idx++;
  }

  if (input.activeOnly !== false) {
    conditions.push('is_active = TRUE');
  }

  if (input.category) {
    conditions.push(`category = $${idx}`);
    params.push(input.category);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(input.limit, 200);
  const offset = input.offset;

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.workflow_templates ${where}`,
      params,
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${TPL_COLUMNS}
       FROM dos.workflow_templates ${where}
       ORDER BY name ASC
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as WorkflowTemplate[], total };
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to list templates', { error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

export async function deactivateTemplate(templateId: string, updatedBy?: string): Promise<WorkflowTemplate | null> {
  try {
    await safeQuery(
      `UPDATE dos.workflow_templates
       SET is_active = FALSE, updated_by = $1, updated_at = NOW()
       WHERE template_id = $2`,
      [updatedBy || null, templateId],
    );

    logger.info('[WorkflowTemplate] Template deactivated', { templateId, updatedBy });
    return getTemplate(templateId);
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to deactivate template', { templateId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function activateTemplate(templateId: string, updatedBy?: string): Promise<WorkflowTemplate | null> {
  try {
    await safeQuery(
      `UPDATE dos.workflow_templates
       SET is_active = TRUE, updated_by = $1, updated_at = NOW()
       WHERE template_id = $2`,
      [updatedBy || null, templateId],
    );

    logger.info('[WorkflowTemplate] Template activated', { templateId, updatedBy });
    return getTemplate(templateId);
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to activate template', { templateId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

async function _createVersionRecord(
  templateId: string,
  version: number,
  definition: Record<string, unknown>,
  parametersSchema: Record<string, unknown>,
  changeNotes?: string,
  createdBy?: string,
): Promise<void> {
  const versionId = randomUUID();

  try {
    await safeQuery(
      `INSERT INTO dos.workflow_template_versions
         (version_id, template_id, version, definition, parameters_schema, change_notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [versionId, templateId, version, JSON.stringify(definition), JSON.stringify(parametersSchema), changeNotes || null, createdBy || null],
    );
  } catch (err) {
    // Version table may not exist yet in early deployments — log and continue
    logger.warn('[WorkflowTemplate] Failed to create version record (table may not exist yet)', {
      templateId,
      version,
      error: toErrorMessage(err),
    });
  }
}

export async function getTemplateVersions(templateId: string): Promise<TemplateVersion[]> {
  try {
    const result = await safeQuery(
      `SELECT ${VER_COLUMNS}
       FROM dos.workflow_template_versions
       WHERE template_id = $1
       ORDER BY version DESC`,
      [templateId],
    );
    return result.rows as TemplateVersion[];
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to get template versions', { templateId, error: toErrorMessage(err) });
    return [];
  }
}

export async function getTemplateVersion(templateId: string, version: number): Promise<TemplateVersion | null> {
  try {
    const result = await safeQuery(
      `SELECT ${VER_COLUMNS}
       FROM dos.workflow_template_versions
       WHERE template_id = $1 AND version = $2`,
      [templateId, version],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as TemplateVersion;
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to get template version', { templateId, version, error: toErrorMessage(err) });
    return null;
  }
}

export async function rollbackToVersion(
  templateId: string,
  targetVersion: number,
  rolledBackBy?: string,
): Promise<WorkflowTemplate | null> {
  try {
    const versionRecord = await getTemplateVersion(templateId, targetVersion);
    if (!versionRecord) {
      logger.warn('[WorkflowTemplate] Target version not found for rollback', { templateId, targetVersion });
      return null;
    }

    const current = await getTemplate(templateId);
    if (!current) return null;

    const newVersion = current.version + 1;

    // Create a new version record for the rollback
    await _createVersionRecord(
      templateId,
      newVersion,
      versionRecord.definition,
      versionRecord.parameters_schema,
      `Rollback to version ${targetVersion}`,
      rolledBackBy,
    );

    await safeQuery(
      `UPDATE dos.workflow_templates
       SET definition = $1, parameters_schema = $2, version = $3, updated_by = $4, updated_at = NOW()
       WHERE template_id = $5`,
      [
        JSON.stringify(versionRecord.definition),
        JSON.stringify(versionRecord.parameters_schema),
        newVersion,
        rolledBackBy || null,
        templateId,
      ],
    );

    logger.info('[WorkflowTemplate] Template rolled back', { templateId, fromVersion: current.version, toVersion: targetVersion, newVersion });
    return getTemplate(templateId);
  } catch (err) {
    logger.error('[WorkflowTemplate] Failed to rollback template', { templateId, targetVersion, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers — export / import template definitions
// ---------------------------------------------------------------------------

export interface SerializedTemplate {
  templateCode: string;
  name: string;
  description: string | null;
  category: string | null;
  definition: Record<string, unknown>;
  parametersSchema: Record<string, unknown>;
  version: number;
  exportedAt: string;
}

export function serializeTemplate(template: WorkflowTemplate): SerializedTemplate {
  return {
    templateCode: template.template_code,
    name: template.name,
    description: template.description,
    category: template.category,
    definition: template.definition,
    parametersSchema: template.parameters_schema,
    version: template.version,
    exportedAt: new Date().toISOString(),
  };
}

export async function importTemplate(
  serialized: SerializedTemplate,
  tenantId?: string,
  importedBy?: string,
): Promise<WorkflowTemplate> {
  return createTemplate({
    tenantId,
    templateCode: serialized.templateCode,
    name: serialized.name,
    description: serialized.description ?? undefined,
    category: serialized.category ?? undefined,
    definition: serialized.definition,
    parametersSchema: serialized.parametersSchema,
    createdBy: importedBy,
  });
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const WorkflowTemplateService = {
  getTemplate,
  getTemplateByCode,
  createTemplate,
  updateTemplate,
  listTemplates,
  deactivateTemplate,
  activateTemplate,
  getTemplateVersions,
  getTemplateVersion,
  rollbackToVersion,
  serializeTemplate,
  importTemplate,
};

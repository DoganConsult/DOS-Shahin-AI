// ============================================
// AGRC-OS — Workflow Template CRUD Service
// Create, read, update, delete, clone, and version
// workflow templates stored in the tenant schema.
// Requirements: Patch 7 §2, MP-02
// ============================================

import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { NotFoundError, ValidationError, ConflictError } from '../../../../errors/index';
import type { GenericRow } from '../../ports/platform.port';

// ── Types ────────────────────────────────────────────────────────

/** A workflow node within a template definition. */
export interface TemplateNode {
  id: string;
  type: string;
  subType?: string;
  label_en: string;
  label_ar?: string;
  swimlane?: string;
  slaHours?: number;
  config?: Record<string, unknown>;
}

/** An edge connecting two nodes. */
export interface TemplateEdge {
  from: string;
  to: string;
  condition?: string;
  label?: string;
}

/** Full template definition structure. */
export interface TemplateDefinition {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  swimlanes: string[];
  escalationChain?: string[];
}

/** Template record as stored in the database. */
export interface WorkflowTemplate {
  template_id: string;
  tenant_id: string;
  template_code: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar?: string;
  definition: TemplateDefinition;
  version: number;
  status: 'active' | 'draft' | 'archived';
  category?: string;
  module_code?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Template version snapshot for auditing. */
export interface TemplateVersion {
  version_id: string;
  template_id: string;
  template_code: string;
  version: number;
  definition: TemplateDefinition;
  change_summary: string;
  created_by: string;
  created_at: string;
}

/** Filters for listing templates. */
export interface TemplateListFilters {
  status?: string;
  category?: string;
  moduleCode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Create ───────────────────────────────────────────────────────

/**
 * Create a new workflow template.
 * Validates the template structure and persists it to the tenant schema.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param template - Template data including definition, names, and metadata
 * @returns The created workflow template record
 */
export async function createTemplate(
  tenantId: string,
  template: {
    templateCode: string;
    nameEn: string;
    nameAr?: string;
    descriptionEn: string;
    descriptionAr?: string;
    definition: TemplateDefinition;
    category?: string;
    moduleCode?: string;
    createdBy: string;
  },
): Promise<WorkflowTemplate> {
  if (!tenantId) {
    throw new ValidationError([{ path: 'tenantId', message: 'tenantId is required' }]);
  }

  const structural = validateDefinition(template.definition);
  if (!structural.valid) {
    throw new ValidationError(
      structural.errors.map((m) => ({ path: 'definition', message: m })),
    );
  }

  const schema = tenantSchema(tenantId);

  // Reject duplicate template_code within tenant (conservative default: a
  // tenant owns one canonical row per template_code; versioning is tracked
  // by `version` + workflow_template_versions snapshots).
  const existing = await safeQuery(
    `SELECT template_id FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     LIMIT 1`,
    [template.templateCode],
  );
  if ((existing.rows?.length ?? 0) > 0) {
    throw new ConflictError(`Template code '${template.templateCode}' already exists`);
  }

  const templateId = uuid();

  const insertResult = await safeQuery(
    `INSERT INTO "${schema}".workflow_templates (
       template_id, tenant_id, template_code,
       name_en, name_ar, description_en, description_ar,
       definition, version, status, category, module_code,
       created_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'active', $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      templateId,
      tenantId,
      template.templateCode,
      template.nameEn,
      template.nameAr ?? '',
      template.descriptionEn,
      template.descriptionAr ?? '',
      JSON.stringify(template.definition),
      template.category ?? 'general',
      template.moduleCode ?? null,
      template.createdBy,
    ],
  );

  const row = getFirstRow(insertResult)!;
  if (!row) {
    // No row returned — DB write failed silently. Surface a typed error
    // rather than return a fake object.
    throw new ConflictError(`Failed to persist template '${template.templateCode}'`);
  }

  await recordVersionSnapshot(
    schema,
    templateId,
    template.templateCode,
    1,
    template.definition,
    'Initial version',
    template.createdBy,
  );

  return mapRowToTemplate(row);
}

// ── Read ─────────────────────────────────────────────────────────

/**
 * Get a single workflow template by its template code.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateCode - Unique template code within tenant
 * @returns The template record or null if not found
 */
export async function getTemplate(
  tenantId: string,
  templateCode: string,
): Promise<WorkflowTemplate | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     ORDER BY version DESC
     LIMIT 1`,
    [templateCode],
  );

  const row = getFirstRow(result)!;
  return row ? mapRowToTemplate(row) : null;
}

/**
 * Get a template by its internal ID.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateId - Internal UUID of the template
 * @returns The template record or null
 */
export async function getTemplateById(
  tenantId: string,
  templateId: string,
): Promise<WorkflowTemplate | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates WHERE template_id = $1`,
    [templateId],
  );

  const row = getFirstRow(result)!;
  return row ? mapRowToTemplate(row) : null;
}

/**
 * List workflow templates with optional filtering and pagination.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param filters - Optional filters for status, category, module, search
 * @returns List of matching template records
 */
export async function listTemplates(
  tenantId: string,
  filters: TemplateListFilters = {},
): Promise<{ items: WorkflowTemplate[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [`status != 'archived'`];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters.category) {
    conditions.push(`category = $${idx++}`);
    params.push(filters.category);
  }
  if (filters.moduleCode) {
    conditions.push(`module_code = $${idx++}`);
    params.push(filters.moduleCode);
  }
  if (filters.search) {
    conditions.push(`(name_en ILIKE $${idx} OR template_code ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".workflow_templates ${whereClause}`,
    params,
  );
  const total = getFirstRow(countResult)?.total || 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates
     ${whereClause}
     ORDER BY updated_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset],
  );

  return {
    items: dataResult.rows.map((row: GenericRow) => mapRowToTemplate(row)),
    total,
  };
}

// ── Update ───────────────────────────────────────────────────────

/**
 * Update an existing workflow template.
 * Increments the version and records a version snapshot.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateCode - The template code to update
 * @param updates - Fields to update
 * @returns The updated template record
 */
export async function updateTemplate(
  tenantId: string,
  templateCode: string,
  updates: {
    nameEn?: string;
    nameAr?: string;
    descriptionEn?: string;
    descriptionAr?: string;
    definition?: TemplateDefinition;
    category?: string;
    status?: 'active' | 'draft' | 'archived';
    updatedBy: string;
    changeSummary?: string;
  },
): Promise<WorkflowTemplate> {
  if (!tenantId) {
    throw new ValidationError([{ path: 'tenantId', message: 'tenantId is required' }]);
  }

  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT * FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     ORDER BY version DESC
     LIMIT 1`,
    [templateCode],
  );
  const currentRow = getFirstRow(current)!;
  if (!currentRow) {
    throw new NotFoundError('WorkflowTemplate', templateCode);
  }

  if (updates.definition) {
    const structural = validateDefinition(updates.definition);
    if (!structural.valid) {
      throw new ValidationError(
        structural.errors.map((m) => ({ path: 'definition', message: m })),
      );
    }
  }

  const nextVersion = (typeof currentRow.version === 'number' ? currentRow.version : 1) + 1;
  const nextDefinition = updates.definition
    ? JSON.stringify(updates.definition)
    : currentRow.definition;

  const updateResult = await safeQuery(
    `UPDATE "${schema}".workflow_templates
        SET name_en        = COALESCE($1, name_en),
            name_ar        = COALESCE($2, name_ar),
            description_en = COALESCE($3, description_en),
            description_ar = COALESCE($4, description_ar),
            definition     = $5,
            category       = COALESCE($6, category),
            status         = COALESCE($7, status),
            version        = $8,
            updated_by     = $9,
            updated_at     = NOW()
      WHERE template_code = $10 AND status != 'archived'
    RETURNING *`,
    [
      updates.nameEn ?? null,
      updates.nameAr ?? null,
      updates.descriptionEn ?? null,
      updates.descriptionAr ?? null,
      nextDefinition,
      updates.category ?? null,
      updates.status ?? null,
      nextVersion,
      updates.updatedBy,
      templateCode,
    ],
  );

  const updatedRow = getFirstRow(updateResult)!;
  if (!updatedRow) {
    // Race with archival or row vanished — surface as NotFound rather than
    // return a placeholder.
    throw new NotFoundError('WorkflowTemplate', templateCode);
  }

  const nextDefinitionParsed: TemplateDefinition = updates.definition
    ?? (typeof currentRow.definition === 'string'
      ? JSON.parse(currentRow.definition)
      : (currentRow.definition as TemplateDefinition));

  await recordVersionSnapshot(
    schema,
    updatedRow.template_id,
    templateCode,
    nextVersion,
    nextDefinitionParsed,
    updates.changeSummary ?? `Updated to v${nextVersion}`,
    updates.updatedBy,
  );

  return mapRowToTemplate(updatedRow);
}

// ── Delete (Soft) ────────────────────────────────────────────────

/**
 * Soft-delete a workflow template by setting its status to 'archived'.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateCode - The template code to archive
 * @returns True if a row was archived
 */
export async function deleteTemplate(
  tenantId: string,
  templateCode: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `UPDATE "${schema}".workflow_templates
     SET status = 'archived', updated_at = NOW()
     WHERE template_code = $1 AND status != 'archived'`,
    [templateCode],
  );

  return (result.rowCount ?? 0) > 0;
}

// ── Clone ────────────────────────────────────────────────────────

/**
 * Clone an existing template under a new template code.
 * Copies definition, names, and metadata with version reset to 1.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param sourceCode - Template code of the source to clone
 * @param newCode - Template code for the clone
 * @param clonedBy - User performing the clone
 * @returns The newly created template clone
 */
export async function cloneTemplate(
  tenantId: string,
  sourceCode: string,
  newCode: string,
  clonedBy: string,
): Promise<WorkflowTemplate> {
  if (!tenantId) {
    throw new ValidationError([{ path: 'tenantId', message: 'tenantId is required' }]);
  }

  const source = await getTemplate(tenantId, sourceCode);
  if (!source) {
    throw new NotFoundError('WorkflowTemplate', sourceCode);
  }

  const schema = tenantSchema(tenantId);

  const collision = await safeQuery(
    `SELECT template_id FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     LIMIT 1`,
    [newCode],
  );
  if ((collision.rows?.length ?? 0) > 0) {
    throw new ConflictError(`Template code '${newCode}' already exists`);
  }

  const newTemplateId = uuid();
  const cloneName = `${source.name_en} (Copy)`;

  const insertResult = await safeQuery(
    `INSERT INTO "${schema}".workflow_templates (
       template_id, tenant_id, template_code,
       name_en, name_ar, description_en, description_ar,
       definition, version, status, category, module_code,
       created_by, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'draft', $9, $10, $11, NOW(), NOW())
     RETURNING *`,
    [
      newTemplateId,
      tenantId,
      newCode,
      cloneName,
      source.name_ar,
      source.description_en,
      source.description_ar ?? '',
      JSON.stringify(source.definition),
      source.category ?? 'general',
      source.module_code ?? null,
      clonedBy,
    ],
  );

  const row = getFirstRow(insertResult)!;
  if (!row) {
    throw new ConflictError(`Failed to clone template '${sourceCode}' to '${newCode}'`);
  }

  await recordVersionSnapshot(
    schema,
    newTemplateId,
    newCode,
    1,
    source.definition,
    `Cloned from ${sourceCode}`,
    clonedBy,
  );

  return mapRowToTemplate(row);
}

// ── Version History ──────────────────────────────────────────────

/**
 * Get the version history for a template.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateCode - The template code to query versions for
 * @returns Ordered list of version snapshots (newest first)
 */
export async function getTemplateVersions(
  tenantId: string,
  templateCode: string,
): Promise<TemplateVersion[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_template_versions
     WHERE template_code = $1
     ORDER BY version DESC`,
    [templateCode],
  );

  return result.rows.map((row: GenericRow) => ({
    version_id: row.version_id,
    template_id: row.template_id,
    template_code: row.template_code,
    version: row.version,
    definition: typeof row.definition === 'string'
      ? JSON.parse(row.definition)
      : row.definition,
    change_summary: row.change_summary || '',
    created_by: row.created_by,
    created_at: row.created_at,
  }));
}

/**
 * Retrieve a specific version snapshot of a template.
 *
 * @param tenantId - Tenant identifier for schema isolation
 * @param templateCode - The template code
 * @param version - The version number to retrieve
 * @returns The version snapshot or null
 */
export async function getTemplateVersion(
  tenantId: string,
  templateCode: string,
  version: number,
): Promise<TemplateVersion | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_template_versions
     WHERE template_code = $1 AND version = $2`,
    [templateCode, version],
  );

  const row = getFirstRow(result)!;
  if (!row) return null;

  return {
    version_id: row.version_id,
    template_id: row.template_id,
    template_code: row.template_code,
    version: row.version,
    definition: typeof row.definition === 'string'
      ? JSON.parse(row.definition)
      : row.definition,
    change_summary: row.change_summary || '',
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Validate a template definition for structural correctness.
 * Checks for required start/end nodes and valid edge references.
 */
function validateDefinition(
  def: TemplateDefinition,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(def.nodes) || def.nodes.length === 0) {
    errors.push('Definition must contain at least one node');
    return { valid: false, errors };
  }
  if (!Array.isArray(def.edges)) {
    errors.push('Definition must contain an edges array');
    return { valid: false, errors };
  }

  const nodeIds = new Set(def.nodes.map(n => n.id));
  const hasStart = def.nodes.some(n => n.type === 'start');
  const hasEnd = def.nodes.some(n => n.type === 'end');

  if (!hasStart) errors.push('Definition must contain a start node');
  if (!hasEnd) errors.push('Definition must contain an end node');

  for (const edge of def.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references unknown source node: ${edge.from}`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references unknown target node: ${edge.to}`);
    }
  }

  // Check for duplicate node IDs
  if (nodeIds.size !== def.nodes.length) {
    errors.push('Duplicate node IDs detected');
  }

  return { valid: errors.length === 0, errors };
}

/** Record a version snapshot in the workflow_template_versions table. */
async function recordVersionSnapshot(
  schema: string,
  templateId: string,
  templateCode: string,
  version: number,
  definition: TemplateDefinition,
  changeSummary: string,
  createdBy: string,
): Promise<void> {
  await safeQuery(
    `INSERT INTO "${schema}".workflow_template_versions
       (version_id, template_id, template_code, version, definition,
        change_summary, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT DO NOTHING`,
    [
      uuid(), templateId, templateCode, version,
      JSON.stringify(definition), changeSummary, createdBy,
    ],
  ).catch(catchHandler(EC.EVENT_BUS, {}));
}

/** Map a database row to a typed WorkflowTemplate. */
function mapRowToTemplate(row: GenericRow): WorkflowTemplate {
  const def = row.definition;
  const parsedDef: TemplateDefinition = typeof def === 'string'
    ? JSON.parse(def)
    : (def || { nodes: [], edges: [], swimlanes: [] });

  return {
    template_id: row.template_id,
    tenant_id: row.tenant_id,
    template_code: row.template_code,
    name_en: row.name_en,
    name_ar: row.name_ar || '',
    description_en: row.description_en || '',
    description_ar: row.description_ar || '',
    definition: parsedDef,
    version: row.version || 1,
    status: row.status || 'active',
    category: row.category || undefined,
    module_code: row.module_code || undefined,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

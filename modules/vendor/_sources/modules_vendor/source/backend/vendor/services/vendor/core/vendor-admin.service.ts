// ============================================
// Shahin — Vendor Admin Config Service
// Module-level configuration management,
// assessment templates, DD workflow templates
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ============================================================
// Config CRUD
// ============================================================

/**
 * Get vendor admin configuration.
 * If configKey is provided, returns a single config row.
 * Otherwise returns all config rows.
 */
export async function getConfig(
  tenantId: string,
  configKey?: string
): Promise<GenericRow | GenericRow[]> {
  const schema = tenantSchema(tenantId);

  if (configKey) {
    return getFirstRow(await safeQuery(
      `SELECT * FROM "${schema}".vendor_admin_config WHERE config_key = $1`,
      [configKey]
    )) as GenericRow;
  }

  return (await safeQuery(
    `SELECT * FROM "${schema}".vendor_admin_config ORDER BY config_key`
  )).rows;
}

/**
 * Update (or insert) a config value. Uses UPSERT with ON CONFLICT
 * on the unique config_key constraint.
 */
export async function updateConfig(
  tenantId: string,
  configKey: string,
  configValue: unknown,
  userId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  return getFirstRow(await safeQuery(
    `INSERT INTO "${schema}".vendor_admin_config (config_key, config_value, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (config_key) DO UPDATE
       SET config_value = $2, updated_by = $3, updated_at = NOW()
     RETURNING *`,
    [configKey, JSON.stringify(configValue), userId]
  ));
}

// ============================================================
// Assessment Templates
// ============================================================

/**
 * Get all risk assessment templates from the 'assessment_templates' config key.
 * Returns the JSONB array value.
 */
export async function getAssessmentTemplates(tenantId: string): Promise<unknown[]> {
  const schema = tenantSchema(tenantId);

  const row = getFirstRow(await safeQuery(
    `SELECT config_value FROM "${schema}".vendor_admin_config WHERE config_key = 'assessment_templates'`
  ));

  if (!row?.config_value) return [];

  // config_value is JSONB, Postgres driver returns it as a parsed object
  const val = row.config_value;
  return Array.isArray(val) ? val : [];
}

/**
 * Append a new assessment template to the 'assessment_templates' JSONB array.
 * Uses jsonb_array_append pattern for atomic update.
 */
export async function createAssessmentTemplate(
  tenantId: string,
  template: Record<string, unknown>,
  userId: string
): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  // Add a generated ID and creation timestamp to the template
  const enrichedTemplate = {
    ...template,
    id: `tpl_${Date.now()}`,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };

  return getFirstRow(await safeQuery(
    `UPDATE "${schema}".vendor_admin_config
     SET config_value = COALESCE(config_value, '[]'::jsonb) || $1::jsonb,
         updated_by = $2, updated_at = NOW()
     WHERE config_key = 'assessment_templates'
     RETURNING *`,
    [JSON.stringify([enrichedTemplate]), userId]
  ));
}

// ============================================================
// DD Workflow Templates
// ============================================================

/**
 * Get the default due diligence workflow template
 * from the 'dd_workflow_default' config key.
 */
export async function getDDWorkflowTemplates(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const row = getFirstRow(await safeQuery(
    `SELECT config_value FROM "${schema}".vendor_admin_config WHERE config_key = 'dd_workflow_default'`
  ));

  return row?.config_value ?? { steps: [] };
}

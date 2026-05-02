/**
 * Tenant Workflow Configuration — Patch 7 §2.1, §AA
 *
 * Per-tenant workflow mode resolution. Tenants select their operating
 * mode; products and modules inherit and may narrow (never widen).
 *
 * Resolution chain: Tenant → Product → Module → Entity
 *
 * @owner DOS
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import type { WorkflowMode, WorkflowModeConfig } from './workflow-modes';
import { WORKFLOW_MODE_CONFIGS, isValidWorkflowMode } from './workflow-modes';

const MODE_HIERARCHY: Record<WorkflowMode, number> = {
  express: 0,
  standard: 1,
  enterprise: 2,
};

export interface TenantWorkflowOverride {
  tenantId: string;
  mode: WorkflowMode;
  productOverrides: Record<string, WorkflowMode>;
  moduleOverrides: Record<string, WorkflowMode>;
}

const tenantModeCache = new Map<string, WorkflowMode>();

export async function getTenantWorkflowMode(tenantId: string): Promise<WorkflowMode> {
  const cached = tenantModeCache.get(tenantId);
  if (cached) return cached;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT setting_value FROM "${schema}".tenant_settings
       WHERE setting_key = 'workflow_mode' AND deleted_at IS NULL
       LIMIT 1`,
      [],
    );
    const raw = result.rows[0]?.setting_value;
    if (raw && isValidWorkflowMode(raw)) {
      tenantModeCache.set(tenantId, raw);
      return raw;
    }
  } catch {
    logger.warn(`[TenantWorkflowConfig] Could not load workflow mode for tenant ${tenantId}, defaulting to standard`);
  }

  tenantModeCache.set(tenantId, 'standard');
  return 'standard';
}

export function resolveEffectiveMode(
  tenantMode: WorkflowMode,
  productMode?: WorkflowMode,
  moduleMode?: WorkflowMode,
): WorkflowMode {
  let effective = tenantMode;

  if (productMode && MODE_HIERARCHY[productMode] <= MODE_HIERARCHY[tenantMode]) {
    effective = productMode;
  }

  if (moduleMode && MODE_HIERARCHY[moduleMode] >= MODE_HIERARCHY[effective]) {
    effective = moduleMode;
  }

  return effective;
}

export function resolveEffectiveModeConfig(
  tenantMode: WorkflowMode,
  productMode?: WorkflowMode,
  moduleMode?: WorkflowMode,
): WorkflowModeConfig {
  const mode = resolveEffectiveMode(tenantMode, productMode, moduleMode);
  return WORKFLOW_MODE_CONFIGS[mode];
}

export function clearTenantModeCache(tenantId?: string): void {
  if (tenantId) {
    tenantModeCache.delete(tenantId);
  } else {
    tenantModeCache.clear();
  }
}

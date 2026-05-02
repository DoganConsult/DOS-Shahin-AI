// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getAssetById } from '../../runtime/ai/registry/ai-asset-inventory.service';
import {
  type ApprovalStatus,
  type DeploymentStatus,
  VALID_APPROVAL,
  VALID_DEPLOYMENT,
  ARCHIVED_LIFECYCLE as _ARCHIVED_LIFECYCLE,
  assertNotSeededGlobalMutation,
  assertOwnershipPresent as _assertOwnershipPresent,
  assertOneActiveVersion,
  assertParentAssetValid,
  assertSoDCompliance,
  emitRegistryAudit,
  nextRegistryVersionNumber,
  validateSubmitTransition,
  validateApproveTransition,
  validateRejectTransition,
  validateActivatePreConditions,
  validateSuspendPreConditions,
  validateRetirePreConditions,
  validateRollbackTarget,
  validateDeletePreConditions,
  validateParentForActivation,
  validateParentForRollback,
} from '../ai-governance-lifecycle.service';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export type { ApprovalStatus, DeploymentStatus };

export interface ModelVersion {
  model_version_id: string;
  asset_id: string;
  version_number: number;
  provider: string;
  provider_model_id: string;
  config: Record<string, unknown>;
  approval_status: ApprovalStatus;
  deployment_status: DeploymentStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  rollback_from_version_id: string | null;
  change_summary: string | null;
  notes: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDraftInput {
  asset_id: string;
  provider: string;
  provider_model_id: string;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateDraftInput {
  provider?: string;
  provider_model_id?: string;
  config?: Record<string, unknown>;
  change_summary?: string;
  notes?: string;
  updated_by?: string;
}

export interface VersionQuery {
  asset_id?: string;
  approval_status?: ApprovalStatus;
  deployment_status?: DeploymentStatus;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

const AUDIT_MODULE = 'ai-model-registry';
const AUDIT_ENTITY_TYPE = 'model_version';
const TABLE_NAME = 'ai_model_registry';
const VERSION_ID_COL = 'model_version_id';
const ASSET_TYPE_LABEL = 'model';

async function emitAudit(
  tenantId: string,
  userId: string,
  action: string,
  entityId: string,
  beforeState?: any,
  afterState?: any,
): Promise<void> {
  return emitRegistryAudit(tenantId, userId, action, entityId, AUDIT_MODULE, AUDIT_ENTITY_TYPE, beforeState, afterState);
}

async function nextVersionNumber(schema: string, assetId: string): Promise<number> {
  return nextRegistryVersionNumber(schema, TABLE_NAME, assetId);
}

async function getVersionRow(schema: string, versionId: string): Promise<ModelVersion | null> {
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ai_model_registry WHERE model_version_id = $1`,
    [versionId],
  );
  return (getFirstRow(result) as ModelVersion) || null;
}

export async function createDraftModelVersion(
  tenantId: string,
  input: CreateDraftInput,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function updateDraftModelVersion(
  tenantId: string,
  versionId: string,
  input: UpdateDraftInput,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function submitModelVersionForApproval(
  tenantId: string,
  versionId: string,
  submittedBy: string,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function approveModelVersion(
  tenantId: string,
  versionId: string,
  approvedBy: string,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function rejectModelVersion(
  tenantId: string,
  versionId: string,
  rejectedBy: string,
  notes?: string,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function activateModelVersion(
  tenantId: string,
  versionId: string,
  activatedBy: string,
): Promise<{ activated: ModelVersion; deactivated: ModelVersion | null }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function suspendModelVersion(
  tenantId: string,
  versionId: string,
  suspendedBy: string,
  notes?: string,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function retireModelVersion(
  tenantId: string,
  versionId: string,
  retiredBy: string,
  notes?: string,
): Promise<ModelVersion> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function rollbackModelVersion(
  tenantId: string,
  assetId: string,
  targetVersionId: string,
  rolledBackBy: string,
  notes?: string,
): Promise<{ activated: ModelVersion; deactivated: ModelVersion | null; rollbackVersion: ModelVersion }> {
  const schema = tenantSchema(tenantId);

  const target = await getVersionRow(schema, targetVersionId);
  validateRollbackTarget((target as any), assetId, ASSET_TYPE_LABEL);

  await validateParentForRollback(tenantId, assetId, ASSET_TYPE_LABEL);

  const nextVer = await nextVersionNumber(schema, assetId);

  const insertResult = await safeQuery(
    `INSERT INTO "${schema}".ai_model_registry
       (asset_id, version_number, provider, provider_model_id, config,
        approval_status, deployment_status, is_active, rollback_from_version_id,
        change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', 'inactive', FALSE, $6, $7, $8, $9)
     RETURNING *`,
    [
      assetId,
      nextVer,
      target.provider!,
      target.provider_model_id!,
      JSON.stringify(target.config! || {}),
      targetVersionId,
      `Rollback to version ${target.version_number!}`,
      notes || null,
      rolledBackBy,
    ],
  );
  const rollbackVersion = getFirstRow(insertResult) as ModelVersion;

  const { activated, deactivated } = await activateModelVersion(tenantId, rollbackVersion.model_version_id, rolledBackBy);

  await emitAudit(tenantId, rolledBackBy, 'update', rollbackVersion.model_version_id,
    { rollback_from_version_id: targetVersionId, source_version_number: target.version_number! },
    {
      deployment_status: 'active',
      version_number: rollbackVersion.version_number,
      rollback_from_version_id: targetVersionId,
      deactivated_version: deactivated?.model_version_id || null,
    },
  );

  return { activated, deactivated, rollbackVersion };
}

export async function listModelVersions(
  tenantId: string,
  q: VersionQuery = {},
): Promise<{ versions: ModelVersion[]; total: number }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getModelVersionById(
  tenantId: string,
  versionId: string,
): Promise<ModelVersion | null> {
  const schema = tenantSchema(tenantId);
  return getVersionRow(schema, versionId);
}

export async function getActiveModelVersionForAsset(
  tenantId: string,
  assetId: string,
): Promise<ModelVersion | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".ai_model_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`,
    [assetId],
  );
  return (getFirstRow(result) as ModelVersion) || null;
}

export async function deleteModelVersion(
  tenantId: string,
  versionId: string,
  deletedBy?: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const existing = await getVersionRow(schema, versionId);
  if (!existing) return false;

  validateDeletePreConditions(existing.is_active);

  const parentForSeeded = await getAssetById(tenantId, existing.asset_id);
  assertNotSeededGlobalMutation((parentForSeeded as any), ASSET_TYPE_LABEL, 'delete');

  const result = await safeQuery(
    `DELETE FROM "${schema}".ai_model_registry WHERE model_version_id = $1`,
    [versionId],
  );
  const deleted = (result.rowCount ?? 0) > 0;

  if (deleted) {
    await emitAudit(tenantId, deletedBy || SYSTEM_JOB_ACTOR, 'delete', versionId,
      { version_number: existing.version_number, provider: existing.provider, approval_status: existing.approval_status },
      null,
    );
  }

  return deleted;
}

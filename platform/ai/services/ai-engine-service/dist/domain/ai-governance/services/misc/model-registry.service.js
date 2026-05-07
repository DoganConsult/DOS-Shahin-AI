// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { getAssetById } from '../../runtime/ai/registry/ai-asset-inventory.service.js';
import { assertNotSeededGlobalMutation, emitRegistryAudit, nextRegistryVersionNumber, validateRollbackTarget, validateDeletePreConditions, validateParentForRollback, } from '../ai-governance-lifecycle.service.js';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port.js';
const AUDIT_MODULE = 'ai-model-registry';
const AUDIT_ENTITY_TYPE = 'model_version';
const TABLE_NAME = 'ai_model_registry';
const VERSION_ID_COL = 'model_version_id';
const ASSET_TYPE_LABEL = 'model';
async function emitAudit(tenantId, userId, action, entityId, beforeState, afterState) {
    return emitRegistryAudit(tenantId, userId, action, entityId, AUDIT_MODULE, AUDIT_ENTITY_TYPE, beforeState, afterState);
}
async function nextVersionNumber(schema, assetId) {
    return nextRegistryVersionNumber(schema, TABLE_NAME, assetId);
}
async function getVersionRow(schema, versionId) {
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_model_registry WHERE model_version_id = $1`, [versionId]);
    return getFirstRow(result) || null;
}
export async function createDraftModelVersion(tenantId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function updateDraftModelVersion(tenantId, versionId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function submitModelVersionForApproval(tenantId, versionId, submittedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function approveModelVersion(tenantId, versionId, approvedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function rejectModelVersion(tenantId, versionId, rejectedBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function activateModelVersion(tenantId, versionId, activatedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function suspendModelVersion(tenantId, versionId, suspendedBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function retireModelVersion(tenantId, versionId, retiredBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function rollbackModelVersion(tenantId, assetId, targetVersionId, rolledBackBy, notes) {
    const schema = tenantSchema(tenantId);
    const target = await getVersionRow(schema, targetVersionId);
    validateRollbackTarget(target, assetId, ASSET_TYPE_LABEL);
    await validateParentForRollback(tenantId, assetId, ASSET_TYPE_LABEL);
    const nextVer = await nextVersionNumber(schema, assetId);
    const insertResult = await safeQuery(`INSERT INTO "${schema}".ai_model_registry
       (asset_id, version_number, provider, provider_model_id, config,
        approval_status, deployment_status, is_active, rollback_from_version_id,
        change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', 'inactive', FALSE, $6, $7, $8, $9)
     RETURNING *`, [
        assetId,
        nextVer,
        target.provider,
        target.provider_model_id,
        JSON.stringify(target.config || {}),
        targetVersionId,
        `Rollback to version ${target.version_number}`,
        notes || null,
        rolledBackBy,
    ]);
    const rollbackVersion = getFirstRow(insertResult);
    const { activated, deactivated } = await activateModelVersion(tenantId, rollbackVersion.model_version_id, rolledBackBy);
    await emitAudit(tenantId, rolledBackBy, 'update', rollbackVersion.model_version_id, { rollback_from_version_id: targetVersionId, source_version_number: target.version_number }, {
        deployment_status: 'active',
        version_number: rollbackVersion.version_number,
        rollback_from_version_id: targetVersionId,
        deactivated_version: deactivated?.model_version_id || null,
    });
    return { activated, deactivated, rollbackVersion };
}
export async function listModelVersions(tenantId, q = {}) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function getModelVersionById(tenantId, versionId) {
    const schema = tenantSchema(tenantId);
    return getVersionRow(schema, versionId);
}
export async function getActiveModelVersionForAsset(tenantId, assetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_model_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`, [assetId]);
    return getFirstRow(result) || null;
}
export async function deleteModelVersion(tenantId, versionId, deletedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        return false;
    validateDeletePreConditions(existing.is_active);
    const parentForSeeded = await getAssetById(tenantId, existing.asset_id);
    assertNotSeededGlobalMutation(parentForSeeded, ASSET_TYPE_LABEL, 'delete');
    const result = await safeQuery(`DELETE FROM "${schema}".ai_model_registry WHERE model_version_id = $1`, [versionId]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
        await emitAudit(tenantId, deletedBy || SYSTEM_JOB_ACTOR, 'delete', versionId, { version_number: existing.version_number, provider: existing.provider, approval_status: existing.approval_status }, null);
    }
    return deleted;
}
//# sourceMappingURL=model-registry.service.js.map
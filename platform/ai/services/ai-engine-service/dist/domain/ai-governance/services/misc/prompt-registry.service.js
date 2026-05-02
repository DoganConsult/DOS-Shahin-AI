// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { getAssetById, getAssetByKey } from '../../runtime/ai/registry/ai-asset-inventory.service.js';
import { assertNotSeededGlobalMutation, assertLinkedAssetValid, assertParentAssetValid, emitRegistryAudit, nextRegistryVersionNumber, validateRollbackTarget, validateDeletePreConditions, validateParentForRollback, } from '../ai-governance-lifecycle.service.js';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port.js';
const AUDIT_MODULE = 'ai-prompt-registry';
const AUDIT_ENTITY_TYPE = 'prompt_version';
const TABLE_NAME = 'ai_prompt_registry';
const VERSION_ID_COL = 'prompt_version_id';
const ASSET_TYPE_LABEL = 'prompt';
async function emitAudit(tenantId, userId, action, entityId, beforeState, afterState) {
    return emitRegistryAudit(tenantId, userId, action, entityId, AUDIT_MODULE, AUDIT_ENTITY_TYPE, beforeState, afterState);
}
async function nextVersionNumber(schema, assetId) {
    return nextRegistryVersionNumber(schema, TABLE_NAME, assetId);
}
async function loadParentPromptAsset(tenantId, assetId) {
    return assertParentAssetValid(tenantId, assetId, ASSET_TYPE_LABEL);
}
async function assertLinkedModelValid(tenantId, linkedId) {
    return assertLinkedAssetValid(tenantId, linkedId, 'model', 'model');
}
async function getVersionRow(schema, versionId) {
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_prompt_registry WHERE prompt_version_id = $1`, [versionId]);
    return getFirstRow(result) || null;
}
async function getPreviousVersion(schema, assetId, currentVersionNum) {
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_prompt_registry
     WHERE asset_id = $1 AND version_number < $2
     ORDER BY version_number DESC LIMIT 1`, [assetId, currentVersionNum]);
    return getFirstRow(result) || null;
}
export function computeDiffSummary(prevText, newText, prevVars, newVars) {
    const parts = [];
    if (prevText === null) {
        parts.push('Initial version');
    }
    else if (prevText !== newText) {
        const prevLines = prevText.split('\n');
        const newLines = newText.split('\n');
        let added = 0;
        let removed = 0;
        const maxLen = Math.max(prevLines.length, newLines.length);
        for (let i = 0; i < maxLen; i++) {
            if (i >= prevLines.length) {
                added++;
                continue;
            }
            if (i >= newLines.length) {
                removed++;
                continue;
            }
            if (prevLines[i] !== newLines[i]) {
                added++;
                removed++;
            }
        }
        const totalChanged = added + removed;
        parts.push(`Template: ${totalChanged} line(s) changed (+${added} -${removed})`);
        if (prevText.length !== newText.length) {
            const delta = newText.length - prevText.length;
            parts.push(`Length: ${prevText.length} → ${newText.length} (${delta > 0 ? '+' : ''}${delta} chars)`);
        }
    }
    const prevVarNames = (prevVars || []).map((v) => (typeof v === 'string' ? v : v.name)).sort();
    const newVarNames = newVars.map((v) => (typeof v === 'string' ? v : v.name)).sort();
    const addedVars = newVarNames.filter((n) => !prevVarNames.includes(n));
    const removedVars = prevVarNames.filter((n) => !newVarNames.includes(n));
    if (addedVars.length > 0)
        parts.push(`Variables added: ${addedVars.join(', ')}`);
    if (removedVars.length > 0)
        parts.push(`Variables removed: ${removedVars.join(', ')}`);
    if (parts.length === 0 && prevText !== null) {
        parts.push('No content changes');
    }
    return parts.join('; ');
}
export async function createDraftPromptVersion(tenantId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function updateDraftPromptVersion(tenantId, versionId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function submitPromptVersionForApproval(tenantId, versionId, submittedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function approvePromptVersion(tenantId, versionId, approvedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function rejectPromptVersion(tenantId, versionId, rejectedBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function activatePromptVersion(tenantId, versionId, activatedBy) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function suspendPromptVersion(tenantId, versionId, suspendedBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function retirePromptVersion(tenantId, versionId, retiredBy, notes) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function rollbackPromptVersion(tenantId, assetId, targetVersionId, rolledBackBy, notes) {
    const schema = tenantSchema(tenantId);
    const target = await getVersionRow(schema, targetVersionId);
    validateRollbackTarget(target, assetId, ASSET_TYPE_LABEL);
    await validateParentForRollback(tenantId, assetId, ASSET_TYPE_LABEL);
    if (target.linked_model_asset_id) {
        await assertLinkedModelValid(tenantId, target.linked_model_asset_id);
    }
    const nextVer = await nextVersionNumber(schema, assetId);
    const prev = await getPreviousVersion(schema, assetId, nextVer);
    const diffSummary = computeDiffSummary(prev?.template_text || null, target.template_text, prev?.variables || null, target.variables || []);
    const insertResult = await safeQuery(`INSERT INTO "${schema}".ai_prompt_registry
       (asset_id, version_number, template_text, variables, linked_model_asset_id,
        approval_status, deployment_status, is_active, rollback_from_version_id,
        diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, 'approved', 'inactive', FALSE, $6, $7, $8, $9, $10)
     RETURNING *`, [
        assetId,
        nextVer,
        target.template_text,
        JSON.stringify(target.variables || []),
        target.linked_model_asset_id || null,
        targetVersionId,
        diffSummary,
        `Rollback to version ${target.version_number}`,
        notes || null,
        rolledBackBy,
    ]);
    const rollbackVersion = getFirstRow(insertResult);
    const { activated, deactivated } = await activatePromptVersion(tenantId, rollbackVersion.prompt_version_id, rolledBackBy);
    await emitAudit(tenantId, rolledBackBy, 'update', rollbackVersion.prompt_version_id, { rollback_from_version_id: targetVersionId, source_version_number: target.version_number }, {
        deployment_status: 'active',
        version_number: rollbackVersion.version_number,
        rollback_from_version_id: targetVersionId,
        deactivated_version: deactivated?.prompt_version_id || null,
    });
    return { activated, deactivated, rollbackVersion };
}
export async function listPromptVersions(tenantId, q = {}) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function getPromptVersionById(tenantId, versionId) {
    const schema = tenantSchema(tenantId);
    return getVersionRow(schema, versionId);
}
export async function getActivePromptVersionForAsset(tenantId, assetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_prompt_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`, [assetId]);
    return getFirstRow(result) || null;
}
export async function resolveActivePromptForAgent(tenantId, agentKey) {
    const asset = await getAssetByKey(tenantId, 'prompt', agentKey);
    if (!asset)
        return null;
    return getActivePromptVersionForAsset(tenantId, asset.asset_id);
}
export async function deletePromptVersion(tenantId, versionId, deletedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        return false;
    validateDeletePreConditions(existing.is_active);
    const parentForSeeded = await getAssetById(tenantId, existing.asset_id);
    assertNotSeededGlobalMutation(parentForSeeded, ASSET_TYPE_LABEL, 'delete');
    const result = await safeQuery(`DELETE FROM "${schema}".ai_prompt_registry WHERE prompt_version_id = $1`, [versionId]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
        await emitAudit(tenantId, deletedBy || SYSTEM_JOB_ACTOR, 'delete', versionId, { version_number: existing.version_number, template_text_length: existing.template_text.length, approval_status: existing.approval_status }, null);
    }
    return deleted;
}
//# sourceMappingURL=prompt-registry.service.js.map
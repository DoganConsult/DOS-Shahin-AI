// @ts-nocheck
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../ports/database.port';
import { getAssetById, getAssetByKey } from '../../../../../domain/ai-governance/services/ai/registry/ai-asset-inventory.service';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { ServiceError, NotFoundError } from '../../../../../errors';
import { emitRegistryAudit, nextRegistryVersionNumber } from '../../../../../domain/ai-governance/services/ai-governance-lifecycle.service';
const AUDIT_MODULE = 'ai-agent-registry';
const AUDIT_ENTITY_TYPE = 'agent_version';
const TABLE_NAME = 'ai_agent_registry';
const VERSION_ID_COL = 'agent_version_id';
const ASSET_TYPE_LABEL = 'agent';
function must(condition, status, code, message, details) {
    if (condition)
        return;
    throw new ServiceError({ status, code, message, details });
}
async function emitAudit(tenantId, userId, action, entityId, beforeState, afterState) {
    return emitRegistryAudit(tenantId, userId, action, entityId, AUDIT_MODULE, AUDIT_ENTITY_TYPE, beforeState, afterState);
}
async function nextVersionNumber(schema, assetId) {
    return nextRegistryVersionNumber(schema, TABLE_NAME, assetId);
}
async function getVersionRow(schema, versionId) {
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_registry WHERE agent_version_id = $1 LIMIT 1`, [versionId]);
    return result.rows[0] || null;
}
async function getPreviousVersion(schema, assetId, nextVersionNumber) {
    const prevVer = Math.max(0, nextVersionNumber - 1);
    if (prevVer <= 0)
        return null;
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_registry WHERE asset_id = $1 AND version_number = $2 LIMIT 1`, [assetId, prevVer]);
    return result.rows[0] || null;
}
function computeAgentDiffSummary(prev, agentConfig, capabilities, linkedPromptAssetId, linkedModelAssetId) {
    if (!prev)
        return 'Initial version';
    const diffs = [];
    const prevCfg = JSON.stringify(prev.agent_config || {});
    const nextCfg = JSON.stringify(agentConfig || {});
    if (prevCfg !== nextCfg)
        diffs.push('config_changed');
    const prevCaps = JSON.stringify(prev.capabilities || []);
    const nextCaps = JSON.stringify(capabilities || []);
    if (prevCaps !== nextCaps)
        diffs.push('capabilities_changed');
    if ((prev.linked_prompt_asset_id || null) !== (linkedPromptAssetId || null))
        diffs.push('linked_prompt_changed');
    if ((prev.linked_model_asset_id || null) !== (linkedModelAssetId || null))
        diffs.push('linked_model_changed');
    return diffs.length > 0 ? diffs.join(',') : 'no_change';
}
async function assertParentAsset(tenantId, assetId) {
    const asset = await getAssetById(tenantId, assetId);
    if (!asset)
        throw new NotFoundError('AI asset', assetId);
    must(asset.asset_type === 'agent', 422, 'INVALID_PARENT_ASSET', 'Parent asset must be asset_type=agent', {
        assetId,
        asset_type: asset.asset_type,
    });
    must(asset.status !== 'disabled', 422, 'ASSET_DISABLED', 'Parent asset is disabled', { assetId });
    return asset;
}
async function assertLinkedAsset(tenantId, assetId, expectedType, label) {
    const linked = await getAssetById(tenantId, assetId);
    must(Boolean(linked), 422, 'LINKED_ASSET_NOT_FOUND', `Linked ${label} asset not found`, { assetId });
    must(linked.asset_type === expectedType, 422, 'INVALID_LINKED_ASSET', `Linked ${label} must be asset_type=${expectedType}`, {
        assetId,
        asset_type: linked.asset_type,
    });
}
export async function createDraftAgentVersion(tenantId, input) {
    const schema = tenantSchema(tenantId);
    const typed = input;
    must(Boolean(typed.asset_id), 400, 'VALIDATION_ERROR', 'asset_id is required');
    must(Boolean(typed.agent_config), 400, 'VALIDATION_ERROR', 'agent_config is required');
    const createdBy = typed.created_by || SYSTEM_JOB_ACTOR;
    await assertParentAsset(tenantId, typed.asset_id);
    if (typed.linked_prompt_asset_id)
        await assertLinkedAsset(tenantId, typed.linked_prompt_asset_id, 'prompt', 'prompt');
    if (typed.linked_model_asset_id)
        await assertLinkedAsset(tenantId, typed.linked_model_asset_id, 'model', 'model');
    const nextVer = await nextVersionNumber(schema, typed.asset_id);
    const prev = await getPreviousVersion(schema, typed.asset_id, nextVer);
    const diffSummary = computeAgentDiffSummary(prev, typed.agent_config || {}, typed.capabilities || [], typed.linked_prompt_asset_id || null, typed.linked_model_asset_id || null);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_agent_registry
       (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
        capabilities, approval_status, deployment_status, is_active,
        diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', 'not_deployed', FALSE, $7, $8, $9, $10)
     RETURNING *`, [
        typed.asset_id,
        nextVer,
        JSON.stringify(typed.agent_config || {}),
        typed.linked_prompt_asset_id || null,
        typed.linked_model_asset_id || null,
        JSON.stringify(typed.capabilities || []),
        diffSummary,
        typed.change_summary || null,
        typed.notes || null,
        createdBy,
    ]);
    const row = result.rows[0];
    await emitAudit(tenantId, createdBy, 'create', row.agent_version_id, null, { asset_id: row.asset_id, version_number: row.version_number });
    return row;
}
export async function updateDraftAgentVersion(tenantId, versionId, input) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.approval_status === 'draft', 422, 'INVALID_STATE', 'Only draft versions can be updated', {
        approval_status: existing.approval_status,
    });
    must(existing.is_active !== true, 422, 'INVALID_STATE', 'Cannot update an active version');
    if (input.linked_prompt_asset_id)
        await assertLinkedAsset(tenantId, input.linked_prompt_asset_id, 'prompt', 'prompt');
    if (input.linked_model_asset_id)
        await assertLinkedAsset(tenantId, input.linked_model_asset_id, 'model', 'model');
    const nextCfg = input.agent_config ?? existing.agent_config ?? {};
    const nextCaps = input.capabilities ?? existing.capabilities ?? [];
    const nextPrompt = input.linked_prompt_asset_id === undefined ? existing.linked_prompt_asset_id : input.linked_prompt_asset_id;
    const nextModel = input.linked_model_asset_id === undefined ? existing.linked_model_asset_id : input.linked_model_asset_id;
    const prev = await getPreviousVersion(schema, existing.asset_id, existing.version_number);
    const diffSummary = computeAgentDiffSummary(prev, nextCfg, nextCaps, nextPrompt, nextModel);
    const updatedBy = input.updated_by || SYSTEM_JOB_ACTOR;
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET agent_config = $1,
            linked_prompt_asset_id = $2,
            linked_model_asset_id = $3,
            capabilities = $4,
            diff_summary = $5,
            change_summary = COALESCE($6, change_summary),
            notes = COALESCE($7, notes),
            updated_by = $8,
            updated_at = NOW()
      WHERE agent_version_id = $9
      RETURNING *`, [
        JSON.stringify(nextCfg),
        nextPrompt ?? null,
        nextModel ?? null,
        JSON.stringify(nextCaps),
        diffSummary,
        input.change_summary ?? null,
        input.notes ?? null,
        updatedBy,
        versionId,
    ]);
    const row = result.rows[0];
    await emitAudit(tenantId, updatedBy, 'update', versionId, { approval_status: existing.approval_status }, { approval_status: row.approval_status, diff_summary: row.diff_summary });
    return row;
}
export async function submitAgentVersionForApproval(tenantId, versionId, submittedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.approval_status === 'draft', 422, 'INVALID_STATE', 'Only draft versions can be submitted', { approval_status: existing.approval_status });
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET approval_status = 'submitted',
            submitted_by = $1,
            submitted_at = NOW(),
            updated_by = $1,
            updated_at = NOW()
      WHERE agent_version_id = $2
      RETURNING *`, [submittedBy, versionId]);
    const row = result.rows[0];
    await emitAudit(tenantId, submittedBy, 'update', versionId, { approval_status: existing.approval_status }, { approval_status: row.approval_status });
    return row;
}
export async function approveAgentVersion(tenantId, versionId, approvedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.approval_status === 'submitted' || existing.approval_status === 'under_review', 422, 'INVALID_STATE', 'Only submitted/under_review versions can be approved', { approval_status: existing.approval_status });
    must(existing.created_by !== approvedBy, 403, 'SOD_VIOLATION', 'Creator cannot approve their own agent version', { created_by: existing.created_by });
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET approval_status = 'approved',
            approved_by = $1,
            approved_at = NOW(),
            updated_by = $1,
            updated_at = NOW()
      WHERE agent_version_id = $2
      RETURNING *`, [approvedBy, versionId]);
    const row = result.rows[0];
    await emitAudit(tenantId, approvedBy, 'update', versionId, { approval_status: existing.approval_status }, { approval_status: row.approval_status });
    return row;
}
export async function rejectAgentVersion(tenantId, versionId, rejectedBy, notes) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.approval_status === 'submitted' || existing.approval_status === 'under_review', 422, 'INVALID_STATE', 'Only submitted/under_review versions can be rejected', { approval_status: existing.approval_status });
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET approval_status = 'rejected',
            notes = COALESCE($1, notes),
            updated_by = $2,
            updated_at = NOW()
      WHERE agent_version_id = $3
      RETURNING *`, [notes || null, rejectedBy, versionId]);
    const row = result.rows[0];
    await emitAudit(tenantId, rejectedBy, 'update', versionId, { approval_status: existing.approval_status }, { approval_status: row.approval_status });
    return row;
}
export async function activateAgentVersion(tenantId, versionId, activatedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.approval_status === 'approved', 422, 'INVALID_STATE', 'Only approved versions can be activated', { approval_status: existing.approval_status });
    await assertParentAsset(tenantId, existing.asset_id);
    if (existing.linked_prompt_asset_id)
        await assertLinkedAsset(tenantId, existing.linked_prompt_asset_id, 'prompt', 'prompt');
    if (existing.linked_model_asset_id)
        await assertLinkedAsset(tenantId, existing.linked_model_asset_id, 'model', 'model');
    return withTransaction(async (client) => {
        const activeRes = await safeQueryWithClient(`SELECT * FROM "${schema}".ai_agent_registry WHERE asset_id = $1 AND is_active = TRUE LIMIT 1`, [existing.asset_id], client);
        const currentActive = activeRes.rows[0] || null;
        let deactivated = null;
        if (currentActive && currentActive.agent_version_id !== versionId) {
            const deactRes = await safeQueryWithClient(`UPDATE "${schema}".ai_agent_registry
            SET is_active = FALSE,
                deployment_status = 'rollback',
                updated_by = $1,
                updated_at = NOW()
          WHERE agent_version_id = $2
          RETURNING *`, [activatedBy, currentActive.agent_version_id], client);
            deactivated = deactRes.rows[0] || null;
        }
        const actRes = await safeQueryWithClient(`UPDATE "${schema}".ai_agent_registry
          SET is_active = TRUE,
              deployment_status = 'production',
              updated_by = $1,
              updated_at = NOW()
        WHERE agent_version_id = $2
        RETURNING *`, [activatedBy, versionId], client);
        const activated = actRes.rows[0];
        await emitAudit(tenantId, activatedBy, 'update', versionId, { was_active: existing.is_active, prev_active_version: currentActive?.agent_version_id || null }, { is_active: activated.is_active, deactivated_version: deactivated?.agent_version_id || null });
        return { activated, deactivated };
    });
}
export async function suspendAgentVersion(tenantId, versionId, suspendedBy, notes) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.is_active === true, 422, 'INVALID_STATE', 'Only active versions can be suspended');
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET approval_status = 'suspended',
            is_active = FALSE,
            deployment_status = 'decommissioned',
            notes = COALESCE($1, notes),
            updated_by = $2,
            updated_at = NOW()
      WHERE agent_version_id = $3
      RETURNING *`, [notes || null, suspendedBy, versionId]);
    const row = result.rows[0];
    await emitAudit(tenantId, suspendedBy, 'update', versionId, { approval_status: existing.approval_status, is_active: existing.is_active }, { approval_status: row.approval_status, is_active: row.is_active });
    return row;
}
export async function retireAgentVersion(tenantId, versionId, retiredBy, notes) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        throw new NotFoundError('Agent version', versionId);
    must(existing.is_active !== true, 422, 'INVALID_STATE', 'Cannot retire an active version');
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_registry
        SET approval_status = 'retired',
            deployment_status = 'decommissioned',
            notes = COALESCE($1, notes),
            updated_by = $2,
            updated_at = NOW()
      WHERE agent_version_id = $3
      RETURNING *`, [notes || null, retiredBy, versionId]);
    const row = result.rows[0];
    await emitAudit(tenantId, retiredBy, 'update', versionId, { approval_status: existing.approval_status }, { approval_status: row.approval_status });
    return row;
}
export async function rollbackAgentVersion(tenantId, assetId, targetVersionId, rolledBackBy, notes) {
    const schema = tenantSchema(tenantId);
    const target = await getVersionRow(schema, targetVersionId);
    must(Boolean(target), 404, 'NOT_FOUND', 'Target version not found', { targetVersionId });
    must(target.asset_id === assetId, 422, 'INVALID_TARGET', 'Target version does not belong to asset', { assetId, targetAssetId: target.asset_id });
    must(target.approval_status === 'approved' || target.approval_status === 'suspended' || target.approval_status === 'retired', 422, 'INVALID_TARGET', 'Target version is not eligible for rollback', { approval_status: target.approval_status });
    await assertParentAsset(tenantId, assetId);
    if (target.linked_prompt_asset_id) {
        await assertLinkedAsset(tenantId, target.linked_prompt_asset_id, 'prompt', 'prompt');
    }
    if (target.linked_model_asset_id) {
        await assertLinkedAsset(tenantId, target.linked_model_asset_id, 'model', 'model');
    }
    const nextVer = await nextVersionNumber(schema, assetId);
    const prev = await getPreviousVersion(schema, assetId, nextVer);
    const diffSummary = computeAgentDiffSummary(prev, target.agent_config || {}, target.capabilities || [], target.linked_prompt_asset_id || null, target.linked_model_asset_id || null);
    const insertResult = await safeQuery(`INSERT INTO "${schema}".ai_agent_registry
       (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
        capabilities, approval_status, deployment_status, is_active, rollback_from_version_id,
        diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'rollback', FALSE, $7, $8, $9, $10, $11)
     RETURNING *`, [
        assetId,
        nextVer,
        JSON.stringify(target.agent_config || {}),
        target.linked_prompt_asset_id || null,
        target.linked_model_asset_id || null,
        JSON.stringify(target.capabilities || []),
        targetVersionId,
        diffSummary,
        `Rollback to version ${target.version_number}`,
        notes || null,
        rolledBackBy,
    ]);
    const rollbackVersion = insertResult.rows[0];
    const { activated, deactivated } = await activateAgentVersion(tenantId, rollbackVersion.agent_version_id, rolledBackBy);
    await emitAudit(tenantId, rolledBackBy, 'update', rollbackVersion.agent_version_id, { rollback_from_version_id: targetVersionId, source_version_number: target.version_number }, {
        deployment_status: 'active',
        version_number: rollbackVersion.version_number,
        rollback_from_version_id: targetVersionId,
        deactivated_version: deactivated?.agent_version_id || null,
    });
    return { activated, deactivated, rollbackVersion };
}
export async function listAgentVersions(tenantId, q = {}) {
    const schema = tenantSchema(tenantId);
    const wheres = ['1=1'];
    const params = [];
    let idx = 1;
    if (q.asset_id) {
        wheres.push(`asset_id = $${idx}`);
        params.push(q.asset_id);
        idx++;
    }
    if (q.approval_status) {
        wheres.push(`approval_status = $${idx}`);
        params.push(q.approval_status);
        idx++;
    }
    if (q.deployment_status) {
        wheres.push(`deployment_status = $${idx}`);
        params.push(q.deployment_status);
        idx++;
    }
    if (q.is_active !== undefined) {
        wheres.push(`is_active = $${idx}`);
        params.push(q.is_active);
        idx++;
    }
    if (q.linked_prompt_asset_id) {
        wheres.push(`linked_prompt_asset_id = $${idx}`);
        params.push(q.linked_prompt_asset_id);
        idx++;
    }
    if (q.linked_model_asset_id) {
        wheres.push(`linked_model_asset_id = $${idx}`);
        params.push(q.linked_model_asset_id);
        idx++;
    }
    const limit = Math.min(q.limit || 100, 500);
    const offset = q.offset || 0;
    const where = wheres.join(' AND ');
    const [data, count] = await Promise.all([
        safeQuery(`SELECT * FROM "${schema}".ai_agent_registry WHERE ${where} ORDER BY asset_id, version_number DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".ai_agent_registry WHERE ${where}`, params),
    ]);
    return { versions: data.rows, total: count.rows[0]?.total || 0 };
}
export async function getAgentVersionById(tenantId, versionId) {
    const schema = tenantSchema(tenantId);
    return getVersionRow(schema, versionId);
}
export async function getActiveAgentVersionForAsset(tenantId, assetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`, [assetId]);
    return result.rows[0] || null;
}
export async function resolveActiveAgentForKey(tenantId, agentKey) {
    const asset = await getAssetByKey(tenantId, 'agent', agentKey);
    if (!asset)
        return null;
    return getActiveAgentVersionForAsset(tenantId, asset.asset_id);
}
export async function deleteAgentVersion(tenantId, versionId, deletedBy) {
    const schema = tenantSchema(tenantId);
    const existing = await getVersionRow(schema, versionId);
    if (!existing)
        return false;
    must(existing.is_active !== true, 422, 'INVALID_STATE', 'Cannot delete an active version');
    const parent = await getAssetById(tenantId, existing.asset_id);
    if (parent) {
        must(!(parent.source_type === 'seeded' && parent.scope_type === 'global'), 403, 'IMMUTABLE_SEEDED_ASSET', 'Seeded global agents are immutable');
    }
    const result = await safeQuery(`DELETE FROM "${schema}".ai_agent_registry WHERE agent_version_id = $1`, [versionId]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
        await emitAudit(tenantId, deletedBy || SYSTEM_JOB_ACTOR, 'delete', versionId, { version_number: existing.version_number, approval_status: existing.approval_status }, null);
    }
    return deleted;
}
//# sourceMappingURL=agent-registry.service.js.map
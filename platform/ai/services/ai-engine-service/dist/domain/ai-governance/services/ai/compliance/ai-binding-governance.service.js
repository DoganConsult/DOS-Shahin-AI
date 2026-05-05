// @ts-nocheck
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getAssetById } from '../registry/ai-asset-inventory.service';
import { emitRegistryAudit } from '../../ai-governance-lifecycle.service';
import { toErrorMessage } from '@dos/module-sdk';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
const AUDIT_MODULE = 'ai-binding-governance';
const VALID_ALLOWLIST_TYPES = ['provider', 'model'];
async function assertAssetExists(tenantId, assetId, expectedType, label) {
    const asset = await getAssetById(tenantId, assetId);
    if (!asset) {
        throw new Error(`${label} asset '${assetId}' not found in ai_asset_inventory`);
    }
    if (asset.asset_type !== expectedType) {
        throw new Error(`${label} asset must be asset_type='${expectedType}', got '${asset.asset_type}'`);
    }
    return asset;
}
async function emitAudit(tenantId, action, entityId, entityType, userId, beforeState, afterState) {
    try {
        await emitRegistryAudit(tenantId, userId || SYSTEM_JOB_ACTOR, action, entityId, AUDIT_MODULE, entityType, beforeState, afterState);
    }
    catch {
    }
}
export async function createAgentToolBinding(tenantId, input) {
    await assertAssetExists(tenantId, input.agent_asset_id, 'agent', 'Agent');
    await assertAssetExists(tenantId, input.tool_asset_id, 'tool', 'Tool');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_agent_tool_bindings
       (tenant_id, agent_asset_id, tool_asset_id, is_enabled, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [
        tenantId,
        input.agent_asset_id,
        input.tool_asset_id,
        input.is_enabled !== false,
        input.notes || null,
        input.created_by || 'system',
    ]);
    const row = result.rows[0];
    await emitAudit(tenantId, 'create', row.binding_id, 'agent_tool_binding', input.created_by, undefined, row);
    return row;
}
export async function getAgentToolBindingById(tenantId, bindingId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_tool_bindings
     WHERE binding_id = $1 AND tenant_id = $2`, [bindingId, tenantId]);
    return result.rows[0] || null;
}
export async function updateAgentToolBinding(tenantId, bindingId, input) {
    const existing = await getAgentToolBindingById(tenantId, bindingId);
    if (!existing)
        return null;
    const schema = tenantSchema(tenantId);
    const sets = [];
    const params = [];
    let idx = 1;
    if (input.is_enabled !== undefined) {
        sets.push(`is_enabled = $${idx}`);
        params.push(input.is_enabled);
        idx++;
    }
    if (input.notes !== undefined) {
        sets.push(`notes = $${idx}`);
        params.push(input.notes);
        idx++;
    }
    if (input.updated_by !== undefined) {
        sets.push(`updated_by = $${idx}`);
        params.push(input.updated_by);
        idx++;
    }
    sets.push('updated_at = NOW()');
    if (sets.length <= 1)
        return existing;
    params.push(bindingId, tenantId);
    const result = await safeQuery(`UPDATE "${schema}".ai_agent_tool_bindings
     SET ${sets.join(', ')}
     WHERE binding_id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING *`, params);
    const updated = result.rows[0];
    await emitAudit(tenantId, 'update', bindingId, 'agent_tool_binding', input.updated_by, existing, updated);
    return updated;
}
export async function deleteAgentToolBinding(tenantId, bindingId, deletedBy) {
    const existing = await getAgentToolBindingById(tenantId, bindingId);
    if (!existing)
        return false;
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`DELETE FROM "${schema}".ai_agent_tool_bindings
     WHERE binding_id = $1 AND tenant_id = $2`, [bindingId, tenantId]);
    if ((result.rowCount ?? 0) > 0) {
        await emitAudit(tenantId, 'delete', bindingId, 'agent_tool_binding', deletedBy, existing, undefined);
        return true;
    }
    return false;
}
export async function setAgentToolBindingEnabled(tenantId, bindingId, isEnabled, updatedBy) {
    return updateAgentToolBinding(tenantId, bindingId, {
        is_enabled: isEnabled,
        updated_by: updatedBy,
    });
}
export async function listAgentToolBindings(tenantId, q = {}) {
    const schema = tenantSchema(tenantId);
    const wheres = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (q.agent_asset_id) {
        wheres.push(`agent_asset_id = $${idx}`);
        params.push(q.agent_asset_id);
        idx++;
    }
    if (q.tool_asset_id) {
        wheres.push(`tool_asset_id = $${idx}`);
        params.push(q.tool_asset_id);
        idx++;
    }
    if (q.is_enabled !== undefined) {
        wheres.push(`is_enabled = $${idx}`);
        params.push(q.is_enabled);
        idx++;
    }
    const where = wheres.join(' AND ');
    const limit = Math.min(q.limit || 100, 500);
    const offset = q.offset || 0;
    const [dataResult, countResult] = await Promise.all([
        safeQuery(`SELECT * FROM "${schema}".ai_agent_tool_bindings
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".ai_agent_tool_bindings WHERE ${where}`, params),
    ]);
    return {
        bindings: dataResult.rows,
        total: countResult.rows[0]?.total || 0,
    };
}
export async function upsertAgentToolBinding(tenantId, input) {
    await assertAssetExists(tenantId, input.agent_asset_id, 'agent', 'Agent');
    await assertAssetExists(tenantId, input.tool_asset_id, 'tool', 'Tool');
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`INSERT INTO "${schema}".ai_agent_tool_bindings
       (tenant_id, agent_asset_id, tool_asset_id, is_enabled, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT ON CONSTRAINT uq_agent_tool_binding_tenant DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       notes = EXCLUDED.notes,
       updated_by = EXCLUDED.created_by,
       updated_at = NOW()
     RETURNING *`, [
        tenantId,
        input.agent_asset_id,
        input.tool_asset_id,
        input.is_enabled !== false,
        input.notes || null,
        input.created_by || 'system',
    ]);
    const row = result.rows[0];
    await emitAudit(tenantId, 'upsert', row.binding_id, 'agent_tool_binding', input.created_by, undefined, row);
    return row;
}
export async function createTenantAllowlistEntry(tenantId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function getTenantAllowlistEntryById(tenantId, allowlistId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".tenant_ai_allowlist
     WHERE allowlist_id = $1 AND tenant_id = $2`, [allowlistId, tenantId]);
    return result.rows[0] || null;
}
export async function updateTenantAllowlistEntry(tenantId, allowlistId, input) {
    const existing = await getTenantAllowlistEntryById(tenantId, allowlistId);
    if (!existing)
        return null;
    const schema = tenantSchema(tenantId);
    const sets = [];
    const params = [];
    let idx = 1;
    if (input.is_enabled !== undefined) {
        sets.push(`is_enabled = $${idx}`);
        params.push(input.is_enabled);
        idx++;
    }
    if (input.notes !== undefined) {
        sets.push(`notes = $${idx}`);
        params.push(input.notes);
        idx++;
    }
    if (input.max_tokens_limit !== undefined) {
        sets.push(`max_tokens_limit = $${idx}`);
        params.push(input.max_tokens_limit);
        idx++;
    }
    if (input.temperature_limit !== undefined) {
        sets.push(`temperature_limit = $${idx}`);
        params.push(input.temperature_limit);
        idx++;
    }
    if (input.updated_by !== undefined) {
        sets.push(`updated_by = $${idx}`);
        params.push(input.updated_by);
        idx++;
    }
    sets.push('updated_at = NOW()');
    if (sets.length <= 1)
        return existing;
    params.push(allowlistId, tenantId);
    const result = await safeQuery(`UPDATE "${schema}".tenant_ai_allowlist
     SET ${sets.join(', ')}
     WHERE allowlist_id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING *`, params);
    const updated = result.rows[0];
    await emitAudit(tenantId, 'update', allowlistId, 'tenant_allowlist', input.updated_by, existing, updated);
    return updated;
}
export async function deleteTenantAllowlistEntry(tenantId, allowlistId, deletedBy) {
    const existing = await getTenantAllowlistEntryById(tenantId, allowlistId);
    if (!existing)
        return false;
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`DELETE FROM "${schema}".tenant_ai_allowlist
     WHERE allowlist_id = $1 AND tenant_id = $2`, [allowlistId, tenantId]);
    if ((result.rowCount ?? 0) > 0) {
        await emitAudit(tenantId, 'delete', allowlistId, 'tenant_allowlist', deletedBy, existing, undefined);
        return true;
    }
    return false;
}
export async function setTenantAllowlistEnabled(tenantId, allowlistId, isEnabled, updatedBy) {
    return updateTenantAllowlistEntry(tenantId, allowlistId, {
        is_enabled: isEnabled,
        updated_by: updatedBy,
    });
}
export async function listTenantAllowlistEntries(tenantId, q = {}) {
    const schema = tenantSchema(tenantId);
    const wheres = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (q.asset_type) {
        wheres.push(`asset_type = $${idx}`);
        params.push(q.asset_type);
        idx++;
    }
    if (q.asset_id) {
        wheres.push(`asset_id = $${idx}`);
        params.push(q.asset_id);
        idx++;
    }
    if (q.is_enabled !== undefined) {
        wheres.push(`is_enabled = $${idx}`);
        params.push(q.is_enabled);
        idx++;
    }
    const where = wheres.join(' AND ');
    const limit = Math.min(q.limit || 100, 500);
    const offset = q.offset || 0;
    const [dataResult, countResult] = await Promise.all([
        safeQuery(`SELECT * FROM "${schema}".tenant_ai_allowlist
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".tenant_ai_allowlist WHERE ${where}`, params),
    ]);
    return {
        entries: dataResult.rows,
        total: countResult.rows[0]?.total || 0,
    };
}
export async function upsertTenantAllowlistEntry(tenantId, input) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
export async function backfillTenantAllowlistAssetRefs(tenantId, backfilledBy) {
    const schema = tenantSchema(tenantId);
    const result = {
        processed: 0,
        backfilled: 0,
        already_valid: 0,
        unresolved: 0,
        errors: 0,
        unresolved_rows: [],
    };
    const rows = await safeQuery(`SELECT * FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1`, [tenantId]);
    for (const row of rows.rows) {
        result.processed++;
        if (row.asset_id) {
            result.already_valid++;
            continue;
        }
        try {
            const providerMatch = await safeQuery(`SELECT asset_id, asset_type FROM "${schema}".ai_asset_inventory
         WHERE asset_key = $1 AND asset_type = 'provider' AND tenant_id = $2`, [row.provider, tenantId]);
            const modelMatch = await safeQuery(`SELECT asset_id, asset_type FROM "${schema}".ai_asset_inventory
         WHERE asset_key = $1 AND asset_type = 'model' AND tenant_id = $2`, [row.model_id, tenantId]);
            let resolvedAssetId = null;
            let resolvedAssetType = null;
            if (modelMatch.rows.length === 1) {
                resolvedAssetId = modelMatch.rows[0].asset_id;
                resolvedAssetType = 'model';
            }
            else if (providerMatch.rows.length === 1 && modelMatch.rows.length === 0) {
                resolvedAssetId = providerMatch.rows[0].asset_id;
                resolvedAssetType = 'provider';
            }
            if (modelMatch.rows.length > 1) {
                result.unresolved++;
                result.unresolved_rows.push({
                    allowlist_id: row.allowlist_id,
                    provider: row.provider,
                    model_id: row.model_id,
                    reason: `multiple_model_matches (${modelMatch.rows.length} found)`,
                });
                continue;
            }
            if (providerMatch.rows.length > 1 && !resolvedAssetId) {
                result.unresolved++;
                result.unresolved_rows.push({
                    allowlist_id: row.allowlist_id,
                    provider: row.provider,
                    model_id: row.model_id,
                    reason: `multiple_provider_matches (${providerMatch.rows.length} found)`,
                });
                continue;
            }
            if (!resolvedAssetId) {
                result.unresolved++;
                result.unresolved_rows.push({
                    allowlist_id: row.allowlist_id,
                    provider: row.provider,
                    model_id: row.model_id,
                    reason: 'no_matching_asset',
                });
                continue;
            }
            await safeQuery(`UPDATE "${schema}".tenant_ai_allowlist
         SET asset_id = $1, asset_type = $2, updated_by = $3, updated_at = NOW()
         WHERE allowlist_id = $4 AND tenant_id = $5`, [resolvedAssetId, resolvedAssetType, backfilledBy || SYSTEM_JOB_ACTOR, row.allowlist_id, tenantId]);
            result.backfilled++;
            await emitAudit(tenantId, 'backfill', row.allowlist_id, 'tenant_allowlist', backfilledBy, { asset_id: null, asset_type: null }, { asset_id: resolvedAssetId, asset_type: resolvedAssetType });
        }
        catch (err) {
            result.errors++;
            result.unresolved_rows.push({
                allowlist_id: row.allowlist_id,
                provider: row.provider,
                model_id: row.model_id,
                reason: `error: ${toErrorMessage(err) || 'any'}`,
            });
        }
    }
    return result;
}
export async function getEnabledToolAssetIdsForAgent(tenantId, agentAssetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT tool_asset_id FROM "${schema}".ai_agent_tool_bindings
     WHERE tenant_id = $1 AND agent_asset_id = $2 AND is_enabled = TRUE
     ORDER BY created_at ASC`, [tenantId, agentAssetId]);
    return result.rows.map((r) => r.tool_asset_id);
}
export async function getEnabledToolBindingsForAgent(tenantId, agentAssetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT * FROM "${schema}".ai_agent_tool_bindings
     WHERE tenant_id = $1 AND agent_asset_id = $2 AND is_enabled = TRUE
     ORDER BY created_at ASC`, [tenantId, agentAssetId]);
    return result.rows;
}
export async function getEnabledAllowlistForTenant(tenantId, assetType) {
    const schema = tenantSchema(tenantId);
    const wheres = ['tenant_id = $1', 'is_enabled = TRUE'];
    const params = [tenantId];
    if (assetType) {
        wheres.push('asset_type = $2');
        params.push(assetType);
    }
    const result = await safeQuery(`SELECT * FROM "${schema}".tenant_ai_allowlist
     WHERE ${wheres.join(' AND ')}
     ORDER BY created_at ASC`, params);
    return result.rows;
}
export async function isAssetAllowlistedForTenant(tenantId, assetId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT 1 FROM "${schema}".tenant_ai_allowlist
     WHERE tenant_id = $1 AND asset_id = $2 AND is_enabled = TRUE
     LIMIT 1`, [tenantId, assetId]);
    return result.rows.length > 0;
}
//# sourceMappingURL=ai-binding-governance.service.js.map
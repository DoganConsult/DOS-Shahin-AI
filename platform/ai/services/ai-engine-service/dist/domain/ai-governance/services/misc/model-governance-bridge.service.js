// @ts-nocheck
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { getAssetByKey } from '../../runtime/ai/registry/ai-asset-inventory.service.js';
import { isAssetAllowlistedForTenant } from '../../runtime/ai/compliance/ai-binding-governance.service.js';
import { getActiveModelVersionForAsset } from '../../services/misc/model-registry.service.js';
import { getAgentModelConfig, resolveModelForAgent, } from '../../runtime/ai/services/gateway/llm-router.service.js';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service.js';
import { getTenantEnforcementMode, getGlobalFallbackMode, setGlobalFallbackMode, } from '../../runtime/ai/operations/ai-governance-config.service.js';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port.js';
const AUDIT_MODULE = 'model-governance-bridge';
export function getEnforcementMode() {
    return getGlobalFallbackMode();
}
export function setEnforcementMode(mode) {
    setGlobalFallbackMode(mode);
}
function buildAssetKey(provider, modelId) {
    return `${provider}.${modelId}`;
}
function detectMismatches(runtimeProvider, runtimeModel, runtimeMaxTokens, runtimeTemperature, version) {
    const mismatches = [];
    if (runtimeProvider !== version.provider) {
        mismatches.push(`provider: runtime='${runtimeProvider}' vs registry='${version.provider}'`);
    }
    if (runtimeModel !== version.provider_model_id) {
        mismatches.push(`model: runtime='${runtimeModel}' vs registry='${version.provider_model_id}'`);
    }
    const regConfig = version.config || {};
    if (regConfig.max_tokens !== undefined && runtimeMaxTokens !== regConfig.max_tokens) {
        mismatches.push(`max_tokens: runtime=${runtimeMaxTokens} vs registry=${regConfig.max_tokens}`);
    }
    if (regConfig.temperature !== undefined && runtimeTemperature !== regConfig.temperature) {
        mismatches.push(`temperature: runtime=${runtimeTemperature} vs registry=${regConfig.temperature}`);
    }
    return mismatches;
}
async function emitBridgeAudit(tenantId, agentId, action, details) {
    try {
        await recordAudit({
            tenantId,
            userId: SYSTEM_JOB_ACTOR,
            module: AUDIT_MODULE,
            action,
            entityType: 'agent_model_resolution',
            entityId: agentId,
            beforeState: details.before || null,
            afterState: details.after || null,
        });
    }
    catch {
    }
}
export async function resolveGovernedModel(tenantId, agentId, taskType, inputTokenEstimate) {
    const mode = await getTenantEnforcementMode(tenantId);
    const agentConfig = await getAgentModelConfig(tenantId, agentId);
    const resolved = await resolveModelForAgent(tenantId, agentId, agentConfig, taskType, inputTokenEstimate);
    const base = {
        agent_id: agentId,
        resolution_status: 'resolved_runtime_fallback',
        runtime_provider: resolved.provider,
        runtime_model: resolved.model,
        runtime_max_tokens: resolved.maxTokens,
        runtime_temperature: resolved.temperature,
        governed: false,
        governance_asset_id: null,
        governance_version_id: null,
        governance_version_number: null,
        governance_provider: null,
        governance_model_id: null,
        governance_config: null,
        mismatch: false,
        mismatch_details: [],
        enforcement_mode: mode,
        action_taken: 'pass',
        resolved_provider: resolved.provider,
        resolved_model: resolved.model,
        resolved_max_tokens: resolved.maxTokens,
        resolved_temperature: resolved.temperature,
        allowlist_checked: false,
        allowlisted: false,
        allowlist_advisory: null,
    };
    if (resolved.provider === 'auto' || resolved.model === 'auto') {
        return base;
    }
    const assetKey = buildAssetKey(resolved.provider, resolved.model);
    let asset = null;
    try {
        asset = await getAssetByKey(tenantId, 'model', assetKey);
    }
    catch {
        return base;
    }
    if (!asset) {
        if (mode === 'enforce') {
            await emitBridgeAudit(tenantId, agentId, 'ungoverned_model_blocked', {
                after: { provider: resolved.provider, model: resolved.model, reason: 'No matching asset in ai_asset_inventory' },
            });
            return {
                ...base,
                resolution_status: 'blocked_no_asset',
                action_taken: 'block',
                mismatch: true,
                mismatch_details: [`No governed asset found for ${assetKey}. Model usage blocked in enforce mode.`],
                resolved_provider: 'blocked',
                resolved_model: 'blocked',
                resolved_max_tokens: 0,
                resolved_temperature: 0,
            };
        }
        if (mode === 'warn') {
            await emitBridgeAudit(tenantId, agentId, 'ungoverned_model_warn', {
                after: { provider: resolved.provider, model: resolved.model, reason: 'No matching asset in ai_asset_inventory' },
            });
            return {
                ...base,
                resolution_status: 'mismatch_warn',
                action_taken: 'warn',
                mismatch: true,
                mismatch_details: [`No governed asset found for ${assetKey}. Proceeding with runtime config (warn mode).`],
            };
        }
        await emitBridgeAudit(tenantId, agentId, 'ungoverned_model_audit', {
            after: { provider: resolved.provider, model: resolved.model, reason: 'No matching asset in ai_asset_inventory' },
        });
        return { ...base, resolution_status: 'mismatch_pass' };
    }
    base.governance_asset_id = asset.asset_id;
    try {
        base.allowlist_checked = true;
        const allowed = await isAssetAllowlistedForTenant(tenantId, asset.asset_id);
        base.allowlisted = allowed;
        if (!allowed) {
            base.allowlist_advisory = `Model asset '${asset.asset_id}' is not on the tenant allowlist.`;
            if (mode === 'enforce') {
                await emitBridgeAudit(tenantId, agentId, 'allowlist_not_listed_blocked', {
                    after: { asset_id: asset.asset_id, reason: base.allowlist_advisory },
                });
                return {
                    ...base,
                    resolution_status: 'blocked_no_asset',
                    action_taken: 'block',
                    mismatch: true,
                    mismatch_details: [base.allowlist_advisory + ' Blocked in enforce mode.'],
                    resolved_provider: 'blocked',
                    resolved_model: 'blocked',
                    resolved_max_tokens: 0,
                    resolved_temperature: 0,
                };
            }
        }
    }
    catch {
        base.allowlist_advisory = 'Allowlist check failed; skipping.';
    }
    let activeVersion = null;
    try {
        activeVersion = await getActiveModelVersionForAsset(tenantId, asset.asset_id);
    }
    catch {
        return base;
    }
    if (!activeVersion) {
        const detail = `Asset ${assetKey} exists but has no active governed version.`;
        if (mode === 'enforce') {
            await emitBridgeAudit(tenantId, agentId, 'no_active_version_blocked', {
                after: { asset_id: asset.asset_id, reason: detail },
            });
            return {
                ...base,
                resolution_status: 'blocked_no_active_version',
                action_taken: 'block',
                mismatch: true,
                mismatch_details: [detail + ' Model usage blocked in enforce mode.'],
                resolved_provider: 'blocked',
                resolved_model: 'blocked',
                resolved_max_tokens: 0,
                resolved_temperature: 0,
            };
        }
        if (mode === 'warn') {
            await emitBridgeAudit(tenantId, agentId, 'no_active_version_warn', {
                after: { asset_id: asset.asset_id, reason: detail },
            });
            return { ...base, resolution_status: 'mismatch_warn', action_taken: 'warn', mismatch: true, mismatch_details: [detail + ' Proceeding with runtime config (warn mode).'] };
        }
        await emitBridgeAudit(tenantId, agentId, 'no_active_version_audit', {
            after: { asset_id: asset.asset_id, reason: detail },
        });
        return { ...base, resolution_status: 'mismatch_pass' };
    }
    base.governed = true;
    base.governance_version_id = activeVersion.model_version_id;
    base.governance_version_number = activeVersion.version_number;
    base.governance_provider = activeVersion.provider;
    base.governance_model_id = activeVersion.provider_model_id;
    base.governance_config = activeVersion.config;
    const mismatches = detectMismatches(resolved.provider, resolved.model, resolved.maxTokens, resolved.temperature, activeVersion);
    if (mismatches.length === 0) {
        base.resolution_status = 'resolved_governed';
        return base;
    }
    base.mismatch = true;
    base.mismatch_details = mismatches;
    if (mode === 'enforce') {
        base.action_taken = 'block';
        base.resolution_status = 'blocked_mismatch_enforced';
        base.resolved_provider = activeVersion.provider;
        base.resolved_model = activeVersion.provider_model_id;
        base.resolved_max_tokens = activeVersion.config?.max_tokens ?? resolved.maxTokens;
        base.resolved_temperature = activeVersion.config?.temperature ?? resolved.temperature;
        await emitBridgeAudit(tenantId, agentId, 'mismatch_enforced', {
            before: { provider: resolved.provider, model: resolved.model },
            after: { provider: base.resolved_provider, model: base.resolved_model, mismatches },
        });
    }
    else if (mode === 'warn') {
        base.action_taken = 'warn';
        base.resolution_status = 'mismatch_warn';
        await emitBridgeAudit(tenantId, agentId, 'mismatch_warn', {
            before: { provider: resolved.provider, model: resolved.model },
            after: { provider: activeVersion.provider, model: activeVersion.provider_model_id, mismatches },
        });
    }
    else {
        base.resolution_status = 'mismatch_pass';
        await emitBridgeAudit(tenantId, agentId, 'mismatch_audit', {
            before: { provider: resolved.provider, model: resolved.model },
            after: { provider: activeVersion.provider, model: activeVersion.provider_model_id, mismatches },
        });
    }
    return base;
}
export async function detectAllMismatches(tenantId) {
    const schema = tenantSchema(tenantId);
    const reports = [];
    let configs = [];
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_model_config ORDER BY agent_id`);
        configs = result.rows;
    }
    catch {
        return reports;
    }
    for (const cfg of configs) {
        if (!cfg.enabled)
            continue;
        const resolved = await resolveModelForAgent(tenantId, cfg.agent_id, cfg);
        if (resolved.provider === 'auto' || resolved.model === 'auto')
            continue;
        const assetKey = buildAssetKey(resolved.provider, resolved.model);
        let asset = null;
        try {
            asset = await getAssetByKey(tenantId, 'model', assetKey);
        }
        catch {
            continue;
        }
        if (!asset) {
            reports.push({
                agent_id: cfg.agent_id,
                tenant_id: tenantId,
                runtime: { provider: resolved.provider, model: resolved.model, max_tokens: resolved.maxTokens, temperature: resolved.temperature },
                registry: null,
                mismatches: [`No governed asset found for ${assetKey}`],
                timestamp: new Date().toISOString(),
            });
            continue;
        }
        let activeVersion = null;
        try {
            activeVersion = await getActiveModelVersionForAsset(tenantId, asset.asset_id);
        }
        catch {
            continue;
        }
        if (!activeVersion) {
            reports.push({
                agent_id: cfg.agent_id,
                tenant_id: tenantId,
                runtime: { provider: resolved.provider, model: resolved.model, max_tokens: resolved.maxTokens, temperature: resolved.temperature },
                registry: { provider: null, model_id: null, config: null, version_number: null, deployment_status: null },
                mismatches: [`Asset ${assetKey} has no active governed version`],
                timestamp: new Date().toISOString(),
            });
            continue;
        }
        const mismatches = detectMismatches(resolved.provider, resolved.model, resolved.maxTokens, resolved.temperature, activeVersion);
        if (mismatches.length > 0) {
            reports.push({
                agent_id: cfg.agent_id,
                tenant_id: tenantId,
                runtime: { provider: resolved.provider, model: resolved.model, max_tokens: resolved.maxTokens, temperature: resolved.temperature },
                registry: {
                    provider: activeVersion.provider,
                    model_id: activeVersion.provider_model_id,
                    config: activeVersion.config,
                    version_number: activeVersion.version_number,
                    deployment_status: activeVersion.deployment_status,
                },
                mismatches,
                timestamp: new Date().toISOString(),
            });
        }
    }
    return reports;
}
//# sourceMappingURL=model-governance-bridge.service.js.map
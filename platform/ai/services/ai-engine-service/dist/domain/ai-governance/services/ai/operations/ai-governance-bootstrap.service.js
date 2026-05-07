// Platform-reusable AI governance bootstrap orchestration.
// This file must NOT hardcode product-specific agent/tool/prompt/workflow catalogs.
// Product seed data is obtained via the registered seed provider boundary.
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { discoverAndSeedAssets, getCanonicalAgents, getCanonicalModels, buildCanonicalPromptAssets, getRuntimeToolDefinitions, getAllowlistModels, getDefaultModelKey, } from '../../runtime/ai/services/governance/compliance/ai-asset-discovery.service.js';
import { backfillTenantAllowlistAssetRefs } from '../compliance/ai-binding-governance.service.js';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
export async function bootstrapAiGovernance(tenantId) {
    const discovery = await discoverAndSeedAssets(tenantId);
    const schema = tenantSchema(tenantId);
    const modelVersions = await seedModelVersions(schema, tenantId);
    const promptVersions = await seedPromptVersions(schema, tenantId);
    const agentVersions = await seedAgentVersions(schema, tenantId);
    const toolBindings = await seedToolBindings(schema, tenantId);
    const allowlistEntries = await seedAllowlist(schema, tenantId);
    const configKeys = await seedGovernanceConfig(schema);
    return {
        tenantId,
        timestamp: new Date().toISOString(),
        discovery,
        modelVersions,
        promptVersions,
        agentVersions,
        toolBindings,
        allowlistEntries,
        configKeys,
    };
}
async function resolveAssetId(schema, assetType, assetKey) {
    const r = await safeQuery(`SELECT asset_id FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = $2 AND deleted_at IS NULL LIMIT 1`, [assetType, assetKey]);
    return getFirstRow(r)?.asset_id ?? null;
}
async function versionExists(schema, table, assetId) {
    const r = await safeQuery(`SELECT 1 FROM "${schema}".${table} WHERE asset_id = $1 LIMIT 1`, [assetId]);
    return r.rows.length > 0;
}
async function seedModelVersions(schema, _tenantId) {
    const models = getCanonicalModels();
    let seeded = 0;
    for (const m of models) {
        const assetId = await resolveAssetId(schema, 'model', m.asset_key);
        if (!assetId)
            continue;
        if (await versionExists(schema, 'ai_model_registry', assetId))
            continue;
        const parts = m.asset_key.split('.');
        const provider = parts[0];
        const providerModelId = parts.slice(1).join('.');
        await safeQuery(`INSERT INTO "${schema}".ai_model_registry
         (asset_id, version_number, provider, provider_model_id, config,
          approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, $3, $4, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`, [assetId, provider, providerModelId, JSON.stringify(m.metadata || {})]);
        seeded++;
    }
    return seeded;
}
async function seedPromptVersions(schema, _tenantId) {
    const prompts = buildCanonicalPromptAssets();
    let seeded = 0;
    const defaultModelAssetId = await resolveAssetId(schema, 'model', getDefaultModelKey());
    for (const p of prompts) {
        const assetId = await resolveAssetId(schema, 'prompt', p.asset_key);
        if (!assetId)
            continue;
        if (await versionExists(schema, 'ai_prompt_registry', assetId))
            continue;
        const agentId = p.metadata?.linked_agent;
        const templateText = agentId
            ? `Default system prompt for agent ${agentId}. Configure via AI Governance.`
            : '';
        await safeQuery(`INSERT INTO "${schema}".ai_prompt_registry
         (asset_id, version_number, template_text, variables, linked_model_asset_id,
          approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, '[]', $3, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`, [assetId, templateText, defaultModelAssetId]);
        seeded++;
    }
    return seeded;
}
async function seedAgentVersions(schema, _tenantId) {
    const agents = getCanonicalAgents();
    let seeded = 0;
    const defaultModelAssetId = await resolveAssetId(schema, 'model', getDefaultModelKey());
    for (const a of agents) {
        const assetId = await resolveAssetId(schema, 'agent', a.asset_key);
        if (!assetId)
            continue;
        if (await versionExists(schema, 'ai_agent_registry', assetId))
            continue;
        const promptKey = `prompt.${a.asset_key.toLowerCase()}.system.default`;
        const promptAssetId = await resolveAssetId(schema, 'prompt', promptKey);
        const agentConfig = {
            agent_id: a.asset_key,
            display_name: a.display_name,
            domain: a.metadata?.domain,
            color: a.metadata?.color,
            icon: a.metadata?.icon,
        };
        const capabilities = (a.tags || []).filter(t => t !== 'agent');
        await safeQuery(`INSERT INTO "${schema}".ai_agent_registry
         (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
          capabilities, approval_status, deployment_status, is_active, change_summary, created_by)
       VALUES ($1, 1, $2, $3, $4, $5, 'approved', 'active', TRUE, 'Seeded default version', 'system')
       ON CONFLICT (asset_id, version_number) DO NOTHING`, [
            assetId,
            JSON.stringify(agentConfig),
            promptAssetId,
            defaultModelAssetId,
            JSON.stringify(capabilities),
        ]);
        seeded++;
    }
    return seeded;
}
async function seedToolBindings(schema, tenantId) {
    const tools = getRuntimeToolDefinitions();
    let seeded = 0;
    for (const t of tools) {
        const agentAssetId = await resolveAssetId(schema, 'agent', t.agent);
        if (!agentAssetId)
            continue;
        const toolKey = `tool.${t.agent.toLowerCase()}.${t.name}`;
        const toolAssetId = await resolveAssetId(schema, 'tool', toolKey);
        if (!toolAssetId)
            continue;
        try {
            await safeQuery(`INSERT INTO "${schema}".ai_agent_tool_bindings
           (agent_asset_id, tool_asset_id, tenant_id, is_enabled, notes, created_by)
         VALUES ($1, $2, $3, TRUE, 'Seeded default binding', 'system')
         ON CONFLICT (tenant_id, agent_asset_id, tool_asset_id) DO NOTHING`, [agentAssetId, toolAssetId, tenantId]);
            seeded++;
        }
        catch { }
    }
    return seeded;
}
async function seedAllowlist(schema, tenantId) {
    const allowlistModels = getAllowlistModels();
    let seeded = 0;
    for (const entry of allowlistModels) {
        const assetId = await resolveAssetId(schema, 'model', entry.asset_key);
        if (!assetId)
            continue;
        try {
            await safeQuery(`INSERT INTO "${schema}".tenant_ai_allowlist
           (tenant_id, asset_id, asset_type, provider, model_id, is_enabled, notes, created_by)
         VALUES ($1, $2, 'model', $3, $4, TRUE, 'Seeded default allowlist entry', 'system')
         ON CONFLICT (tenant_id, provider, model_id) DO NOTHING`, [tenantId, assetId, entry.provider, entry.model_id]);
            seeded++;
        }
        catch { }
    }
    return seeded;
}
const GOVERNANCE_CONFIG_KEYS = [
    {
        key: 'ai_governance_enforcement_mode',
        value: '"audit"',
        desc_en: 'AI governance enforcement mode for model/agent registries: audit | warn | enforce',
    },
    {
        key: 'ai_governance_sod_policy',
        value: '"enforce"',
        desc_en: 'AI governance separation of duties policy for approval workflows',
    },
];
async function seedGovernanceConfig(schema) {
    const seeded = [];
    for (const c of GOVERNANCE_CONFIG_KEYS) {
        await safeQuery(`INSERT INTO "${schema}".platform_operation_config (config_key, config_value, description_en, owner_module, owner_type, updated_at)
       VALUES ($1, $2, $3, 'ai_governance', 'module', NOW())
       ON CONFLICT (config_key, owner_module) DO NOTHING`, [c.key, c.value, c.desc_en]);
        seeded.push(c.key);
    }
    return seeded;
}
export async function checkGovernanceHealth(tenantId) {
    const schema = tenantSchema(tenantId);
    const agents = getCanonicalAgents();
    const models = getCanonicalModels();
    const prompts = buildCanonicalPromptAssets();
    const tools = getRuntimeToolDefinitions();
    const allowlistModels = getAllowlistModels();
    const agentCheck = await checkAssetPresence(schema, 'agent', agents.map(a => a.asset_key));
    const modelCheck = await checkAssetPresence(schema, 'model', models.map(m => m.asset_key));
    const promptCheck = await checkAssetPresence(schema, 'prompt', prompts.map(p => p.asset_key));
    const modelVersionCheck = await checkActiveVersions(schema, 'ai_model_registry', 'model', models.map(m => m.asset_key));
    const promptVersionCheck = await checkActiveVersions(schema, 'ai_prompt_registry', 'prompt', prompts.map(p => p.asset_key));
    const agentVersionCheck = await checkActiveVersions(schema, 'ai_agent_registry', 'agent', agents.map(a => a.asset_key));
    const bindingResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".ai_agent_tool_bindings WHERE tenant_id = $1`, [tenantId]), { operation: 'query ai_agent_tool_bindings' });
    const allowlistResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1 AND is_enabled = TRUE`, [tenantId]), { operation: 'query ai_agent_tool_bindings' });
    const allowlistLegacyResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, without_asset_id: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE asset_id IS NULL)::int AS without_asset_id
     FROM "${schema}".tenant_ai_allowlist WHERE tenant_id = $1`, [tenantId]), { operation: 'query tenant_ai_allowlist' });
    const legacyTotal = getFirstRow(allowlistLegacyResult)?.total ?? 0;
    const legacyWithout = getFirstRow(allowlistLegacyResult)?.without_asset_id ?? 0;
    const expectedConfigKeys = GOVERNANCE_CONFIG_KEYS.map(c => c.key);
    const configResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT config_key FROM "${schema}".platform_operation_config WHERE config_key = ANY($1) AND owner_module IN ('ai_governance', 'platform')`, [expectedConfigKeys]), { operation: 'query platform_operation_config' });
    const foundConfigKeys = configResult.rows.map(r => r.config_key);
    const missingConfigKeys = expectedConfigKeys.filter(k => !foundConfigKeys.includes(k));
    const healthy = agentCheck.missing.length === 0 &&
        modelCheck.missing.length === 0 &&
        promptCheck.missing.length === 0 &&
        modelVersionCheck.missingActiveFor.length === 0 &&
        promptVersionCheck.missingActiveFor.length === 0 &&
        agentVersionCheck.missingActiveFor.length === 0 &&
        (getFirstRow(bindingResult)?.cnt ?? 0) >= tools.length &&
        (getFirstRow(allowlistResult)?.cnt ?? 0) >= allowlistModels.length &&
        legacyWithout === 0 &&
        missingConfigKeys.length === 0;
    return {
        tenantId,
        timestamp: new Date().toISOString(),
        healthy,
        checks: {
            agentAssets: agentCheck,
            modelAssets: modelCheck,
            promptAssets: promptCheck,
            modelVersions: modelVersionCheck,
            promptVersions: promptVersionCheck,
            agentVersions: agentVersionCheck,
            toolBindings: { expected: tools.length, found: getFirstRow(bindingResult)?.cnt ?? 0 },
            allowlistEntries: { expected: allowlistModels.length, found: getFirstRow(allowlistResult)?.cnt ?? 0 },
            allowlistLegacyRows: { total: legacyTotal, withoutAssetId: legacyWithout },
            configKeys: { expected: expectedConfigKeys, found: foundConfigKeys, missing: missingConfigKeys },
        },
    };
}
async function checkAssetPresence(schema, assetType, expectedKeys) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT asset_key FROM "${schema}".ai_asset_inventory
     WHERE asset_type = $1 AND asset_key = ANY($2) AND deleted_at IS NULL`, [assetType, expectedKeys]), { operation: 'query ai_asset_inventory' });
    const foundKeys = result.rows.map(r => r.asset_key);
    const missing = expectedKeys.filter(k => !foundKeys.includes(k));
    return { expected: expectedKeys.length, found: foundKeys.length, missing };
}
async function checkActiveVersions(schema, table, assetType, expectedAssetKeys) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT DISTINCT ai.asset_key
     FROM "${schema}".${table} r
     JOIN "${schema}".ai_asset_inventory ai ON ai.asset_id = r.asset_id
     WHERE ai.asset_type = $1 AND ai.asset_key = ANY($2)
       AND r.is_active = TRUE AND ai.deleted_at IS NULL`, [assetType, expectedAssetKeys]), { operation: 'fallback query' });
    const foundKeys = result.rows.map(r => r.asset_key);
    const missingActiveFor = expectedAssetKeys.filter(k => !foundKeys.includes(k));
    return { expected: expectedAssetKeys.length, found: foundKeys.length, missingActiveFor };
}
export async function repairAiGovernance(tenantId) {
    const bootstrap = await bootstrapAiGovernance(tenantId);
    const backfill = await backfillTenantAllowlistAssetRefs(tenantId, 'system:repair');
    const health = await checkGovernanceHealth(tenantId);
    return { bootstrap, backfill, health };
}
//# sourceMappingURL=ai-governance-bootstrap.service.js.map
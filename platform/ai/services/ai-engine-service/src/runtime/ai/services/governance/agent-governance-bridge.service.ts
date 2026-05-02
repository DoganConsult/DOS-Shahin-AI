// @ts-nocheck
import { getAssetByKey, getAssetById, type AIAsset } from '../../../ai-governance/services/ai/registry/ai-asset-inventory.service';
import {
  getActiveAgentVersionForAsset,
  type AgentVersion,
} from '../agents/core/agent-registry.service';
import {
  getActivePromptVersionForAsset,
  type PromptVersion,
} from '../../../ai-governance/services/misc/prompt-registry.service';
import {
  getActiveModelVersionForAsset,
  type ModelVersion,
} from '../../../ai-governance/services/misc/model-registry.service';
import { AGENT_PROFILES, type AgentProfile } from '../gateway/llm.service';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { getEnabledToolAssetIdsForAgent } from '../../../ai-governance/services/ai/compliance/ai-binding-governance.service';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
import {
  getTenantEnforcementMode,
  setTenantEnforcementMode,
  getGlobalFallbackMode,
  setGlobalFallbackMode,
  type EnforcementMode,
} from '../../../ai-governance/services/ai/operations/ai-governance-config.service';
import { safeQuery } from "@dos/db";

export type { EnforcementMode };

export type ResolutionStatus =
  | 'resolved_governed'
  | 'resolved_with_fallback'
  | 'no_governed_agent_asset'
  | 'no_active_agent_version'
  | 'linked_prompt_missing'
  | 'linked_model_missing'
  | 'runtime_registry_mismatch'
  | 'blocked_enforce';

export interface ResolvedModel {
  provider: string;
  provider_model_id: string;
  config: Record<string, unknown>;
}

export interface AgentGovernanceResolution {
  tenant_id: string;
  agent_id: string;
  enforcement_mode: EnforcementMode;
  resolution_status: ResolutionStatus;
  governed: boolean;
  mismatch: boolean;
  warnings: string[];
  agent_asset: AIAsset | null;
  active_agent_version: AgentVersion | null;
  linked_prompt_asset: AIAsset | null;
  active_prompt_version: PromptVersion | null;
  linked_model_asset: AIAsset | null;
  active_model_version: ModelVersion | null;
  resolved_system_prompt: string;
  resolved_model: ResolvedModel | null;
  resolved_agent_config: Record<string, unknown> | null;
  resolved_capabilities: unknown[];
  fallback_used: boolean;
  tool_bindings_checked: boolean;
  governed_tool_asset_ids: string[];
  tool_binding_advisory: string | null;
}

export interface AgentMismatchReport {
  agent_id: string;
  tenant_id: string;
  runtime: { name: string; domain: string; system_prompt_length: number };
  registry: {
    version_number: number | null;
    deployment_status: string | null;
    agent_config_keys: string[] | null;
    capabilities_count: number | null;
    linked_prompt_asset_id: string | null;
    linked_model_asset_id: string | null;
  } | null;
  mismatches: string[];
  timestamp: string;
}

const AUDIT_MODULE = 'agent-governance-bridge';

export function getEnforcementMode(): EnforcementMode {
  return getGlobalFallbackMode();
}

export function setEnforcementMode(mode: EnforcementMode): void {
  setGlobalFallbackMode(mode);
}

export async function getTenantEnforcementModeForAgent(tenantId: string): Promise<EnforcementMode> {
  return getTenantEnforcementMode(tenantId);
}

export async function setTenantEnforcementModeForAgent(tenantId: string, mode: EnforcementMode): Promise<void> {
  return setTenantEnforcementMode(tenantId, mode);
}

function detectAgentMismatches(
  profile: AgentProfile,
  version: AgentVersion,
  activePrompt: PromptVersion | null,
  activeModel: ModelVersion | null,
): string[] {
  const mismatches: string[] = [];
  const govConfig = version.agent_config || {};

  if (govConfig.systemPrompt && profile.systemPrompt !== govConfig.systemPrompt) {
    mismatches.push(

      `systemPrompt: runtime length=${profile.systemPrompt.length} vs registry length=${govConfig.systemPrompt.length}`,
    );
  }

  if (govConfig.name && profile.name !== govConfig.name) {
    mismatches.push(`name: runtime='${profile.name}' vs registry='${govConfig.name}'`);
  }

  if (govConfig.domain && profile.domain !== govConfig.domain) {
    mismatches.push(`domain: runtime='${profile.domain}' vs registry='${govConfig.domain}'`);
  }

  if (govConfig.tools) {
    const runtimeTools = JSON.stringify([]);
    const registryTools = JSON.stringify(govConfig.tools || []);
    if (runtimeTools !== registryTools) {

      mismatches.push(`tools: runtime has static profile vs registry has ${(govConfig.tools || []).length} tools`);
    }
  }

  if (version.linked_prompt_asset_id && !activePrompt) {
    mismatches.push(`linked_prompt: governed ref '${version.linked_prompt_asset_id}' has no active prompt version`);
  }

  if (version.linked_model_asset_id && !activeModel) {
    mismatches.push(`linked_model: governed ref '${version.linked_model_asset_id}' has no active model version`);
  }

  if (activeModel) {
    const cfg = activeModel.config || {};
    if (cfg.temperature !== undefined && cfg.temperature !== 0.3) {
      mismatches.push(`model temperature: runtime=0.3 vs registry=${cfg.temperature}`);
    }
    if (cfg.max_tokens !== undefined && cfg.max_tokens !== 4096) {
      mismatches.push(`model max_tokens: runtime=4096 vs registry=${cfg.max_tokens}`);
    }
  }

  return mismatches;
}

async function emitBridgeAudit(
  tenantId: string,
  agentId: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  try {
    await recordAudit({
      tenantId,
      userId: SYSTEM_JOB_ACTOR,
      module: AUDIT_MODULE,
      action,
      entityType: 'agent_governance_resolution',
      entityId: agentId,
      beforeState: details.before || null,
      afterState: details.after || null,
    });
  } catch {
  }
}

async function resolveLinkedPrompt(
  tenantId: string,
  linkedPromptAssetId: string,
): Promise<{ asset: AIAsset | null; version: PromptVersion | null }> {
  try {
    const asset = await getAssetById(tenantId, linkedPromptAssetId);
    if (!asset) return { asset: null, version: null };
    const version = await getActivePromptVersionForAsset(tenantId, linkedPromptAssetId);
    return { asset, version };
  } catch {
    return { asset: null, version: null };
  }
}

async function resolveLinkedModel(
  tenantId: string,
  linkedModelAssetId: string,
): Promise<{ asset: AIAsset | null; version: ModelVersion | null }> {
  try {
    const asset = await getAssetById(tenantId, linkedModelAssetId);
    if (!asset) return { asset: null, version: null };
    const version = await getActiveModelVersionForAsset(tenantId, linkedModelAssetId);
    return { asset, version };
  } catch {
    return { asset: null, version: null };
  }
}

export async function resolveGovernedAgent(
  tenantId: string,
  agentId: string,
  _opts?: Record<string, unknown>,
): Promise<AgentGovernanceResolution> {
  const mode = await getTenantEnforcementMode(tenantId);

  const profile = AGENT_PROFILES.find((a) => a.id === agentId);
  const runtimePrompt = profile?.systemPrompt || '';

  const base: AgentGovernanceResolution = {
    tenant_id: tenantId,
    agent_id: agentId,
    enforcement_mode: mode,
    resolution_status: 'resolved_with_fallback',
    governed: false,
    mismatch: false,
    warnings: [],
    agent_asset: null,
    active_agent_version: null,
    linked_prompt_asset: null,
    active_prompt_version: null,
    linked_model_asset: null,
    active_model_version: null,
    resolved_system_prompt: runtimePrompt,
    resolved_model: null,
    resolved_agent_config: null,
    resolved_capabilities: [],
    fallback_used: true,
    tool_bindings_checked: false,
    governed_tool_asset_ids: [],
    tool_binding_advisory: null,
  };

  let asset: AIAsset | null = null;
  try {
    asset = await getAssetByKey(tenantId, 'agent', agentId);
  } catch {
    return base;
  }

  if (!asset) {
    const detail = `No governed asset found for agent '${agentId}'.`;
    if (mode === 'enforce') {
      await emitBridgeAudit(tenantId, agentId, 'ungoverned_agent_blocked', {
        after: { agent_id: agentId, reason: detail },
      });
      return {
        ...base,
        resolution_status: 'blocked_enforce',
        warnings: [detail + ' Agent usage blocked in enforce mode.'],
        resolved_system_prompt: '',
        fallback_used: false,
      };
    }
    if (mode === 'warn') {
      await emitBridgeAudit(tenantId, agentId, 'ungoverned_agent_warn', {
        after: { agent_id: agentId, reason: detail },
      });
      return {
        ...base,
        resolution_status: 'no_governed_agent_asset',
        warnings: [detail + ' Proceeding with runtime config (warn mode).'],
      };
    }
    await emitBridgeAudit(tenantId, agentId, 'ungoverned_agent_audit', {
      after: { agent_id: agentId, reason: detail },
    });
    return { ...base, resolution_status: 'no_governed_agent_asset' };
  }

  base.agent_asset = asset;

  let activeVersion: AgentVersion | null = null;
  try {
    activeVersion = await getActiveAgentVersionForAsset(tenantId, asset.asset_id);
  } catch {
    return base;
  }

  if (!activeVersion) {
    const detail = `Agent asset '${agentId}' exists but has no active governed version.`;
    if (mode === 'enforce') {
      await emitBridgeAudit(tenantId, agentId, 'no_active_version_blocked', {
        after: { asset_id: asset.asset_id, reason: detail },
      });
      return {
        ...base,
        resolution_status: 'blocked_enforce',
        warnings: [detail + ' Agent usage blocked in enforce mode.'],
        resolved_system_prompt: '',
        fallback_used: false,
      };
    }
    if (mode === 'warn') {
      await emitBridgeAudit(tenantId, agentId, 'no_active_version_warn', {
        after: { asset_id: asset.asset_id, reason: detail },
      });
      return {
        ...base,
        resolution_status: 'no_active_agent_version',
        warnings: [detail + ' Proceeding with runtime config (warn mode).'],
      };
    }
    await emitBridgeAudit(tenantId, agentId, 'no_active_version_audit', {
      after: { asset_id: asset.asset_id, reason: detail },
    });
    return { ...base, resolution_status: 'no_active_agent_version' };
  }

  base.active_agent_version = activeVersion;
  base.governed = true;
  base.resolved_agent_config = activeVersion.agent_config;
  base.resolved_capabilities = activeVersion.capabilities || [];

  try {
    base.tool_bindings_checked = true;
    const toolIds = await getEnabledToolAssetIdsForAgent(tenantId, asset.asset_id);
    base.governed_tool_asset_ids = toolIds;
    if (toolIds.length === 0) {
      base.tool_binding_advisory = `Agent asset '${asset.asset_id}' has no enabled tool bindings.`;
    }
  } catch {
    base.tool_binding_advisory = 'Tool binding check failed; skipping.';
  }

  let linkedPromptAsset: AIAsset | null = null;
  let activePromptVersion: PromptVersion | null = null;
  if (activeVersion.linked_prompt_asset_id) {
    const pr = await resolveLinkedPrompt(tenantId, activeVersion.linked_prompt_asset_id);
    linkedPromptAsset = pr.asset;
    activePromptVersion = pr.version;
    base.linked_prompt_asset = linkedPromptAsset;
    base.active_prompt_version = activePromptVersion;

    if (!activePromptVersion) {
      const detail = `Linked prompt asset '${activeVersion.linked_prompt_asset_id}' has no active version.`;
      base.warnings.push(detail);

      if (mode === 'enforce') {
        await emitBridgeAudit(tenantId, agentId, 'linked_prompt_missing_blocked', {
          after: { linked_prompt_asset_id: activeVersion.linked_prompt_asset_id, reason: detail },
        });
        return {
          ...base,
          resolution_status: 'blocked_enforce',
          mismatch: true,
          resolved_system_prompt: '',
          fallback_used: false,
        };
      }
    }
  }

  let linkedModelAsset: AIAsset | null = null;
  let activeModelVersion: ModelVersion | null = null;
  if (activeVersion.linked_model_asset_id) {
    const mr = await resolveLinkedModel(tenantId, activeVersion.linked_model_asset_id);
    linkedModelAsset = mr.asset;
    activeModelVersion = mr.version;
    base.linked_model_asset = linkedModelAsset;
    base.active_model_version = activeModelVersion;

    if (!activeModelVersion) {
      const detail = `Linked model asset '${activeVersion.linked_model_asset_id}' has no active version.`;
      base.warnings.push(detail);

      if (mode === 'enforce') {
        await emitBridgeAudit(tenantId, agentId, 'linked_model_missing_blocked', {
          after: { linked_model_asset_id: activeVersion.linked_model_asset_id, reason: detail },
        });
        return {
          ...base,
          resolution_status: 'blocked_enforce',
          mismatch: true,

          resolved_system_prompt: activeVersion.agent_config?.systemPrompt || runtimePrompt,
          fallback_used: false,
        };
      }
    }
  }

  if (activePromptVersion) {
    base.resolved_system_prompt = activePromptVersion.template_text;
  } else if (activeVersion.agent_config?.systemPrompt) {
    (base as any).resolved_system_prompt = activeVersion.agent_config.systemPrompt;
  } else {
    base.resolved_system_prompt = runtimePrompt;
  }

  if (activeModelVersion) {
    base.resolved_model = {
      provider: activeModelVersion.provider,
      provider_model_id: activeModelVersion.provider_model_id,
      config: activeModelVersion.config || {},
    };
  }

  if (!profile) {
    base.resolution_status = 'resolved_governed';
    base.fallback_used = false;
    return base;
  }

  const mismatches = detectAgentMismatches(profile, activeVersion, activePromptVersion, activeModelVersion);

  if (mismatches.length === 0) {
    base.resolution_status = 'resolved_governed';
    base.fallback_used = false;
    return base;
  }

  base.mismatch = true;
  base.warnings.push(...mismatches);

  if (mode === 'enforce') {
    base.resolution_status = 'blocked_enforce';
    base.fallback_used = false;
    await emitBridgeAudit(tenantId, agentId, 'mismatch_enforced', {
      before: { name: profile.name, domain: profile.domain },
      after: { config: activeVersion.agent_config, mismatches },
    });
  } else if (mode === 'warn') {
    base.resolution_status = 'runtime_registry_mismatch';
    base.fallback_used = false;
    await emitBridgeAudit(tenantId, agentId, 'mismatch_warn', {
      before: { name: profile.name, domain: profile.domain },
      after: { config: activeVersion.agent_config, mismatches },
    });
  } else {
    base.resolution_status = 'runtime_registry_mismatch';
    base.fallback_used = false;
    await emitBridgeAudit(tenantId, agentId, 'mismatch_audit', {
      before: { name: profile.name, domain: profile.domain },
      after: { config: activeVersion.agent_config, mismatches },
    });
  }

  return base;
}

export async function detectAllAgentMismatches(tenantId: string): Promise<AgentMismatchReport[]> {
  const reports: AgentMismatchReport[] = [];

  for (const profile of AGENT_PROFILES) {
    let asset: AIAsset | null = null;
    try {
      asset = await getAssetByKey(tenantId, 'agent', profile.id);
    } catch {
      continue;
    }

    if (!asset) {
      reports.push({
        agent_id: profile.id,
        tenant_id: tenantId,
        runtime: { name: profile.name, domain: profile.domain, system_prompt_length: profile.systemPrompt.length },
        registry: null,
        mismatches: [`No governed asset found for agent '${profile.id}'`],
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    let activeVersion: AgentVersion | null = null;
    try {
      activeVersion = await getActiveAgentVersionForAsset(tenantId, asset.asset_id);
    } catch {
      continue;
    }

    if (!activeVersion) {
      reports.push({
        agent_id: profile.id,
        tenant_id: tenantId,
        runtime: { name: profile.name, domain: profile.domain, system_prompt_length: profile.systemPrompt.length },
        registry: {
          version_number: null,
          deployment_status: null,
          agent_config_keys: null,
          capabilities_count: null,
          linked_prompt_asset_id: null,
          linked_model_asset_id: null,
        },
        mismatches: [`Agent asset '${profile.id}' has no active governed version`],
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    let activePrompt: PromptVersion | null = null;
    if (activeVersion.linked_prompt_asset_id) {
      try {
        activePrompt = await getActivePromptVersionForAsset(tenantId, activeVersion.linked_prompt_asset_id);
      } catch { /* non-fatal */ }
    }

    let activeModel: ModelVersion | null = null;
    if (activeVersion.linked_model_asset_id) {
      try {
        activeModel = await getActiveModelVersionForAsset(tenantId, activeVersion.linked_model_asset_id);
      } catch { /* non-fatal */ }
    }

    const mismatches = detectAgentMismatches(profile, activeVersion, activePrompt, activeModel);

    if (mismatches.length > 0) {
      reports.push({
        agent_id: profile.id,
        tenant_id: tenantId,
        runtime: { name: profile.name, domain: profile.domain, system_prompt_length: profile.systemPrompt.length },
        registry: {
          version_number: activeVersion.version_number,
          deployment_status: activeVersion.deployment_status,
          agent_config_keys: Object.keys(activeVersion.agent_config || {}),
          capabilities_count: (activeVersion.capabilities || []).length,
          linked_prompt_asset_id: activeVersion.linked_prompt_asset_id,
          linked_model_asset_id: activeVersion.linked_model_asset_id,
        },
        mismatches,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return reports;
}

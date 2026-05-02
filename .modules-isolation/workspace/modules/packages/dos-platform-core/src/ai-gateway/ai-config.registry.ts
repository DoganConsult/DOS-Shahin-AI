// ============================================
// Platform — Module AI Configuration Registry
// Manages per-module AI configuration with
// tenant-level overrides. Used by all modules
// to configure AI behavior, safety hooks,
// and human-in-loop boundaries.
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '../observability';

export interface ModuleAiConfig {
  moduleCode: string;
  enabled: boolean;
  allowedActions: readonly string[];
  blockedActions: readonly string[];
  humanInLoopBoundaries: {
    requiresHumanApproval: readonly string[];
    requiresHumanReview: readonly string[];
    autoExecutable: readonly string[];
  };
  modelDependencies: {
    primary: string;
    fallback: string;
    embeddingModel: string;
  };
  promptContracts: {
    maxInputTokens: number;
    maxOutputTokens: number;
    temperature: number;
    systemPromptTemplate: string;
  };
  safetyHooks: {
    inputValidation: boolean;
    outputValidation: boolean;
    promptInjectionProtection: boolean;
    piiRedaction: boolean;
    auditAllInvocations: boolean;
    maxInvocationsPerHour: number;
    rateLimitPerTenant: number;
  };
}

export interface TenantAiOverride {
  enabled?: boolean;
  maxOutputTokens?: number;
  temperature?: number;
  primaryModel?: string;
  fallbackModel?: string;
  maxInvocationsPerHour?: number;
  rateLimitPerTenant?: number;
}

const _defaults = new Map<string, ModuleAiConfig>();
const _tenantOverrideCache = new Map<string, { override: TenantAiOverride; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export function registerModuleAiConfig(config: ModuleAiConfig): void {
  if (_defaults.has(config.moduleCode)) {
    logger.warn(`[AiConfigRegistry] overwriting config for module '${config.moduleCode}'`);
  }
  _defaults.set(config.moduleCode, config);
}

export function getDefaultAiConfig(moduleCode: string): ModuleAiConfig | undefined {
  return _defaults.get(moduleCode);
}

function buildCacheKey(tenantId: string, moduleCode: string): string {
  return `${tenantId}::${moduleCode}`;
}

async function loadTenantOverride(tenantId: string, moduleCode: string): Promise<TenantAiOverride> {
  const key = buildCacheKey(tenantId, moduleCode);
  const cached = _tenantOverrideCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.override;

  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT config_value FROM "${schema}".module_ai_overrides WHERE module_code = $1 AND active = true LIMIT 1`,
      [moduleCode],
    );
    const row = result.rows[0];
    const override: TenantAiOverride = row?.config_value
      ? (typeof row.config_value === 'string' ? JSON.parse(row.config_value) : row.config_value)
      : {};
    _tenantOverrideCache.set(key, { override, expiresAt: Date.now() + CACHE_TTL_MS });
    return override;
  } catch {
    _tenantOverrideCache.set(key, { override: {}, expiresAt: Date.now() + CACHE_TTL_MS });
    return {};
  }
}

export async function resolveAiConfig(tenantId: string, moduleCode: string): Promise<ModuleAiConfig> {
  const base = _defaults.get(moduleCode);
  if (!base) throw new Error(`No AI config registered for module '${moduleCode}'`);

  const override = await loadTenantOverride(tenantId, moduleCode);
  if (!override || Object.keys(override).length === 0) return base;

  return {
    ...base,
    enabled: override.enabled ?? base.enabled,
    modelDependencies: {
      ...base.modelDependencies,
      primary: override.primaryModel ?? base.modelDependencies.primary,
      fallback: override.fallbackModel ?? base.modelDependencies.fallback,
    },
    promptContracts: {
      ...base.promptContracts,
      maxOutputTokens: override.maxOutputTokens ?? base.promptContracts.maxOutputTokens,
      temperature: override.temperature ?? base.promptContracts.temperature,
    },
    safetyHooks: {
      ...base.safetyHooks,
      maxInvocationsPerHour: override.maxInvocationsPerHour ?? base.safetyHooks.maxInvocationsPerHour,
      rateLimitPerTenant: override.rateLimitPerTenant ?? base.safetyHooks.rateLimitPerTenant,
    },
  };
}

export function invalidateTenantAiCache(tenantId: string, moduleCode?: string): void {
  if (moduleCode) {
    _tenantOverrideCache.delete(buildCacheKey(tenantId, moduleCode));
  } else {
    for (const key of _tenantOverrideCache.keys()) {
      if (key.startsWith(`${tenantId}::`)) _tenantOverrideCache.delete(key);
    }
  }
}

export function getAllRegisteredAiConfigs(): ReadonlyMap<string, ModuleAiConfig> {
  return _defaults;
}

export function isActionAllowed(config: ModuleAiConfig, action: string): boolean {
  return config.allowedActions.includes(action);
}

export function isActionBlocked(config: ModuleAiConfig, action: string): boolean {
  return config.blockedActions.includes(action);
}

export function requiresHumanApproval(config: ModuleAiConfig, action: string): boolean {
  return config.humanInLoopBoundaries.requiresHumanApproval.includes(action);
}

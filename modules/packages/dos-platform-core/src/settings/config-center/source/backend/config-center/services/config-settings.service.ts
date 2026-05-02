import { tenantSchema, safeQuery } from '../ports/database.port';
import {
  getSetting as getSettingFromResolver,
  getSettingsForScope as getSettingsForScopeFromResolver,
  upsertSetting as upsertSettingInResolver,
  validateScopeContext,
} from '@dos/platform-core/settings/settings-resolver.service';
import type { SettingsScope, SettingsContext, SettingRecord } from '@dos/platform-core/settings/settings-resolver.service';
import { CONFIG_OWNERSHIP_MAP } from '../../../platform/contracts/config-boundary';
import type { ConfigFieldEntry } from '../../../platform/contracts/config-boundary';
import { logConfigChange } from './config-audit.service';
import { logger } from '../ports/logger.port';

export interface SettingWriteOptions {
  scope?: SettingsScope;
  moduleCode?: string;
  productKey?: string;
  workspaceId?: string;
  reason?: string;
}

function buildContext(tenantId: string, scope: SettingsScope, opts?: SettingWriteOptions): SettingsContext {
  return {
    schema: tenantSchema(tenantId),
    scope,
    productKey: opts?.productKey ?? undefined,
    moduleCode: opts?.moduleCode ?? undefined,
    workspaceId: opts?.workspaceId ?? undefined,
  };
}

function findBoundaryEntry(key: string): ConfigFieldEntry | undefined {
  const envKey = key.replace(/\./g, '_').toUpperCase();
  return CONFIG_OWNERSHIP_MAP.find(e => e.key === envKey);
}

function isSensitiveKey(key: string): boolean {
  return findBoundaryEntry(key)?.sensitive ?? false;
}

function maskValue(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  const str = String(value);
  if (str.length < 8) return '****';
  return str.slice(0, 4) + '****' + str.slice(-4);
}

function enforceWriteGate(key: string): void {
  const entry = findBoundaryEntry(key);
  if (!entry) return;

  if (!entry.mutable) {
    throw new Error(`Config key '${key}' is immutable (owner: ${entry.owner}). Cannot write through settings API.`);
  }

  if (entry.owner === 'environment' || entry.owner === 'deployment') {
    throw new Error(
      `Config key '${key}' is owned by '${entry.owner}' and must be set via ` +
      `environment variables or deployment profile, not through the settings API.`
    );
  }

  if (entry.sensitive) {
    logger.info(`[ConfigCenter] Write to sensitive key '${key}' — value will be audited but masked in responses.`);
  }

  if (entry.deprecation) {
    logger.warn(
      `[ConfigCenter] Writing to deprecated key '${key}'. ` +
      `Replacement: ${entry.deprecation.replacementKey ?? 'none'}. ` +
      `Removal: ${entry.deprecation.removalVersion}.`
    );
  }
}

export async function getConfigSetting(tenantId: string, scope: SettingsScope, key: string, opts?: SettingWriteOptions): Promise<SettingRecord | null> {
  const ctx = buildContext(tenantId, scope, opts);
  const value = await getSettingFromResolver(ctx, key);
  if (value === undefined) return null;
  return {
    key,
    value: isSensitiveKey(key) ? maskValue(value) : value,
    scope,
    productKey: opts?.productKey,
    moduleCode: opts?.moduleCode,
    workspaceId: opts?.workspaceId,
  };
}

export async function getConfigSettingsForScope(tenantId: string, scope: SettingsScope, opts?: SettingWriteOptions): Promise<SettingRecord[]> {
  const ctx = buildContext(tenantId, scope, opts);
  const records = await getSettingsForScopeFromResolver(ctx);
  return records.map(r => ({
    ...r,
    value: isSensitiveKey(r.key) ? maskValue(r.value) : r.value,
  }));
}

export async function upsertConfigSetting(
  tenantId: string,
  key: string,
  value: unknown,
  actorId: string,
  opts?: SettingWriteOptions
): Promise<void> {
  enforceWriteGate(key);

  const scope: SettingsScope = opts?.scope ?? 'tenant';
  const ctx = buildContext(tenantId, scope, opts);
  validateScopeContext(ctx);

  const oldValue = await getSettingFromResolver(ctx, key);

  await upsertSettingInResolver(ctx, key, value);

  await logConfigChange({
    tenantId,
    configKey: key,
    scope,
    oldValue: oldValue ?? null,
    newValue: value,
    changeType: oldValue !== undefined ? 'update' : 'set',
    actorId,
    actorType: 'user',
    source: 'api',
    reason: opts?.reason,
    moduleCode: opts?.moduleCode,
    productKey: opts?.productKey,
    workspaceId: opts?.workspaceId,
  });
}

export async function deleteConfigSetting(tenantId: string, key: string, scope: SettingsScope, actorId: string, opts?: SettingWriteOptions): Promise<void> {
  enforceWriteGate(key);

  const ctx = buildContext(tenantId, scope, opts);
  const oldValue = await getSettingFromResolver(ctx, key);

  await safeQuery(
    `DELETE FROM "${ctx.schema}".tenant_settings WHERE key = $1 AND scope = $2`,
    [key, scope]
  );

  await logConfigChange({
    tenantId,
    configKey: key,
    scope,
    oldValue: oldValue ?? null,
    newValue: null,
    changeType: 'delete',
    actorId,
    actorType: 'user',
    source: 'api',
    reason: opts?.reason,
    moduleCode: opts?.moduleCode,
    productKey: opts?.productKey,
    workspaceId: opts?.workspaceId,
  });
}

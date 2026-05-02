import { safeQuery, tenantSchema } from '../ports/database.port';
import type { ConfigDiff } from '../contracts/config-center.contracts';
import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';
import { UnifiedConfigService } from '@dos/platform-core/settings/unified-config.service';

interface RawSetting {
  key: string;
  value: string;
  scope: string;
  module_code: string | null;
}

async function loadTenantSettings(tenantId: string, scope?: SettingsScope): Promise<Map<string, RawSetting>> {
  const schema = tenantSchema(tenantId);
  const conditions = scope ? `WHERE scope = $1` : '';
  const params = scope ? [scope] : [];

  const { rows } = await safeQuery(
    `SELECT key, value, scope, module_code FROM "${schema}".tenant_settings ${conditions} ORDER BY key`,
    params
  );

  const map = new Map<string, RawSetting>();
  for (const row of rows) {
    map.set(row.key as string, row as RawSetting);
  }
  return map;
}

function tryParse(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

export async function compareTenants(tenantA: string, tenantB: string, scope?: SettingsScope): Promise<ConfigDiff[]> {
  const [settingsA, settingsB] = await Promise.all([
    loadTenantSettings(tenantA, scope),
    loadTenantSettings(tenantB, scope),
  ]);

  const allKeys = new Set([...settingsA.keys(), ...settingsB.keys()]);
  const diffs: ConfigDiff[] = [];

  for (const key of allKeys) {
    const a = settingsA.get(key);
    const b = settingsB.get(key);
    const valA = a ? tryParse(a.value) : undefined;
    const valB = b ? tryParse(b.value) : undefined;
    const match = JSON.stringify(valA) === JSON.stringify(valB);

    diffs.push({
      key,
      scope: a?.scope ?? b?.scope ?? 'unknown',
      valueA: valA,
      valueB: valB,
      sourceA: a ? `tenant:${tenantA}` : 'missing',
      sourceB: b ? `tenant:${tenantB}` : 'missing',
      match,
    });
  }

  return diffs;
}

export async function compareTenantToDefaults(tenantId: string): Promise<ConfigDiff[]> {
  const settings = await loadTenantSettings(tenantId);
  const diffs: ConfigDiff[] = [];

  for (const [key, setting] of settings) {
    const platformMeta = UnifiedConfigService.resolveSyncWithMetadata(key);
    const tenantVal = tryParse(setting.value);
    const platformVal = platformMeta.value;
    const match = JSON.stringify(tenantVal) === JSON.stringify(platformVal);

    diffs.push({
      key,
      scope: setting.scope,
      valueA: tenantVal,
      valueB: platformVal,
      sourceA: `tenant:${tenantId}`,
      sourceB: platformMeta.source,
      match,
    });
  }

  return diffs;
}

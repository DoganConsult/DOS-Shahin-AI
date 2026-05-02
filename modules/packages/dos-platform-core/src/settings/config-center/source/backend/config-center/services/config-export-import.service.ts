import { safeQuery, tenantSchema } from '../ports/database.port';
import { upsertSetting } from '@dos/platform-core/settings/settings-resolver.service';
import type { SettingsScope, SettingsContext } from '@dos/platform-core/settings/settings-resolver.service';
import type { ConfigSnapshot, ConfigImportResult } from '../contracts/config-center.contracts';
import { logConfigChange } from './config-audit.service';

function tryParse(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  try { return JSON.parse(val); } catch { return val; }
}

export async function exportConfig(tenantId: string, exportedBy: string, scopes?: SettingsScope[]): Promise<ConfigSnapshot> {
  const schema = tenantSchema(tenantId);
  const conditions = scopes?.length ? `WHERE scope = ANY($1)` : '';
  const params = scopes?.length ? [scopes] : [];

  const { rows } = await safeQuery(
    `SELECT key, value, scope, module_code FROM "${schema}".tenant_settings ${conditions} ORDER BY key`,
    params
  );

  const settings: ConfigSnapshot['settings'] = {};
  const scopeBreakdown: Record<string, number> = {};

  for (const row of rows) {
    const key = row.key as string;
    const scope = row.scope as string;
    settings[key] = {
      value: tryParse(row.value),
      scope,
      moduleCode: (row.module_code as string) ?? undefined,
    };
    scopeBreakdown[scope] = (scopeBreakdown[scope] ?? 0) + 1;
  }

  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    exportedBy,
    version: '1.0.0',
    scopes: scopes ?? Object.keys(scopeBreakdown) as SettingsScope[],
    settings,
    metadata: {
      settingCount: rows.length,
      scopeBreakdown,
    },
  };
}

export async function importConfig(
  tenantId: string,
  snapshot: ConfigSnapshot,
  actorId: string,
  dryRun: boolean = false
): Promise<ConfigImportResult> {
  const schema = tenantSchema(tenantId);
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [key, entry] of Object.entries(snapshot.settings)) {
    try {
      const scope = entry.scope as SettingsScope;
      if (!['platform', 'product', 'tenant', 'workspace', 'module', 'user'].includes(scope)) {
        errors.push(`Invalid scope '${scope}' for key '${key}'`);
        skipped++;
        continue;
      }

      if (!dryRun) {
        const ctx: SettingsContext = {
          schema,
          scope,
          moduleCode: entry.moduleCode ?? undefined,
        };
        await upsertSetting(ctx, key, entry.value);

        await logConfigChange({
          tenantId,
          configKey: key,
          scope,
          oldValue: null,
          newValue: entry.value,
          changeType: 'import',
          actorId,
          actorType: 'import',
          source: 'config-center-import',
          reason: `Imported from snapshot exported at ${snapshot.exportedAt}`,
          moduleCode: entry.moduleCode,
        });
      }
      imported++;
    } catch (err) {
      errors.push(`Failed to import key '${key}': ${String(err)}`);
      skipped++;
    }
  }

  return { imported, skipped, errors, dryRun };
}

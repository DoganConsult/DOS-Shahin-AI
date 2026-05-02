import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface RuntimeControlConfig {
  key: string;
  value: string;
  updatedAt: string;
}

export class GovernanceAiRuntimeControlService {
  async getSettings(tenantId: string): Promise<RuntimeControlConfig[]> {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT key, value, updated_at FROM "${schema}".module_settings WHERE module_code = $1 ORDER BY key`,
      ['governance-ai'],
    ), { tenantId, operation: 'getSettings' });

    return result.rows.map(( r: Record<string, unknown>) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
  }

  async updateSetting(tenantId: string, key: string, value: string, actorId: string): Promise<boolean> {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `INSERT INTO "${schema}".module_settings (module_code, key, value, updated_by, updated_at)
       VALUES ('governance-ai', $1, $2, $3, NOW())
       ON CONFLICT (module_code, key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [key, value, actorId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getFeatureFlags(tenantId: string): Promise<Record<string, boolean>> {
    const schema = tenantSchema(tenantId);
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1 AND key LIKE 'feature.%'`,
      ['governance-ai'],
    ), { tenantId, operation: 'getFeatureFlags' });
    const flags: Record<string, boolean> = {};
    for (const row of result.rows) {

      flags[row.key.replace('feature.', '')] = row.value === 'true';
    }
    return flags;
  }
}

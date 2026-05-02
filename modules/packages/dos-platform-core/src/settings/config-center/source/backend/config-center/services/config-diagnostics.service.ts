import { safeQuery, tenantSchema } from '../ports/database.port';
import { validateAllConfigEntries } from '../../../config/env-check';
import { detectScopeAmbiguities } from '@dos/platform-core/settings/settings-resolver.service';
import type { EnvValidationResult } from '../../../config/env-check';

export interface ConfigDiagnosticsReport {
  envValidation: EnvValidationResult;
  scopeAmbiguities: string[];
  auditLogStats: {
    totalEntries: number;
    last24hEntries: number;
    recentErrors: number;
  };
  staleSettings: { key: string; scope: string; updatedAt: string }[];
  tableHealth: { tableName: string; exists: boolean; rowCount: number }[];
}

export async function runConfigDiagnostics(tenantId: string): Promise<ConfigDiagnosticsReport> {
  const schema = tenantSchema(tenantId);

  const envValidation = validateAllConfigEntries();

  let scopeAmbiguities: string[] = [];
  try {
    scopeAmbiguities = await detectScopeAmbiguities(schema);
  } catch { /* table may not exist */ }

  let auditLogStats = { totalEntries: 0, last24hEntries: 0, recentErrors: 0 };
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".config_center_audit_log`
    );
    const last24hResult = await safeQuery(
      `SELECT COUNT(*) as cnt FROM "${schema}".config_center_audit_log WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    auditLogStats = {
      totalEntries: parseInt(totalResult.rows[0]?.cnt ?? '0', 10),
      last24hEntries: parseInt(last24hResult.rows[0]?.cnt ?? '0', 10),
      recentErrors: 0,
    };
  } catch { /* table may not exist */ }

  let staleSettings: ConfigDiagnosticsReport['staleSettings'] = [];
  try {
    const staleResult = await safeQuery(
      `SELECT key, scope, updated_at FROM "${schema}".tenant_settings
       WHERE updated_at < NOW() - INTERVAL '90 days'
       ORDER BY updated_at ASC LIMIT 50`
    );
    staleSettings = staleResult.rows.map((r: Record<string, unknown>) => ({
      key: String(r.key),
      scope: String(r.scope),
      updatedAt: String(r.updated_at),
    }));
  } catch { /* table may not exist */ }

  const tables = [
    'tenant_settings',
    'config_center_audit_log',
    'tenant_config_versions',
  ];
  const tableHealth: ConfigDiagnosticsReport['tableHealth'] = [];
  for (const tableName of tables) {
    try {
      const result = await safeQuery(
        `SELECT COUNT(*) as cnt FROM "${schema}"."${tableName}"`
      );
      tableHealth.push({
        tableName,
        exists: true,
        rowCount: parseInt(result.rows[0]?.cnt ?? '0', 10),
      });
    } catch {
      tableHealth.push({ tableName, exists: false, rowCount: 0 });
    }
  }

  return {
    envValidation,
    scopeAmbiguities,
    auditLogStats,
    staleSettings,
    tableHealth,
  };
}

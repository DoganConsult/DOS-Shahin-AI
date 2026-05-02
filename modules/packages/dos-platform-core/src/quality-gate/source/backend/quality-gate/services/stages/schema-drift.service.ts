/**
 * Stage 2: Schema Drift Detection Service
 * Runs the Schema Drift Oracle against a specific tenant schema.
 * Stores findings in qgate_schema_drift_log.
 */

import { safeQuery, tenantSchema, assertTenantId } from '../../ports/database.port';
import { SchemaDriftOracle } from '../../../../tests/quality-gate/40-integration/schema-drift/schema-drift-oracle';
import type { StageResult, SchemaDriftReport as _SchemaDriftReport } from '../../contracts/quality-gate.contracts';

export async function evaluateSchemaDrift(tenantId: string, runId: string): Promise<StageResult> {
  const start = Date.now();
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  const queryFn = async (sql: string, params?: unknown[]) => safeQuery(sql, params);
  const oracle = new SchemaDriftOracle(tenantId, queryFn, schema);
  const report = await oracle.run();

  // Persist drift findings
  for (const drift of report.drifts) {
    await safeQuery(
      `INSERT INTO "${schema}".qgate_schema_drift_log
       (run_id, tenant_id, severity, category, table_name, column_name, expected_value, actual_value, detail)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [runId, tenantId, drift.severity, drift.category,
       drift.table ?? null, drift.column ?? null,
       drift.expected ?? null, drift.actual ?? null, drift.detail],
    );
  }

  const blockers: StageResult['blockers'] = report.drifts
    .filter(d => d.severity === 'critical')
    .map(d => ({ code: `DRIFT_${d.category.toUpperCase()}`, message: d.detail, severity: 'critical' }));

  return {
    stageCode: 'integration',
    stageNumber: 2,
    passed: report.verdict !== 'FAIL',
    score: report.criticalDrifts === 0 ? 1.0 : 0.0,
    threshold: 1.0,
    durationMs: Date.now() - start,
    blockers,
    details: {
      verdict: report.verdict,
      totalDrifts: report.totalDrifts,
      criticalDrifts: report.criticalDrifts,
      warningDrifts: report.warningDrifts,
      extensions: report.extensionHealth,
    },
  };
}

export async function getDriftFindings(tenantId: string, opts?: { severity?: string; resolved?: boolean }): Promise<Record<string, unknown>[]> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  const conditions = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];

  if (opts?.severity) {
    conditions.push(`severity = $${params.length + 1}`);
    params.push(opts.severity);
  }
  if (opts?.resolved !== undefined) {
    conditions.push(`resolved = $${params.length + 1}`);
    params.push(opts.resolved);
  } else {
    conditions.push('resolved = false');
  }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".qgate_schema_drift_log WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  return result.rows;
}

export async function resolveDrift(tenantId: string, driftId: string, userId: string): Promise<void> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".qgate_schema_drift_log SET resolved = true, resolved_at = NOW(), resolved_by = $1 WHERE drift_id = $2`,
    [userId, driftId],
  );
}

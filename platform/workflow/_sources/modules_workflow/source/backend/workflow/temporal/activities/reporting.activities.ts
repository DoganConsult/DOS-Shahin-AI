import { logger } from '../../modules/governance-os/platform/services/misc/logger.service';
import { executeJobByName } from '@dos/platform-core/jobs';
import { safeQuery, assertTenantId } from '@dos/db';
import { toErrorMessage } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';

async function safeRows(text: string, params?: unknown[]): Promise<GenericRow[]> {
  try { const r = await safeQuery(text, params); return r.rows; } catch { return []; }
}

export async function runReportScheduleExecution(tenantId: string): Promise<{ reportsTriggered: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('report-schedule-execution');
    return { reportsTriggered: 1 };
  } catch (err: unknown) {
    logger.warn(`[Reporting] report-schedule non-fatal: ${toErrorMessage(err)}`);
    return { reportsTriggered: 0 };
  }
}

export async function aggregateKpis(tenantId: string): Promise<{ kpisAggregated: number }> {
  assertTenantId(tenantId);
  try {
    await executeJobByName('kpi-aggregation');
    return { kpisAggregated: 1 };
  } catch (err: unknown) {
    logger.warn(`[Reporting] kpi-agg non-fatal: ${toErrorMessage(err)}`);
    return { kpisAggregated: 0 };
  }
}

export async function snapshotMetrics(tenantId: string): Promise<{ snapshotCreated: boolean }> {
  assertTenantId(tenantId);
  try {
    const result = await safeRows(
      `INSERT INTO agrc_metrics_snapshots (tenant_id, snapshot_at, payload) VALUES ($1, NOW(), '{}') RETURNING id`,
      [tenantId]
    );
    return { snapshotCreated: !!result[0]?.id };
  } catch (err: unknown) {
    logger.warn(`[Reporting] metrics snapshot non-fatal: ${toErrorMessage(err)}`);
    return { snapshotCreated: false };
  }
}

export async function runAuditCommitteeReport(tenantId: string): Promise<{ reportGenerated: boolean }> {
  assertTenantId(tenantId);
  try {
    const { generateExecutiveSummary } = await import('../../modules/audit/services/audit/reporting/audit-committee-reporting.service.js');
    await generateExecutiveSummary(tenantId);
    return { reportGenerated: true };
  } catch (err: unknown) {
    logger.warn(`[Reporting] audit committee non-fatal: ${toErrorMessage(err)}`);
    return { reportGenerated: false };
  }
}

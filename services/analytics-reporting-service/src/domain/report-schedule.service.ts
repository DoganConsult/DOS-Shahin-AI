import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ReportScheduleRecord {
  schedule_id: string;
  tenant_id: string;
  report_type: string;
  title: string;
  description: string;
  frequency: string;
  recipients: unknown;
  filters: unknown;
  format: string;
  status: string;
  last_run_at: string | null;
  next_run_at: string | null;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateReportScheduleInput {
  report_type: string;
  title: string;
  description?: string;
  frequency: string;
  recipients?: unknown;
  filters?: unknown;
  format?: string;
  status?: string;
  last_run_at?: string;
  next_run_at?: string;
  owner_id?: string;
}

export interface ListReportScheduleOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `schedule_id, tenant_id, report_type, title, description, frequency, recipients, filters, format, status, last_run_at, next_run_at, owner_id, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListReportScheduleOptions = {},
): Promise<{ data: ReportScheduleRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = options.sortBy && ['created_at', 'updated_at', 'title', 'status'].includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.report_schedules ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.report_schedules ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ReportScheduleRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to list report-schedules', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<ReportScheduleRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.report_schedules WHERE tenant_id = $1 AND schedule_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as ReportScheduleRecord) || null;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to get report-schedule', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateReportScheduleInput): Promise<ReportScheduleRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.report_schedules (schedule_id, tenant_id, report_type, title, description, frequency, recipients, filters, format, status, last_run_at, next_run_at, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.report_type ?? null, input.title ?? null, input.description ?? null, input.frequency ?? null, input.recipients ?? null, input.filters ?? null, input.format ?? null, input.status ?? null, input.last_run_at ?? null, input.next_run_at ?? null, input.owner_id ?? null],
    );
    logger.info('[analytics-reporting-service] ReportSchedule created', { id, tenantId });
    return result.rows[0] as ReportScheduleRecord;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to create report-schedule', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateReportScheduleInput>): Promise<ReportScheduleRecord | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, id];
  let idx = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${col} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      `UPDATE dos.report_schedules SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND schedule_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[analytics-reporting-service] ReportSchedule updated', { id, tenantId });
    return (result.rows[0] as ReportScheduleRecord) || null;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to update report-schedule', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.report_schedules SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND schedule_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[analytics-reporting-service] ReportSchedule deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to delete report-schedule', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.report_schedules SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND schedule_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[analytics-reporting-service] ReportSchedule restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to restore report-schedule', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateReportScheduleInput[]): Promise<ReportScheduleRecord[]> {
  const results: ReportScheduleRecord[] = [];
  for (const input of items) {
    results.push(await create(tenantId, input));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  try {
    const result = await safeQuery(
      `UPDATE dos.report_schedules SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND schedule_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.report_schedules WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.report_schedules WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[analytics-reporting-service] Failed to get report-schedule stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/analytics with try/catch guards

/**
 * Generate executive narrative report.
 */
export async function generateExecutiveNarrative(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/analytics/dist/analytics/services/misc/executive-narrative.service') as any;
    return mod.generateExecutiveNarrative(tenantId);
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module generateExecutiveNarrative unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get analytics dashboard data for reporting.
 */
export async function getAnalyticsDashboard(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/analytics/dist/analytics/services/analytics/analytics-dashboard.service') as any;
    return mod.getAnalyticsDashboard(tenantId);
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module getAnalyticsDashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get cross-module aggregated analytics.
 */
export async function getCrossModuleAggregation(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/analytics/dist/analytics/services/analytics/analytics-cross-module-aggregator.service') as any;
    return mod.getCrossModuleAggregation(tenantId);
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module getCrossModuleAggregation unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get usage forecasting data.
 */
export async function getUsageForecast(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/analytics/dist/analytics/services/misc/usage-forecaster.service') as any;
    return mod.getUsageForecast(tenantId);
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module getUsageForecast unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get telemetry aggregation data.
 */
export async function getTelemetryAggregation(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/analytics/dist/analytics/services/misc/telemetry-aggregator.service') as any;
    return mod.getTelemetryAggregation(tenantId);
  } catch (err) {
    logger.warn('[analytics-reporting-service] Module getTelemetryAggregation unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const ReportScheduleService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, generateExecutiveNarrative, getAnalyticsDashboard, getCrossModuleAggregation, getUsageForecast, getTelemetryAggregation };

import { safeQuery, tenantSchema } from '../ports/database.port';
import { REPORTING_BUSINESS_THRESHOLDS, REPORTING_TIMEOUTS } from '../data/reporting-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".reporting_reports
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalReports: number;
  scheduledReports: number;
  activeGenerating: number;
  completedReports: number;
  failedReports: number;
  generationSuccessRate: number;
  avgGenerationMinutes: number;
  failedLast24h: number;
  distributedLast30d: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COUNT(*)::int AS total_reports,
      COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled_reports,
      COUNT(*) FILTER (WHERE status = 'generating')::int AS active_generating,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_reports,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_reports,
      CASE WHEN COUNT(*) FILTER (WHERE status IN ('completed', 'failed')) > 0
        THEN ROUND(
          COUNT(*) FILTER (WHERE status = 'completed')::numeric /
          COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::numeric * 100, 2)
        ELSE 0
      END AS generation_success_rate,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
      ) FILTER (WHERE status = 'completed'), 0)::int AS avg_generation_minutes,
      COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed_last_24h,
      COUNT(*) FILTER (WHERE status = 'completed' AND updated_at > NOW() - INTERVAL '30 days')::int AS distributed_last_30d
    FROM "${schema}".reporting_reports WHERE deleted_at IS NULL
  `);
  const row = result.rows[0] || {};
  return {
    totalReports: row.total_reports || 0,
    scheduledReports: row.scheduled_reports || 0,
    activeGenerating: row.active_generating || 0,
    completedReports: row.completed_reports || 0,
    failedReports: row.failed_reports || 0,
    generationSuccessRate: Number(row.generation_success_rate) || 0,
    avgGenerationMinutes: row.avg_generation_minutes || 0,
    failedLast24h: row.failed_last_24h || 0,
    distributedLast30d: row.distributed_last_30d || 0,
  };
}

export async function getReportTypeBreakdown(tenantId: string): Promise<Array<{
  reportType: string;
  count: number;
  completedCount: number;
  failedCount: number;
  avgGenerationMinutes: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(report_type, 'unclassified') AS report_type,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      COALESCE(AVG(
        EXTRACT(EPOCH FROM (updated_at - created_at)) / 60
      ) FILTER (WHERE status = 'completed'), 0)::int AS avg_generation_minutes
    FROM "${schema}".reporting_reports WHERE deleted_at IS NULL
    GROUP BY report_type ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    reportType: r.report_type,
    count: r.count,
    completedCount: r.completed_count,
    failedCount: r.failed_count,
    avgGenerationMinutes: r.avg_generation_minutes || 0,
  }));
}

export async function getScheduleBreakdown(tenantId: string): Promise<Array<{
  hasSchedule: boolean;
  count: number;
  activeCount: number;
  failedCount: number;
  staleCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      (schedule_cron IS NOT NULL) AS has_schedule,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status NOT IN ('archived', 'failed'))::int AS active_count,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${REPORTING_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days')::int AS stale_count
    FROM "${schema}".reporting_reports WHERE deleted_at IS NULL
    GROUP BY has_schedule ORDER BY has_schedule DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    hasSchedule: r.has_schedule,
    count: r.count,
    activeCount: r.active_count,
    failedCount: r.failed_count,
    staleCount: r.stale_count,
  }));
}

export async function getFormatBreakdown(tenantId: string): Promise<Array<{
  format: string;
  count: number;
  completedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      COALESCE(format, 'unspecified') AS format,
      COUNT(*)::int AS count,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_count
    FROM "${schema}".reporting_reports WHERE deleted_at IS NULL
    GROUP BY format ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    format: r.format,
    count: r.count,
    completedCount: r.completed_count,
  }));
}

export async function getFailedReports(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  reportType: string;
  format: string;
  failedAt: string;
  minutesSinceFailed: number;
  hasSchedule: boolean;
  retryCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      id, title, report_type, format, updated_at AS failed_at,
      EXTRACT(EPOCH FROM (NOW() - updated_at) / 60)::int AS minutes_since_failed,
      (schedule_cron IS NOT NULL) AS has_schedule,
      COALESCE(retry_count, 0)::int AS retry_count
    FROM "${schema}".reporting_reports
    WHERE deleted_at IS NULL AND status = 'failed'
    ORDER BY updated_at DESC
    LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    reportType: r.report_type,
    format: r.format,
    failedAt: r.failed_at,
    minutesSinceFailed: r.minutes_since_failed || 0,
    hasSchedule: r.has_schedule,
    retryCount: r.retry_count,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN '0-1h'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN '1-24h'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '1-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        ELSE '30d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".reporting_reports
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  reportType?: string;
  format?: string;
  hasSchedule?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const sortBy = params.sortBy || 'created_at';
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (params.query) {
    conditions.push(`(title ILIKE $${idx} OR report_type ILIKE $${idx})`);
    values.push(`%${params.query}%`);
    idx++;
  }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.reportType) { conditions.push(`report_type = $${idx}`); values.push(params.reportType); idx++; }
  if (params.format) { conditions.push(`format = $${idx}`); values.push(params.format); idx++; }
  if (params.hasSchedule !== undefined) {
    conditions.push(params.hasSchedule ? 'schedule_cron IS NOT NULL' : 'schedule_cron IS NULL');
  }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".reporting_reports WHERE ${where}`,
    values,
  );
  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".reporting_reports WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, pageSize, offset],
  );
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.reportType) { conditions.push(`report_type = $${idx}`); values.push(filters.reportType); idx++; }
  if (filters?.format) { conditions.push(`format = $${idx}`); values.push(filters.format); idx++; }
  const result = await safeQuery(
    `SELECT * FROM "${schema}".reporting_reports WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx}`,
    [...values, REPORTING_BUSINESS_THRESHOLDS.DISTRIBUTION_RETRY_MAX * 10000],
  );
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT r.id, r.title, r.status, r.report_type, r.format, r.created_at,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".reporting_reports r
    JOIN "${schema}".entity_links el ON el.source_entity_id = r.id AND el.source_module = 'reporting'
    WHERE r.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY r.created_at DESC
  `, [linkedModule]);
  return result.rows;
}

export async function getStuckGenerating(tenantId: string): Promise<Array<{
  id: string;
  title: string;
  reportType: string;
  minutesStuck: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, title, report_type,
      EXTRACT(EPOCH FROM (NOW() - updated_at) / 60)::int AS minutes_stuck
    FROM "${schema}".reporting_reports
    WHERE deleted_at IS NULL AND status = 'generating'
      AND updated_at < NOW() - INTERVAL '${REPORTING_TIMEOUTS.GENERATION_TIMEOUT_SECONDS} seconds'
    ORDER BY updated_at ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    title: r.title,
    reportType: r.report_type,
    minutesStuck: r.minutes_stuck || 0,
  }));
}

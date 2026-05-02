// ============================================
// Reporting Module — Repository Layer
// Encapsulates data access for reports, report_schedules,
// and report_shares aggregate roots.
// Services call these methods instead of raw safeQuery().
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ── Types ────────────────────────────────────────────

export interface CreateReportInput {
  title: string;
  type: string;
  parameters?: Record<string, unknown>;
  generated_by: string;
  report_type?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ListReportsFilter {
  type?: string;
  generated_by?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface CreateScheduleInput {
  report_type?: string;
  report_template_id?: string;
  title: string;
  frequency: string;
  cron_expression?: string;
  parameters?: Record<string, unknown>;
  recipients?: unknown[];
  next_run_at?: string;
  format?: string;
  created_by: string;
}

export interface UpdateScheduleInput {
  title?: string;
  frequency?: string;
  format?: string;
  active?: boolean;
  recipients?: unknown[];
  next_run_at?: string;
}

export interface CreateShareInput {
  report_id: string;
  shared_by: string;
  recipient_id: string;
  recipient_type: 'user' | 'team';
}

// ── Repository ───────────────────────────────────────

export class ReportingRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  // ── Reports ──────────────────────────────────────────

  async findReportById(reportId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".reports WHERE report_id = $1`,
      [reportId],
    );
    return getFirstRow(result);
  }

  async findAllReports(filters: ListReportsFilter = {}): Promise<{ rows: GenericRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.type) { conditions.push(`type = $${idx++}`); params.push(filters.type); }
    if (filters.generated_by) { conditions.push(`generated_by = $${idx++}`); params.push(filters.generated_by); }
    if (filters.search) {
      conditions.push(`(title ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }
    if (filters.dateFrom) { conditions.push(`generated_at >= $${idx++}::timestamptz`); params.push(filters.dateFrom); }
    if (filters.dateTo) { conditions.push(`generated_at <= $${idx++}::timestamptz`); params.push(filters.dateTo); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const offset = (page - 1) * pageSize;

    const SORTABLE: Record<string, string> = {
      generated_at: 'generated_at',
      title: 'title',
      type: 'type',
      created_at: 'created_at',
    };
    const sortCol = SORTABLE[filters.sortBy || ''] || 'generated_at';
    const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".reports ${where}`,
      params,
    );
    const total = getFirstRow(countResult)?.total ?? 0;

    const dataResult = await safeQuery(
      `SELECT report_id, title, type, parameters, generated_by, generated_at, created_at
       FROM "${this.schema}".reports ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, pageSize, offset],
    );

    return { rows: dataResult.rows, total };
  }

  async createReport(data: CreateReportInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".reports
        (title, type, parameters, generated_by, generated_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        data.title,
        data.type,
        data.parameters ? JSON.stringify(data.parameters) : '{}',
        data.generated_by,
      ],
    );
    return getFirstRow(result);
  }

  async softDeleteReport(reportId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".reports
       SET deleted_at = NOW()
       WHERE report_id = $1 AND deleted_at IS NULL
       RETURNING report_id`,
      [reportId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async countReports(): Promise<number> {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM "${this.schema}".reports WHERE deleted_at IS NULL`,
    );
    return getFirstRow(result)?.total ?? 0;
  }

  // ── Report Schedules ─────────────────────────────────

  async findAllSchedules(activeOnly = true): Promise<GenericRow[]> {
    const filter = activeOnly ? 'WHERE active = true' : '';
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".report_schedules
       ${filter}
       ORDER BY next_run_at ASC`,
    );
    return result.rows;
  }

  async findScheduleById(scheduleId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `SELECT * FROM "${this.schema}".report_schedules WHERE schedule_id = $1`,
      [scheduleId],
    );
    return getFirstRow(result);
  }

  async createSchedule(data: CreateScheduleInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".report_schedules
        (report_template_id, title, frequency, cron_expression, recipients, next_run_at, format, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz, $7, $8)
       RETURNING *`,
      [
        data.report_template_id || data.report_type || null,
        data.title,
        data.frequency,
        data.cron_expression || null,
        data.recipients ? JSON.stringify(data.recipients) : '[]',
        data.next_run_at || null,
        data.format || 'pdf',
        data.created_by,
      ],
    );
    return getFirstRow(result);
  }

  async updateSchedule(scheduleId: string, data: UpdateScheduleInput): Promise<GenericRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) { fields.push(`title = $${idx++}`); params.push(data.title); }
    if (data.frequency !== undefined) { fields.push(`frequency = $${idx++}`); params.push(data.frequency); }
    if (data.format !== undefined) { fields.push(`format = $${idx++}`); params.push(data.format); }
    if (data.active !== undefined) { fields.push(`active = $${idx++}`); params.push(data.active); }
    if (data.recipients !== undefined) { fields.push(`recipients = $${idx++}::jsonb`); params.push(JSON.stringify(data.recipients)); }
    if (data.next_run_at !== undefined) { fields.push(`next_run_at = $${idx++}::timestamptz`); params.push(data.next_run_at); }

    if (fields.length === 0) return null;
    fields.push('updated_at = NOW()');
    params.push(scheduleId);

    const result = await safeQuery(
      `UPDATE "${this.schema}".report_schedules
       SET ${fields.join(', ')}
       WHERE schedule_id = $${idx}
       RETURNING *`,
      params,
    );
    return getFirstRow(result);
  }

  async softDeleteSchedule(scheduleId: string): Promise<boolean> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".report_schedules
       SET active = false
       WHERE schedule_id = $1
       RETURNING schedule_id`,
      [scheduleId],
    );
    return (result.rows?.length ?? 0) > 0;
  }

  async toggleScheduleEnabled(scheduleId: string): Promise<GenericRow | null> {
    const result = await safeQuery(
      `UPDATE "${this.schema}".report_schedules
       SET enabled = NOT enabled
       WHERE schedule_id = $1
       RETURNING *`,
      [scheduleId],
    );
    return getFirstRow(result);
  }

  // ── Report Shares ────────────────────────────────────

  async findSharesByReportId(reportId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT share_id, report_id, shared_by, recipient_id, recipient_type, shared_at
       FROM "${this.schema}".report_shares
       WHERE report_id = $1
       ORDER BY shared_at DESC`,
      [reportId],
    );
    return result.rows;
  }

  async findSharesByRecipient(recipientId: string): Promise<GenericRow[]> {
    const result = await safeQuery(
      `SELECT rs.share_id, rs.report_id, rs.shared_by, rs.recipient_id, rs.recipient_type, rs.shared_at,
              r.title AS report_title, r.type AS report_type
       FROM "${this.schema}".report_shares rs
       LEFT JOIN "${this.schema}".reports r ON r.report_id = rs.report_id
       WHERE rs.recipient_id = $1
       ORDER BY rs.shared_at DESC`,
      [recipientId],
    );
    return result.rows;
  }

  async createShare(data: CreateShareInput): Promise<GenericRow | null> {
    const result = await safeQuery(
      `INSERT INTO "${this.schema}".report_shares
        (report_id, shared_by, recipient_id, recipient_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (report_id, recipient_id) DO UPDATE SET
         shared_by = EXCLUDED.shared_by, recipient_type = EXCLUDED.recipient_type
       RETURNING share_id, report_id, shared_by, recipient_id, recipient_type, shared_at`,
      [data.report_id, data.shared_by, data.recipient_id, data.recipient_type],
    );
    return getFirstRow(result);
  }

  async deleteShare(shareId: string): Promise<boolean> {
    const result = await safeQuery(
      `DELETE FROM "${this.schema}".report_shares WHERE share_id = $1 RETURNING share_id`,
      [shareId],
    );
    return (result.rows?.length ?? 0) > 0;
  }
}

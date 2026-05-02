// @ts-nocheck
// Auto-extracted Action repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class ActionAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".action_items ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".action_items ${where}`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".action_items WHERE item_id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".action_items WHERE item_id = $1`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".action_items WHERE item_id = $1`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".action_items ai
           WHERE ai.created_at::date = d.date::date
         ), 0) AS actions_created,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".action_items ai
           WHERE ai.status = 'completed'
             AND ai.updated_at::date = d.date::date
         ), 0) AS actions_completed
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue_actions,
         COUNT(*) FILTER (
           WHERE assigned_to IS NULL
             AND status NOT IN ('completed', 'closed')
         )::int AS unassigned_items
       FROM "${schema}".action_items`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue,
         COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
         COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE priority = 'low')::int AS low,
         COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('completed', 'closed'))::int AS unassigned
       FROM "${schema}".action_items`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT from_status AS "fromStatus", to_status AS "toStatus", changed_by AS "changedBy", reason, changed_at AS "changedAt" FROM "${schema}".action_status_history WHERE action_id = $1 ORDER BY changed_at ASC`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".action_status_history (action_id, from_status, to_status, changed_by, reason, changed_at) VALUES ($1,$2,$3,$4,$5,NOW())`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".action_items SET status = $1, updated_at = NOW(), updated_by = $2 WHERE id = $3`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".action_items WHERE id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total_with_deadline,
       COUNT(*) FILTER (WHERE status = 'completed' AND updated_at::date <= deadline::date) AS on_time,
       COUNT(*) FILTER (WHERE status = 'overdue' OR (deadline::date < NOW()::date AND status NOT IN ('completed','cancelled'))) AS overdue,
       AVG(EXTRACT(EPOCH FROM (deadline::timestamptz - NOW())) / 86400)
         FILTER (WHERE status NOT IN ('completed','cancelled')) AS avg_days_to_deadline
     FROM "${schema}".action_items
     WHERE ${conditions.join(' AND ')}`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_open
     FROM "${schema}".action_items
     WHERE status NOT IN ('completed', 'cancelled') ${extra}`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT
       source_type,
       AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS avg_days,
       MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS min_days,
       MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS max_days,
       COUNT(*) AS cnt
     FROM "${schema}".action_items
     WHERE status = 'completed' AND updated_at IS NOT NULL
     GROUP BY source_type
     ORDER BY avg_days DESC`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT
       assigned_to,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       AVG(CASE WHEN status = 'completed' AND created_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 ELSE NULL END) AS avg_resolution_days
     FROM "${schema}".action_items
     GROUP BY assigned_to
     ORDER BY total DESC`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT
       source_type,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue
     FROM "${schema}".action_items
     GROUP BY source_type
     ORDER BY total DESC`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled
     FROM "${schema}".action_items ${where}`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".action_evidence WHERE item_id = $1 ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".action_evidence
       (evidence_id, item_id, description, file_reference, submitted_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT ad.*, ai.status AS depends_on_status, ai.title AS depends_on_title
       FROM "${schema}".action_dependencies ad
       JOIN "${schema}".action_items ai ON ai.item_id = ad.depends_on_item_id
       WHERE ad.item_id = $1`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT ad.*, ai.status AS depends_on_status, ai.title AS depends_on_title
       FROM "${schema}".action_dependencies ad
       JOIN "${schema}".action_items ai ON ai.item_id = ad.depends_on_item_id
       WHERE ad.item_id = $1 AND ad.depends_on_item_id = $2`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".action_dependencies (dependency_id, item_id, depends_on_item_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (item_id, depends_on_item_id) DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".action_blockers WHERE item_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".action_blockers
     SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
     WHERE blocker_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".action_blockers
       (blocker_id, item_id, description, reported_by, status)
     VALUES ($1,$2,$3,$4,'open') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".action_evidence WHERE item_id = $1`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `SELECT ad.*, ai.status AS depends_on_status, ai.title AS depends_on_title
       FROM "${schema}".action_dependencies ad
       JOIN "${schema}".action_items ai ON ai.item_id = ad.depends_on_item_id
       WHERE ad.item_id = $1`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".action_blockers WHERE item_id = $1 AND status = 'open'`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT item_id, title, status, updated_at FROM "${schema}".action_items WHERE item_id = $1`;
    return safeQuery(query, args);
  }

}

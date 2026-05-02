// @ts-nocheck
// Auto-extracted Remediation repository
import { safeQuery, tenantSchema as _tenantSchema, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class RemediationAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_tasks (task_id, title, description, task_type, entity_type, entity_id, assigned_to, status, priority, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'policy_review', 'policy', $3, $4, 'open', 'high', NOW())
           ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".policies SET status = 'review_pending', updated_at = NOW() WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT policy_id, title, review_date, owner
     FROM "${schema}".policies
     WHERE status = 'published' AND review_date < NOW()
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".notification_queue (notification_id, recipient_id, notification_type, subject, body, created_at)
         VALUES (gen_random_uuid(), $1, 'sla_breach', $2, $3, NOW())
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks SET escalation_level = $1, breached_at = COALESCE(breached_at, NOW()), updated_at = NOW() WHERE task_id = $2`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `SELECT pt.task_id, pt.title, pt.assigned_to, pt.due_at, pt.escalation_level,
            EXTRACT(EPOCH FROM (NOW() - pt.due_at)) / 3600 AS hours_overdue
     FROM "${schema}".process_tasks pt
     WHERE pt.status IN ('open', 'in_progress')
       AND pt.due_at < NOW()
       AND (pt.escalation_level IS NULL OR pt.escalation_level < 3)
     ORDER BY hours_overdue DESC
     LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks SET assigned_to = $1, status = 'in_progress', updated_at = NOW() WHERE task_id = $2`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT tm.user_id, u.full_name,
                (SELECT COUNT(*) FROM "${schema}".process_tasks WHERE assigned_to = tm.user_id AND status IN ('open', 'in_progress'))::int AS workload
         FROM "${schema}".team_members tm
         JOIN public.users u ON u.user_id = tm.user_id
         WHERE tm.is_active = true
         ORDER BY workload ASC
         LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT pt.task_id, pt.title, pt.task_type, pt.entity_type, pt.priority
     FROM "${schema}".process_tasks pt
     WHERE pt.status = 'open' AND pt.assigned_to IS NULL
     ORDER BY CASE pt.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
     LIMIT 15`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_tasks (task_id, title, description, task_type, entity_type, entity_id, status, priority, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'evidence_collection', 'evidence_task', $3, 'open', 'medium', NOW())
         ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".evidence_tasks SET status = 'pending_collection', updated_at = NOW() WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT et.task_id, et.control_id, et.title, et.status, et.last_collected_at
     FROM "${schema}".evidence_tasks et
     WHERE et.status != 'archived'
       AND (et.last_collected_at IS NULL OR et.last_collected_at < NOW() - INTERVAL '30 days')
     LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
     VALUES ('remediation_cycle', 'system', $1, $2::jsonb, NOW())`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(${mapping.classCol}, 'internal') AS classification
     FROM "${schema}".${mapping.table}
     WHERE ${mapping.idCol} = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT MAX(dc.sensitivity_level) AS max_level
     FROM "${schema}".data_classifications dc
     INNER JOIN "${schema}".rbac_role_permissions rp ON rp.permission_code LIKE 'data_classification.' || dc.code || '.%'
     INNER JOIN "${schema}".rbac_user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1 AND dc.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".remediation_tasks ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".remediation_tasks ${where}`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".remediation_tasks rt
           WHERE rt.created_at::date = d.date::date
         ), 0) AS tasks_created,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".remediation_tasks rt
           WHERE rt.status = 'completed'
             AND rt.updated_at::date = d.date::date
         ), 0) AS tasks_completed
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue_tasks
       FROM "${schema}".remediation_tasks`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue
       FROM "${schema}".remediation_tasks`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".remediation_tasks WHERE status = 'blocked' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".remediation_tasks WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".remediation_tasks WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'remediation' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'remediation','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_plan_templates ORDER BY name ASC`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_milestones SET status = $1, updated_at = NOW() WHERE milestone_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_milestones WHERE plan_id = $1 ORDER BY sort_order ASC, created_at ASC`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_milestones
       (milestone_id, plan_id, title, description, due_date, assigned_to, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_plans
     SET version = version + 1, status = 'draft', approved_by = NULL, approved_at = NULL, updated_at = NOW()
     WHERE plan_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_plans
     SET status = $1, approved_by = $2, approved_at = NOW(),
         description = CASE WHEN $3::text IS NOT NULL
           THEN description || E'\n[Approval note] ' || $3::text ELSE description END,
         updated_at = NOW()
     WHERE plan_id = $4 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_plans SET ${sets.join(', ')} WHERE plan_id = $${idx} RETURNING *`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_plans WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_plans ${where} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_plans
       (plan_id, title, description, finding_id, task_id, owner_id,
        status, version, estimated_cost, currency, start_date, target_date)
     VALUES ($1,$2,$3,$4,$5,$6,'draft',1,$7,$8,$9,$10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(SUM(estimated_cost), 0) AS total FROM "${schema}".remediation_plans`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".remediation_milestones
       WHERE status NOT IN ('completed') AND due_date < $1`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status IN ('approved', 'in_progress')) AS in_progress,
         COUNT(*) FILTER (WHERE target_date < $1 AND status NOT IN ('completed')) AS breached
       FROM "${schema}".remediation_plans`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `SELECT owner_id, COALESCE(SUM(estimated_cost), 0) AS total
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL
       GROUP BY owner_id ORDER BY total DESC LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT status, COALESCE(SUM(estimated_cost), 0) AS total
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL
       GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(SUM(estimated_cost), 0) AS total, MAX(currency) AS currency
       FROM "${schema}".remediation_plans WHERE estimated_cost IS NOT NULL`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT
       TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
       COUNT(*) AS created,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       AVG(CASE WHEN status = 'completed' AND updated_at IS NOT NULL
           THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400 ELSE NULL END) AS avg_days
     FROM "${schema}".remediation_plans
     WHERE created_at >= NOW() - INTERVAL '${monthsBack} months'
     GROUP BY DATE_TRUNC('month', created_at)
     ORDER BY month ASC`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `SELECT owner_id, COUNT(*) AS breach_count
     FROM "${schema}".remediation_plans
     WHERE target_date < $1 AND status NOT IN ('completed')
     GROUP BY owner_id ORDER BY breach_count DESC LIMIT 10`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE target_date >= $1 OR status = 'completed' OR target_date IS NULL) AS compliant,
       COUNT(*) FILTER (WHERE target_date < $1 AND status NOT IN ('completed')) AS non_compliant,
       AVG(CASE WHEN target_date < $1 AND status NOT IN ('completed')
           THEN EXTRACT(EPOCH FROM (NOW() - target_date)) / 86400 ELSE NULL END) AS avg_days_overdue
     FROM "${schema}".remediation_plans`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT
       rp.owner_id,
       COUNT(*) AS total_plans,
       COUNT(*) FILTER (WHERE rp.status IN ('approved', 'in_progress')) AS active_plans,
       COUNT(*) FILTER (WHERE rp.status = 'completed') AS completed_plans,
       COALESCE(AVG(
         CASE WHEN (
           SELECT COUNT(*) FROM "${schema}".remediation_milestones rm WHERE rm.plan_id = rp.plan_id
         ) > 0 THEN (
           SELECT COUNT(*) FILTER (WHERE rm2.status = 'completed') * 100.0 /
                  NULLIF(COUNT(*), 0)
           FROM "${schema}".remediation_milestones rm2 WHERE rm2.plan_id = rp.plan_id
         ) ELSE 0 END
       ), 0) AS avg_completion,
       (SELECT COUNT(*) FROM "${schema}".remediation_milestones rm3
        WHERE rm3.plan_id = ANY(ARRAY_AGG(rp.plan_id))
          AND rm3.status != 'completed' AND rm3.due_date < $1) AS total_overdue,
       COUNT(*) FILTER (WHERE rp.target_date < $1 AND rp.status NOT IN ('completed')) AS sla_breaches
     FROM "${schema}".remediation_plans rp
     GROUP BY rp.owner_id
     ORDER BY total_plans DESC`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `SELECT
       rp.plan_id, rp.title, rp.owner_id, rp.status,
       rp.estimated_cost, rp.target_date,
       COUNT(rm.milestone_id) AS total_milestones,
       COUNT(rm.milestone_id) FILTER (WHERE rm.status = 'completed') AS completed_milestones,
       COUNT(rm.milestone_id) FILTER (WHERE rm.status = 'overdue') AS overdue_milestones,
       (SELECT COUNT(*) FROM "${schema}".remediation_blockers rb
        WHERE rb.plan_id = rp.plan_id AND rb.status = 'open') AS open_blockers
     FROM "${schema}".remediation_plans rp
     LEFT JOIN "${schema}".remediation_milestones rm ON rm.plan_id = rp.plan_id
     ${where}
     GROUP BY rp.plan_id, rp.title, rp.owner_id, rp.status, rp.estimated_cost, rp.target_date
     ORDER BY rp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `SELECT DATE(updated_at) AS day, COUNT(*) AS cnt
     FROM "${schema}".remediation_milestones
     WHERE plan_id = $1 AND status = 'completed'
     GROUP BY DATE(updated_at) ORDER BY day ASC`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS total FROM "${schema}".remediation_milestones WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT start_date, target_date FROM "${schema}".remediation_plans WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_plan_dependencies WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_plan_dependencies
       (dependency_id, plan_id, depends_on_plan_id, type)
     VALUES ($1,$2,$3,$4) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_blockers WHERE plan_id = $1 ${extra} ORDER BY severity DESC, created_at ASC`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_blockers
     SET status = 'resolved', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
     WHERE blocker_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_blockers
       (blocker_id, plan_id, milestone_id, title, description, reported_by, status, severity)
     VALUES ($1,$2,$3,$4,$5,$6,'open',$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_milestones
     SET status = $1, updated_at = NOW()
     WHERE milestone_id = $2`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `SELECT target_date FROM "${schema}".remediation_plans WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT status, due_date FROM "${schema}".remediation_milestones WHERE plan_id = $1`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_verifications
     WHERE status = 'requires_reverification' AND next_verification_date <= $1
     ORDER BY next_verification_date ASC`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_evidence WHERE verification_id = $1 ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_evidence
       (evidence_id, verification_id, title, description, evidence_type, file_reference, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET status = 'requires_reverification', next_verification_date = $1, updated_at = NOW()
     WHERE verification_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET signed_off_by = $1, signed_off_at = NOW(), updated_at = NOW()
     WHERE verification_id = $2 AND status = 'accepted' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(),
         rejection_reason = $2, updated_at = NOW()
     WHERE verification_id = $3 AND status = 'under_review' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET status = 'accepted', reviewed_by = $1, reviewed_at = NOW(),
         next_verification_date = $2, updated_at = NOW()
     WHERE verification_id = $3 AND status = 'under_review' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET status = 'under_review', reviewed_by = $1, updated_at = NOW()
     WHERE verification_id = $2 AND status = 'evidence_submitted' RETURNING *`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_verifications
     SET status = 'evidence_submitted', submitted_by = $1, submitted_at = NOW(), updated_at = NOW()
     WHERE verification_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_verifications WHERE verification_id = $1`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_verifications ${where} ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_verifications
       (verification_id, plan_id, task_id, title, requirement_description, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_tasks
     SET status = 'overdue'
     WHERE status NOT IN ('completed', 'overdue')
       AND due_date IS NOT NULL
       AND due_date < NOW()
     RETURNING task_id`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".remediation_tasks WHERE task_id = $1 RETURNING task_id`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_tasks SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      linked_entity_type = COALESCE($3, linked_entity_type),
      linked_entity_id = COALESCE($4, linked_entity_id),
      assigned_to = COALESCE($5, assigned_to),
      status = COALESCE($6, status),
      priority = COALESCE($7, priority),
      due_date = COALESCE($8, due_date),
      completed_at = COALESCE($9, completed_at)
     WHERE task_id = $10
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".remediation_tasks WHERE created_by = $1 OR assigned_to = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_tasks
      (task_id, title, description, linked_entity_type, linked_entity_id,
       assigned_to, created_by, status, priority, due_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`;
    return safeQuery(query, args);
  }

}

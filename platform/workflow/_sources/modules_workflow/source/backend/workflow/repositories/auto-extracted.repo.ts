// Auto-extracted repository
import { safeQuery, emptyResult as _emptyResult, withTransaction as _withTransaction } from '../ports/database.port';

export class WorkflowAutoRepo {

  static async query1(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".workflows WHERE status = 'overdue' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query2(schema: string, args: unknown[]) {
    const query = `SELECT id, status, updated_at AS "updatedAt" FROM "${schema}".workflows WHERE status = 'stalled' ORDER BY updated_at ASC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query3(schema: string, args: unknown[]) {
    const query = `SELECT id, status, created_at FROM "${schema}".workflows WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query4(schema: string, args: unknown[]) {
    const query = `SELECT before_state AS "fromStatus", after_state AS "toStatus", user_id AS "changedBy", created_at AS "changedAt" FROM "${schema}".audit_trail WHERE entity_id = $1 AND module = 'workflow' AND action = 'transition' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query5(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1,$2,'workflow','transition',$3,$4,$5,$6)`;
    return safeQuery(query, args);
  }

  static async query6(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}"."${table}" SET status = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query7(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}"."${table}" WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query8(schema: string, args: unknown[]) {
    const query = `SELECT
         wd.code,
         wd.version,
         wd.definition_id,
         wd.status,
         wd.promoted_at,
         COUNT(we.execution_id)::int AS running_instances,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_definitions wd2
          WHERE wd2.code = wd.code AND wd2.status = 'deprecated' AND wd2.deleted_at IS NULL
         ) AS deprecated_version_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.status = 'active' AND wd.deleted_at IS NULL
       GROUP BY wd.definition_id, wd.code, wd.version, wd.status, wd.promoted_at
       ORDER BY wd.code`;
    return safeQuery(query, args);
  }

  static async query9(schema: string, args: unknown[]) {
    const query = `SELECT wd.*,
         COUNT(we.execution_id)::int AS active_instance_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.code = $1 AND wd.deleted_at IS NULL
       GROUP BY wd.definition_id
       ORDER BY wd.version DESC`;
    return safeQuery(query, args);
  }

  static async query10(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_executions
           SET workflow_id = $1, updated_at = NOW()
           WHERE execution_id = $2`;
    return safeQuery(query, args);
  }

  static async query11(schema: string, args: unknown[]) {
    const query = `SELECT execution_id FROM "${schema}".workflow_executions we
       JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       WHERE wd.code = $1 AND wd.version = $2 AND we.status = 'running' AND we.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query12(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions
     WHERE code = $1 AND status = 'active' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query13(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions
     WHERE definition_id = $1 AND version = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query14(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET status = 'deprecated', change_notes = $1, updated_at = NOW()
     WHERE definition_id = $2
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query15(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_executions
     WHERE workflow_id = $1 AND status = 'running' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query16(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions
     WHERE definition_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query17(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET status = 'active', promoted_at = NOW(), promoted_by = $1,
         change_notes = $2, updated_at = NOW()
     WHERE definition_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query18(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET status = 'deprecated', updated_at = NOW()
     WHERE code = $1 AND status = 'active' AND definition_id != $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query19(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions
     WHERE definition_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query20(schema: string, args: unknown[]) {
    const query = `SELECT task_id, control_id, evidence_requirement_id, due_date, status
       FROM "${schema}".evidence_tasks
       WHERE tenant_id = $1 AND status IN ('pending','overdue')
         AND due_date IS NOT NULL AND due_date < NOW()
       ORDER BY due_date ASC
       LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query21(schema: string, args: unknown[]) {
    const query = `SELECT alert_id, title, description, severity, alert_type, entity_type, entity_id, created_at
       FROM "${schema}".ai_alerts
       WHERE tenant_id = $1 AND status = 'open'
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
         created_at DESC
       LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query22(schema: string, args: unknown[]) {
    const query = `SELECT decision_id, explanation, outcome, entity_type, entity_id, agent_id, created_at
       FROM "${schema}".decision_record
       WHERE tenant_id = $1
         AND decision_type = 'recommendation'
         AND outcome->>'status' = 'pending'
       ORDER BY created_at DESC
       LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query23(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, description, priority, entity_type, entity_id, due_date, status
       FROM "${schema}".process_tasks
       WHERE tenant_id = $1
         AND (assigned_user_id = $2 OR assigned_user_id IS NULL)
         AND status IN ('pending','in_progress')
       ORDER BY
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN 0 ELSE 1 END,
         due_date ASC NULLS LAST
       LIMIT $3`;
    return safeQuery(query, args);
  }

  static async query24(schema: string, args: unknown[]) {
    const query = `SELECT AVG(confidence) AS avg_conf FROM "${schema}".workflow_agent_decisions WHERE agent_id = $1`;
    return safeQuery(query, args);
  }

  static async query25(schema: string, args: unknown[]) {
    const query = `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'active')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated
     FROM "${schema}".workflow_agent_assignments
     WHERE agent_id = $1`;
    return safeQuery(query, args);
  }

  static async query26(schema: string, args: unknown[]) {
    const query = `SELECT id, task_id, agent_id, decision, reasoning, confidence, platform_mode, reviewed_by_human, created_at
     FROM "${schema}".workflow_agent_decisions
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    return safeQuery(query, args);
  }

  static async query27(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail
         (tenant_id, user_id, module, action, entity_type, entity_id, after_state, created_at)
       VALUES ($1, $2, 'workflow', 'agent_decision', 'task', $3, $4::jsonb, NOW())`;
    return safeQuery(query, args);
  }

  static async query28(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_agent_decisions
       (task_id, agent_id, decision, reasoning, confidence, platform_mode, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`;
    return safeQuery(query, args);
  }

  static async query29(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_agent_assignments SET status = 'escalated', completed_at = NOW() WHERE task_id = $1 AND agent_id = $2`;
    return safeQuery(query, args);
  }

  static async query30(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
       SET assigned_to = NULL, status = 'pending', notes = COALESCE(notes, '') || $1
       WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query31(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_agent_assignments SET status = 'completed', completed_at = NOW() WHERE task_id = $1 AND agent_id = $2`;
    return safeQuery(query, args);
  }

  static async query32(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks SET status = 'completed', completed_at = NOW(), completed_by = $1 WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query33(schema: string, args: unknown[]) {
    const query = `SELECT wa.id, wa.task_id, wa.agent_id, wa.mode, wa.status, wa.assigned_at, wa.completed_at
     FROM "${schema}".workflow_agent_assignments wa
     WHERE ${conditions.join(' AND ')}
     ORDER BY wa.assigned_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query34(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks SET assigned_to = $1, updated_at = NOW() WHERE id = $2`;
    return safeQuery(query, args);
  }

  static async query35(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_agent_assignments
         (task_id, agent_id, mode, status, assigned_by, assigned_at)
       VALUES ($1, $2, $3, 'active', $4, NOW())
       RETURNING id, task_id, agent_id, mode, status, assigned_at, completed_at`;
    return safeQuery(query, args);
  }

  static async query36(schema: string, args: unknown[]) {
    const query = `SELECT id, status, module_code, assigned_to FROM "${schema}".process_tasks WHERE id = $1`;
    return safeQuery(query, args);
  }

  static async query37(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail
       (tenant_id, user_id, module, action, entity_type, entity_id, after_state, created_at)
     VALUES ($1, $2, 'workflow', 'agent_policy_decision', 'agent', $3, $4::jsonb, NOW())`;
    return safeQuery(query, args);
  }

  static async query38(schema: string, args: unknown[]) {
    const query = `SELECT agent_id, status, capabilities FROM public.agent_registry WHERE agent_id = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query39(schema: string, args: unknown[]) {
    const query = `SELECT id, status, capabilities FROM "${schema}".ai_agents WHERE id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query40(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_ai_policies
       (module_code, allow_observe, allow_suggest, allow_execute,
        restricted_actions, max_confidence_threshold, require_human_review_above_risk,
        updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (module_code) DO UPDATE SET
       allow_observe = $2, allow_suggest = $3, allow_execute = $4,
       restricted_actions = $5, max_confidence_threshold = $6,
       require_human_review_above_risk = $7, updated_by = $8, updated_at = NOW()`;
    return safeQuery(query, args);
  }

  static async query41(schema: string, args: unknown[]) {
    const query = `SELECT module_code, allow_observe, allow_suggest, allow_execute,
              restricted_actions, max_confidence_threshold,
              require_human_review_above_risk, updated_at
       FROM "${schema}".workflow_ai_policies
       WHERE module_code = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query42(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_ai_budget
     SET current_executions = 0, current_cost_units = 0,
         period_start = NOW(), period_end = $1
     WHERE budget_id = $2`;
    return safeQuery(query, args);
  }

  static async query43(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_ai_budget
       (tenant_id, period_type, max_executions, max_cost_units, period_end)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, period_type) WHERE is_active = TRUE DO UPDATE SET
       max_executions = EXCLUDED.max_executions,
       max_cost_units = EXCLUDED.max_cost_units,
       period_end = EXCLUDED.period_end
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query44(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_ai_budget
     SET current_executions = current_executions + 1,
         current_cost_units = current_cost_units + $1
     WHERE tenant_id = $2 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query45(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_ai_budget
     WHERE tenant_id = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query46(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_ai_budget
     WHERE tenant_id = $1 AND period_type = $2 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query47(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_ai_notes
     WHERE review_required = TRUE AND reviewed_at IS NULL AND deleted_at IS NULL
     ORDER BY created_at ASC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query48(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_ai_notes
     SET reviewed_by = $1, reviewed_at = NOW(), review_decision = $2
     WHERE note_id = $3 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query49(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_ai_notes n
     WHERE ${where.join(' AND ')}
     ORDER BY n.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`;
    return safeQuery(query, args);
  }

  static async query50(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_ai_notes n WHERE ${where.join(' AND ')}`;
    return safeQuery(query, args);
  }

  static async query51(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_ai_notes
       (instance_id, step_id, agent_id, note_type, content, confidence,
        trust_level, disclaimer, review_required, context_sources)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query52(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".workflow_ai_policy WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query53(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_ai_policy
       (workflow_id, ai_enabled, autonomy_level, allowed_ai_actions,
        forbidden_actions, max_confidence_auto, require_human_review, override_tenant_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workflow_id) DO UPDATE SET
       ai_enabled = COALESCE(EXCLUDED.ai_enabled, workflow_ai_policy.ai_enabled),
       autonomy_level = COALESCE(EXCLUDED.autonomy_level, workflow_ai_policy.autonomy_level),
       allowed_ai_actions = COALESCE(EXCLUDED.allowed_ai_actions, workflow_ai_policy.allowed_ai_actions),
       forbidden_actions = COALESCE(EXCLUDED.forbidden_actions, workflow_ai_policy.forbidden_actions),
       max_confidence_auto = COALESCE(EXCLUDED.max_confidence_auto, workflow_ai_policy.max_confidence_auto),
       require_human_review = COALESCE(EXCLUDED.require_human_review, workflow_ai_policy.require_human_review),
       override_tenant_config = COALESCE(EXCLUDED.override_tenant_config, workflow_ai_policy.override_tenant_config),
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query54(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_ai_policy WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query55(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".workflow_definitions ${where} GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query56(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total FROM "${schema}".workflow_definitions ${where}`;
    return safeQuery(query, args);
  }

  static async query57(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions WHERE definition_id = $1`;
    return safeQuery(query, args);
  }

  static async query58(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions WHERE definition_id = $1`;
    return safeQuery(query, args);
  }

  static async query59(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions WHERE definition_id = $1`;
    return safeQuery(query, args);
  }

  static async query60(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_recommendation_catalog
     WHERE is_active = TRUE
       AND ($1 = ANY(applicable_step_types) OR 'any' = ANY(applicable_step_types))
     ORDER BY category, recommendation_type`;
    return safeQuery(query, args);
  }

  static async query61(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_recommendation_catalog
       (recommendation_type, display_name_en, display_name_ar, category,
        applicable_step_types, requires_human_review, max_confidence_for_auto)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (recommendation_type) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       category = EXCLUDED.category,
       applicable_step_types = EXCLUDED.applicable_step_types,
       requires_human_review = EXCLUDED.requires_human_review,
       max_confidence_for_auto = EXCLUDED.max_confidence_for_auto,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query62(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_recommendation_catalog
     WHERE recommendation_type = $1`;
    return safeQuery(query, args);
  }

  static async query63(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_recommendation_catalog ${whereClause}
     ORDER BY category, recommendation_type`;
    return safeQuery(query, args);
  }

  static async query64(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_step_autonomy
     SET is_active = FALSE WHERE scope_id = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query65(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_step_autonomy
       (workflow_id, step_type, step_sub_type, allowed_ai_actions,
        max_autonomy_level, mandatory_human_review, max_confidence_required)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query66(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_step_autonomy
     WHERE is_active = TRUE
       AND step_type = $1
       AND (step_sub_type IS NULL OR step_sub_type = $2)
       AND (workflow_id IS NULL OR workflow_id = $3)
     ORDER BY
       CASE WHEN workflow_id IS NOT NULL AND step_sub_type IS NOT NULL THEN 0
            WHEN workflow_id IS NOT NULL THEN 1
            WHEN step_sub_type IS NOT NULL THEN 2
            ELSE 3 END
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query67(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_step_autonomy ${whereClause}
     ORDER BY step_type, step_sub_type`;
    return safeQuery(query, args);
  }

  static async query68(schema: string, args: unknown[]) {
    const query = `SELECT title, inherent_score, residual_score, owner FROM "${schema}".risks WHERE risk_id = $1`;
    return safeQuery(query, args);
  }

  static async query69(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".controls WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query70(schema: string, args: unknown[]) {
    const query = `SELECT title, status, content FROM "${schema}".policies WHERE policy_id = $1`;
    return safeQuery(query, args);
  }

  static async query71(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_pre_screens ORDER BY created_at DESC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query72(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_pre_screens WHERE approval_id = $1 ORDER BY created_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query73(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approval_pre_screens
       (approval_id, agent_id, recommendation, supporting_evidence, gaps_found, confidence_score, summary)
     VALUES ($1, 'AGENT-A01', $2, $3, $4, $5, $6) RETURNING pre_screen_id, created_at`;
    return safeQuery(query, args);
  }

  static async query74(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_requests WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query75(schema: string, args: unknown[]) {
    const query = `SELECT user_id FROM "${schema}".users WHERE role = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query76(schema: string, args: unknown[]) {
    const query = `SELECT ura.user_id FROM "${schema}".enterprise_user_role_assignments ura
           WHERE ura.functional_role_code = $1
           ${step.moduleCode ? 'AND ura.module_code = $2' : ''}
           AND ura.is_active = TRUE AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
           ORDER BY ura.is_primary DESC, ura.created_at ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query77(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approval_requests
       SET approver_chain = $1, updated_at = NOW()
       WHERE approval_id = $2`;
    return safeQuery(query, args);
  }

  static async query78(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approval_requests
       SET status = 'rejected', completed_at = NOW(), updated_at = NOW()
       WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query79(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approval_requests
         SET current_step = $1, current_approver_id = $2,
             sla_deadline = NOW() + INTERVAL '72 hours', updated_at = NOW()
         WHERE approval_id = $3`;
    return safeQuery(query, args);
  }

  static async query80(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approval_requests
         SET status = 'approved', completed_at = NOW(), updated_at = NOW()
         WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query81(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approval_decisions
       (approval_id, approver_id, step, decision, reason)
     VALUES ($1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query82(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_requests WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query83(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_decisions
     WHERE approval_id = $1
     ORDER BY step ASC, decided_at ASC`;
    return safeQuery(query, args);
  }

  static async query84(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_requests WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query85(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_requests
     WHERE status = 'pending'
       AND (current_approver_id = $1
            OR (current_approver_id IS NULL AND approver_chain IS NOT NULL))
     ORDER BY created_at DESC
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query86(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".approval_requests ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query87(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approval_requests
       (entity_type, entity_id, action, requested_by, route_id, approver_chain, current_step, status, context,
        current_approver_id, sla_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 'pending', $7, $8, NOW() + INTERVAL '72 hours')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query88(schema: string, args: unknown[]) {
    const query = `SELECT config_value FROM "${schema}".tenant_config
     WHERE config_key = 'approvalRouting' LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query89(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_draft_actions
     WHERE status = 'pending' AND deleted_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at ASC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query90(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_draft_actions
     SET status = 'converted', converted_entity_type = $1, converted_entity_id = $2,
         accepted_by = $3, accepted_at = NOW()
     WHERE draft_id = $4 AND status IN ('accepted','modified') AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query91(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_draft_actions
     SET status = 'rejected', accepted_by = $1, accepted_at = NOW(), rejection_reason = $2
     WHERE draft_id = $3 AND status = 'pending' AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query92(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_draft_actions
     SET ${sets.join(', ')}
     WHERE draft_id = $${idx} AND status = 'pending' AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query93(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_draft_actions d
     WHERE ${where.join(' AND ')}
     ORDER BY d.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`;
    return safeQuery(query, args);
  }

  static async query94(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_draft_actions d WHERE ${where.join(' AND ')}`;
    return safeQuery(query, args);
  }

  static async query95(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_draft_actions
       (instance_id, step_id, agent_id, draft_type, title, draft_content,
        confidence, recommendation_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query96(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_mandatory_review_points
     SET is_active = FALSE WHERE review_point_id = $1`;
    return safeQuery(query, args);
  }

  static async query97(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_mandatory_review_points
       (step_type, step_sub_type, requires_human_review, min_confidence_to_skip, review_role, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query98(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_mandatory_review_points
     WHERE is_active = TRUE
       AND step_type = $1
       AND (step_sub_type IS NULL OR step_sub_type = $2)
     ORDER BY CASE WHEN step_sub_type IS NOT NULL THEN 0 ELSE 1 END
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query99(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_mandatory_review_points ${where}
     ORDER BY step_type, step_sub_type`;
    return safeQuery(query, args);
  }

  static async query100(schema: string, args: unknown[]) {
    const query = `SELECT we.execution_id, we.workflow_id, we.status, we.step_log, we.started_at,
              w.definition
       FROM "${schema}".workflow_instances we
       JOIN "${schema}".workflows w ON w.workflow_id = we.workflow_id
       WHERE we.status IN ('running', 'paused')
       ORDER BY we.started_at ASC`;
    return safeQuery(query, args);
  }

  static async query101(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".ai_step_executions SET status = 'pending_review' WHERE execution_id = $1`;
    return safeQuery(query, args);
  }

  static async query102(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".ai_step_executions
      (workflow_execution_id, step_id, agent_id, agent_user_id, trigger_reason,
       input_context, output_result, confidence, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query103(schema: string, args: unknown[]) {
    const query = `SELECT a.user_id FROM "${schema}".actor_role_assignments a
       WHERE a.role_code = $1 AND a.is_active = true
       ORDER BY a.is_primary DESC NULLS LAST, a.assigned_at ASC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query104(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".ai_step_feedback
      (step_id, workflow_id, user_id, suggestion_type, accepted, modified)
     VALUES ($1, $2, $3, $4, $5, $6)`;
    return safeQuery(query, args);
  }

  static async query105(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".autonomous_workflow_config
        (enabled, autonomy_level, sla_grace_multiplier, ai_can_execute_actions, ai_can_draft_approvals, require_human_review, cron_interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query106(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".autonomous_workflow_config
       SET enabled = $1, autonomy_level = $2, sla_grace_multiplier = $3, ai_can_execute_actions = $4,
           ai_can_draft_approvals = $5, require_human_review = $6, cron_interval_minutes = $7,
           updated_at = NOW()
       WHERE config_id = $8`;
    return safeQuery(query, args);
  }

  static async query107(schema: string, args: unknown[]) {
    const query = `SELECT config_id FROM "${schema}".autonomous_workflow_config LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query108(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".autonomous_workflow_config LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query109(schema: string, args: unknown[]) {
    const query = `UPDATE users SET absence_status = $1, absent_from = $2, absent_until = $3, updated_at = NOW()
     WHERE user_id = $4 AND tenant_id = $5`;
    return safeQuery(query, args);
  }

  static async query110(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS recurrence_count
       FROM "${schema}".workflow_step_log
       WHERE step_type = $1 AND step_subtype = $2 AND status = 'completed'
         AND completed_at >= NOW() - INTERVAL '7 days'`;
    return safeQuery(query, args);
  }

  static async query111(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pattern_count
       FROM "${schema}".workflow_step_log
       WHERE step_type = $1 AND status = 'completed'
         AND completed_at >= NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query112(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS similar_count
       FROM "${schema}".workflow_instances wi
       JOIN "${schema}".workflow_step_log wsl ON wsl.workflow_execution_id = wi.execution_id
       WHERE wi.assigned_to = $1
         AND wsl.step_type = $2
         AND wsl.status = 'completed'
         AND wsl.completed_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query113(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS open_count
       FROM "${schema}".remediation_tasks
       WHERE assigned_to = $1 AND status NOT IN ('completed', 'resolved', 'cancelled')`;
    return safeQuery(query, args);
  }

  static async query114(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query115(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".ai_step_executions
     SET human_reviewed = TRUE, review_decision = $1, reviewed_by = $2, reviewed_at = NOW(),
         status = CASE WHEN $1 = 'rejected' THEN 'failed' ELSE 'completed' END
     WHERE execution_id = $3`;
    return safeQuery(query, args);
  }

  static async query116(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query117(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_step_log
     WHERE instance_id = $1 ORDER BY step_no`;
    return safeQuery(query, args);
  }

  static async query118(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query119(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'skipped', notes = $2
     WHERE instance_id = $1 AND status = 'in_progress'`;
    return safeQuery(query, args);
  }

  static async query120(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances
     SET status = 'cancelled', completed_at = NOW()
     WHERE instance_id = $1 AND status IN ('pending', 'active', 'running')`;
    return safeQuery(query, args);
  }

  static async query121(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances
     SET current_step = $2, context = $3
     WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query122(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances
       SET status = 'completed', completed_at = NOW(), current_step = $2
       WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query123(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'completed', completed_at = NOW()
     WHERE instance_id = $1 AND step_no = $2 AND task_id = $3`;
    return safeQuery(query, args);
  }

  static async query124(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances SET status = 'failed' WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query125(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_step_log
       (instance_id, step_no, module_code, task_type, status, notes)
       VALUES ($1, $2, $3, $4, 'failed', $5)`;
    return safeQuery(query, args);
  }

  static async query126(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_step_log
       (instance_id, step_no, module_code, task_type, task_id, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW())`;
    return safeQuery(query, args);
  }

  static async query127(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances SET current_step = $2 WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query128(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_step_log
         (instance_id, step_no, module_code, task_type, status, notes)
         VALUES ($1, $2, $3, $4, 'skipped', 'Condition not met')`;
    return safeQuery(query, args);
  }

  static async query129(schema: string, args: unknown[]) {
    const query = `SELECT actor_user_id FROM "${schema}".workflow_chain_step_log
       WHERE instance_id = $1 AND step_no = $2 AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query130(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query131(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_instances
     (chain_code, tenant_id, current_step, status, context, trigger_entity_type, trigger_entity_id, created_by)
     VALUES ($1, $2, 1, 'active', $3, $4, $5, $6)
     RETURNING instance_id`;
    return safeQuery(query, args);
  }

  static async query132(schema: string, args: unknown[]) {
    const query = `SELECT instance_id FROM "${schema}".workflow_chain_instances
     WHERE chain_code = $1 AND trigger_entity_type = $2
     AND trigger_entity_id = $3 AND status = 'active'
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query133(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query134(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_definitions WHERE chain_code = $1`;
    return safeQuery(query, args);
  }

  static async query135(schema: string, args: unknown[]) {
    const query = `SELECT actor_user_id FROM "${schema}".workflow_chain_step_log WHERE instance_id = $1 AND step_no = $2 AND status = 'completed'`;
    return safeQuery(query, args);
  }

  static async query136(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_step_log WHERE instance_id = $1 ORDER BY step_no ASC`;
    return safeQuery(query, args);
  }

  static async query137(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_instances WHERE ${conditions.join(' AND ')} ORDER BY started_at DESC`;
    return safeQuery(query, args);
  }

  static async query138(schema: string, args: unknown[]) {
    const query = `SELECT wci.* FROM "${schema}".workflow_chain_instances wci
       WHERE ${conditions.join(' AND ')}
       AND EXISTS (
         SELECT 1 FROM "${schema}".workflow_chain_step_log l
         WHERE l.instance_id = wci.instance_id AND l.module_code = $${modIdx}
       )
       ORDER BY wci.started_at DESC`;
    return safeQuery(query, args);
  }

  static async query139(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_instances WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query140(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_step_log
       (log_id, instance_id, step_no, module_code, task_type, status, started_at)
     VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW())`;
    return safeQuery(query, args);
  }

  static async query141(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances SET current_step = $1 WHERE instance_id = $2`;
    return safeQuery(query, args);
  }

  static async query142(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances SET status = 'completed', current_step = $1, completed_at = NOW() WHERE instance_id = $2`;
    return safeQuery(query, args);
  }

  static async query143(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_step_log
     SET status = 'completed', completed_at = NOW(), actor_user_id = $1, notes = $2
     WHERE instance_id = $3 AND step_no = $4 AND status != 'completed'`;
    return safeQuery(query, args);
  }

  static async query144(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_step_log
       SET actor_user_id = COALESCE($1, actor_user_id), notes = COALESCE($2, notes)
       WHERE instance_id = $3 AND step_no = $4 AND status = 'in_progress'`;
    return safeQuery(query, args);
  }

  static async query145(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_chain_instances SET context = $1::jsonb WHERE instance_id = $2`;
    return safeQuery(query, args);
  }

  static async query146(schema: string, args: unknown[]) {
    const query = `SELECT task_id FROM "${schema}".workflow_chain_step_log
     WHERE instance_id = $1 AND step_no = $2 AND status = 'in_progress'
     ORDER BY started_at DESC NULLS LAST LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query147(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_instances WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query148(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_chain_definitions (chain_code, name_en, name_ar, steps, sod_rules)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (chain_code) DO UPDATE SET
       name_en = EXCLUDED.name_en,
       name_ar = COALESCE(EXCLUDED.name_ar, workflow_chain_definitions.name_ar),
       steps = EXCLUDED.steps,
       sod_rules = EXCLUDED.sod_rules,
       updated_at = NOW()
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query149(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_definitions WHERE chain_code = $1`;
    return safeQuery(query, args);
  }

  static async query150(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_chain_definitions WHERE is_active = TRUE ORDER BY chain_code`;
    return safeQuery(query, args);
  }

  static async query151(schema: string, args: unknown[]) {
    const query = `SELECT step_id, step_code, is_start, is_end
     FROM "${schema}".workflow_steps
     WHERE definition_id = $1 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query152(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_events
       (instance_id, event_type, step_id, payload, triggered_by, created_by)
     VALUES ($1, 'step_transitioned', $2, $3, $4, $4)`;
    return safeQuery(query, args);
  }

  static async query153(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_executions
     SET current_step_id = $1, status = $2, updated_at = NOW()
     WHERE execution_id = $3`;
    return safeQuery(query, args);
  }

  static async query154(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_instance_steps
       (instance_step_id, instance_id, step_id, status, started_at)
     VALUES ($1, $2, $3, 'active', NOW())`;
    return safeQuery(query, args);
  }

  static async query155(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instance_steps
     SET status = 'completed', completed_at = NOW()
     WHERE instance_id = $1 AND step_id = $2`;
    return safeQuery(query, args);
  }

  static async query156(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_executions
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE execution_id = $1`;
    return safeQuery(query, args);
  }

  static async query157(schema: string, args: unknown[]) {
    const query = `SELECT step_code FROM "${schema}".workflow_steps WHERE step_id = $1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query158(schema: string, args: unknown[]) {
    const query = `SELECT we.*, wd.definition_id, wd.code AS definition_code, wd.module_code
     FROM "${schema}".workflow_executions we
     JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
     WHERE we.execution_id = $1 AND we.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query159(schema: string, args: unknown[]) {
    const query = `SELECT
         wt.transition_id,
         wt.definition_id,
         wt.from_step_id,
         sf.step_code AS from_step_code,
         wt.to_step_id,
         st.step_code AS to_step_code,
         wt.transition_type,
         wt.label_en,
         wt.condition_expression,
         wt.priority,
         COALESCE(st.step_type = 'approval', false) AS requires_approval,
         wt.required_permission
       FROM "${schema}".workflow_transitions wt
       JOIN "${schema}".workflow_steps sf ON sf.step_id = wt.from_step_id
       JOIN "${schema}".workflow_steps st ON st.step_id = wt.to_step_id
       WHERE wt.definition_id = $1 AND wt.deleted_at IS NULL
       ORDER BY sf.sequence_order ASC, wt.priority ASC`;
    return safeQuery(query, args);
  }

  static async query160(schema: string, args: unknown[]) {
    const query = `SELECT
         wt.transition_id,
         wt.definition_id,
         wt.from_step_id,
         sf.step_code AS from_step_code,
         wt.to_step_id,
         st.step_code AS to_step_code,
         wt.transition_type,
         wt.label_en,
         wt.condition_expression,
         wt.priority,
         COALESCE(st.step_type = 'approval', false) AS requires_approval,
         wt.required_permission
       FROM "${schema}".workflow_transitions wt
       JOIN "${schema}".workflow_steps sf ON sf.step_id = wt.from_step_id
       JOIN "${schema}".workflow_steps st ON st.step_id = wt.to_step_id
       WHERE wt.definition_id = $1 AND wt.from_step_id = $2
         AND wt.deleted_at IS NULL
       ORDER BY wt.priority ASC`;
    return safeQuery(query, args);
  }

  static async query161(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_approvals
     WHERE status = 'pending'
       AND sla_deadline IS NOT NULL
       AND sla_deadline < NOW()
     ORDER BY sla_deadline ASC`;
    return safeQuery(query, args);
  }

  static async query162(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_approvals WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query163(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_approvals
     WHERE execution_id = $1
     ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query164(schema: string, args: unknown[]) {
    const query = `SELECT wa.*, wi.workflow_id
     FROM "${schema}".workflow_approvals wa
     LEFT JOIN "${schema}".workflow_instances wi ON wi.execution_id = wa.execution_id
     WHERE wa.approver_id = $1
       AND wa.status IN ('pending', 'escalated')
     ORDER BY wa.sla_deadline ASC NULLS LAST, wa.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query165(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_audit_trail
       (entity_type, entity_id, action, action_details, performed_by)
     VALUES ('workflow_approval', $1, 'escalated', $2, 'system')`;
    return safeQuery(query, args);
  }

  static async query166(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_approvals
     SET status = 'escalated',
         approver_id = $1,
         sla_deadline = NOW() + INTERVAL '24 hours'
     WHERE approval_id = $2
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query167(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_approvals WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query168(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_audit_trail
       (entity_type, entity_id, action, action_details, performed_by)
     VALUES ('workflow_approval', $1, $2, $3, $4)`;
    return safeQuery(query, args);
  }

  static async query169(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_approvals
     SET status = $1, decision_comment = $2, decided_at = NOW()
     WHERE approval_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query170(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".workflow_approvals WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query171(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_approvals
       (approval_id, execution_id, step_id, approver_id, status,
        sla_deadline, escalation_chain, created_at)
     VALUES ($1, $2, $3, $4, 'pending',
             NOW() + make_interval(hours => $5),
             $6, NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query172(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_categories SET deleted_at = NOW() WHERE category_id = $1 AND deleted_at IS NULL RETURNING category_id`;
    return safeQuery(query, args);
  }

  static async query173(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_categories SET ${sets.join(", ")} WHERE category_id = $1 AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query174(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_categories
      (tenant_id, name_en, name_ar, parent_category_id, icon, color, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query175(schema: string, args: unknown[]) {
    const query = `SELECT category_id, name_en, name_ar, parent_category_id, icon, color, sort_order
     FROM "${schema}".workflow_categories
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name_en`;
    return safeQuery(query, args);
  }

  static async query176(schema: string, args: unknown[]) {
    const query = `SELECT category_id, name_en, name_ar, parent_category_id, icon, color, sort_order
     FROM "${schema}".workflow_categories
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name_en`;
    return safeQuery(query, args);
  }

  static async query177(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_transitions
         (transition_id, definition_id, from_step_id, to_step_id,
          transition_type, label_en, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query178(schema: string, args: unknown[]) {
    const query = `SELECT step_id FROM "${schema}".workflow_steps
       WHERE definition_id = $1 AND step_code = $2 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query179(schema: string, args: unknown[]) {
    const query = `SELECT step_id FROM "${schema}".workflow_steps
       WHERE definition_id = $1 AND step_code = $2 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query180(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_steps
         (step_id, definition_id, step_code, name_en, name_ar, step_type,
          is_start, is_end, sequence_order, sla_hours, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
    return safeQuery(query, args);
  }

  static async query181(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
     WHERE definition_id = $2`;
    return safeQuery(query, args);
  }

  static async query182(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_executions
     WHERE workflow_id = $1 AND status IN ('running', 'awaiting_approval') AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query183(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET status = $1, updated_by = $2, updated_at = NOW()
     WHERE definition_id = $3 AND deleted_at IS NULL
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query184(schema: string, args: unknown[]) {
    const query = `SELECT wd.*,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
         (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
       FROM "${schema}".workflow_definitions wd
       ${where}
       ORDER BY wd.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query185(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".workflow_definitions wd ${where}`;
    return safeQuery(query, args);
  }

  static async query186(schema: string, args: unknown[]) {
    const query = `SELECT wd.*,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
     FROM "${schema}".workflow_definitions wd
     WHERE wd.code = $1 AND wd.deleted_at IS NULL ${versionClause} ${orderClause}
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query187(schema: string, args: unknown[]) {
    const query = `SELECT wd.*,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_steps ws WHERE ws.definition_id = wd.definition_id AND ws.deleted_at IS NULL) AS step_count,
       (SELECT COUNT(*)::int FROM "${schema}".workflow_transitions wt WHERE wt.definition_id = wd.definition_id AND wt.deleted_at IS NULL) AS transition_count
     FROM "${schema}".workflow_definitions wd
     WHERE wd.definition_id = $1 AND wd.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query188(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_definitions
       (definition_id, code, version, name_en, name_ar, module_code, entity_type,
        trigger_type, status, sla_hours, created_by, updated_by)
     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, 'draft', $8, $9, $9)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query189(schema: string, args: unknown[]) {
    const query = `SELECT definition_id FROM "${schema}".workflow_definitions
     WHERE code = $1 AND deleted_at IS NULL LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query190(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(MAX(escalation_level), 0) AS level
     FROM "${schema}".workflow_escalations
     WHERE instance_id = $1 AND step_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query191(schema: string, args: unknown[]) {
    const query = `SELECT wis.instance_id, wis.step_id, ws.step_code, ws.sla_hours,
              wd.module_code,
              COALESCE(
                (SELECT MAX(escalation_level) FROM "${schema}".workflow_escalations
                 WHERE instance_id = wis.instance_id AND step_id = wis.step_id),
                0
              ) AS current_level
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       WHERE wis.status = 'active'
         AND ws.sla_hours IS NOT NULL
         AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         AND we.status IN ('running', 'awaiting_approval')
         AND wis.deleted_at IS NULL
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query192(schema: string, args: unknown[]) {
    const query = `SELECT we.*, ws.step_code
       FROM "${schema}".workflow_escalations we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.status = 'pending' AND we.deleted_at IS NULL
       ORDER BY we.escalation_level DESC, we.created_at ASC
       LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query193(schema: string, args: unknown[]) {
    const query = `SELECT we.*, ws.step_code
       FROM "${schema}".workflow_escalations we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.instance_id = $1 AND we.deleted_at IS NULL
       ORDER BY we.escalation_level ASC, we.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query194(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_executions
       SET status = 'running', updated_at = NOW()
       WHERE execution_id = $1 AND status = 'escalated'`;
    return safeQuery(query, args);
  }

  static async query195(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_escalations
     SET status = $1, resolved_by = $2, resolved_at = NOW(), updated_at = NOW()
     WHERE escalation_id = $3 AND status = 'pending'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query196(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_executions
     SET status = 'escalated', updated_at = NOW()
     WHERE execution_id = $1 AND status IN ('running', 'awaiting_approval')`;
    return safeQuery(query, args);
  }

  static async query197(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_escalations
       (escalation_id, instance_id, step_id, escalation_level, escalated_to,
        reason, status, escalated_by, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $7)`;
    return safeQuery(query, args);
  }

  static async query198(schema: string, args: unknown[]) {
    const query = `SELECT wis.instance_step_id, wis.status, ws.step_code, ws.config,
            we.workflow_id, wd.module_code
     FROM "${schema}".workflow_instance_steps wis
     JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
     JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
     JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
     WHERE wis.instance_id = $1 AND wis.step_id = $2 AND wis.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query199(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instances SET status = 'completed', completed_at = NOW()
       WHERE execution_id = $1 AND status = 'paused'`;
    return safeQuery(query, args);
  }

  static async query200(schema: string, args: unknown[]) {
    const query = `SELECT status, workflow_id FROM "${schema}".workflow_instances WHERE execution_id = $1`;
    return safeQuery(query, args);
  }

  static async query201(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".process_tasks
     WHERE workflow_execution_id = $1 AND status NOT IN ('completed', 'cancelled', 'auto_closed')`;
    return safeQuery(query, args);
  }

  static async query202(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_instances
      (workflow_id, trigger_type, status, step_log, is_simulation, completed_at)
     VALUES ($1, 'simulation', 'completed', $2, true, NOW())`;
    return safeQuery(query, args);
  }

  static async query203(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflows WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query204(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_instances
      (workflow_id, trigger_type, status, is_simulation)
     VALUES ($1, $2, 'running', false)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query205(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflows WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query206(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instances SET status = $1, ${completedAt}, step_log = $2 WHERE execution_id = $3`;
    return safeQuery(query, args);
  }

  static async query207(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".process_audit_trail
       (entity_type, entity_id, action, action_details, performed_by, performed_by_team_id)
       VALUES ('workflow_execution', $1, $2, $3, $4, $5)`;
    return safeQuery(query, args);
  }

  static async query208(schema: string, args: unknown[]) {
    const query = `SELECT full_name, email FROM public.users WHERE user_id = $1`;
    return safeQuery(query, args);
  }

  static async query209(schema: string, args: unknown[]) {
    const query = `SELECT name_en FROM "${schema}".teams WHERE team_id = $1`;
    return safeQuery(query, args);
  }

  static async query210(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_lookup_options
       (category, code, label_en, label_ar, icon, color, parent_code, config_schema, ai_generated)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     ON CONFLICT (category, code) DO UPDATE SET
       label_en = EXCLUDED.label_en,
       label_ar = EXCLUDED.label_ar,
       icon = COALESCE(EXCLUDED.icon, workflow_lookup_options.icon),
       color = COALESCE(EXCLUDED.color, workflow_lookup_options.color),
       config_schema = COALESCE(EXCLUDED.config_schema, workflow_lookup_options.config_schema),
       ai_generated = true`;
    return safeQuery(query, args);
  }

  static async query211(schema: string, args: unknown[]) {
    const query = `SELECT role_code, label_en, label_ar, color, icon, sort_order
       FROM "${schema}".workflow_raci_config
       ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query212(schema: string, args: unknown[]) {
    const query = `SELECT agent_id, name_en, name_ar, domain_en, domain_ar, icon, color, delegation_scope
       FROM "${schema}".workflow_ai_agents
       WHERE is_active = true
       ORDER BY sort_order`;
    return safeQuery(query, args);
  }

  static async query213(schema: string, args: unknown[]) {
    const query = `SELECT category, code, label_en, label_ar, icon, color, parent_code,
              sort_order, config_schema, ai_generated
       FROM "${schema}".workflow_lookup_options
       WHERE is_active = true
       ORDER BY category, sort_order`;
    return safeQuery(query, args);
  }

  static async query214(schema: string, args: unknown[]) {
    const query = `SELECT definition FROM "${schema}".lifecycle_definitions
     WHERE module_code = $1 AND entity_type = $2
     ORDER BY version DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query215(schema: string, args: unknown[]) {
    const query = `SELECT wi.step_log, w.definition
     FROM "${schema}".workflow_instances wi
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = wi.workflow_id
     WHERE wi.execution_id = $1`;
    return safeQuery(query, args);
  }

  static async query216(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (WHERE wis.status = 'active' AND ws.sla_hours IS NOT NULL)::int AS total_active,
         COUNT(*) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         )::int AS total_breached,
         COUNT(*) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
         )::int AS total_warning,
         ROUND(AVG(
           EXTRACT(EPOCH FROM (NOW() - (wis.started_at + (ws.sla_hours || ' hours')::INTERVAL)) / 3600)
         ) FILTER (
           WHERE wis.status = 'active'
             AND ws.sla_hours IS NOT NULL
             AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         ), 2) AS avg_breach_hours
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE we.status = 'running' AND wis.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query217(schema: string, args: unknown[]) {
    const query = `SELECT ws.step_code, ws.sla_hours, ws.config,
              we.workflow_id, wd.module_code
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       WHERE wis.instance_id = $1 AND wis.step_id = $2 AND wis.status = 'active'`;
    return safeQuery(query, args);
  }

  static async query218(schema: string, args: unknown[]) {
    const query = `SELECT
         wis.instance_step_id AS timer_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         'active' AS status,
         NULL AS breached_at
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE wis.status = 'active'
         AND ws.sla_hours IS NOT NULL
         AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
         AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
         AND we.status = 'running'
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at ASC
       LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query219(schema: string, args: unknown[]) {
    const query = `SELECT
         wis.instance_step_id AS timer_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         'breached' AS status,
         NOW() AS breached_at
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       JOIN "${schema}".workflow_executions we ON we.execution_id = wis.instance_id
       WHERE wis.status = 'active'
         AND ws.sla_hours IS NOT NULL
         AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
         AND we.status = 'running'
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at ASC
       LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query220(schema: string, args: unknown[]) {
    const query = `SELECT
         wis.instance_step_id,
         wis.instance_id,
         wis.step_id,
         ws.step_code,
         ws.sla_hours,
         wis.started_at,
         wis.started_at + (ws.sla_hours || ' hours')::INTERVAL AS due_at,
         wis.status AS step_status,
         CASE WHEN ws.sla_hours IS NOT NULL
              AND wis.status = 'active'
              AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL < NOW()
              THEN TRUE ELSE FALSE END AS is_breached,
         CASE WHEN ws.sla_hours IS NOT NULL
              AND wis.status = 'active'
              AND wis.started_at + (ws.sla_hours * ${SLA_WARNING_THRESHOLD} || ' hours')::INTERVAL < NOW()
              AND wis.started_at + (ws.sla_hours || ' hours')::INTERVAL >= NOW()
              THEN TRUE ELSE FALSE END AS is_warning,
         CASE WHEN ws.sla_hours IS NOT NULL AND wis.status = 'active'
              THEN EXTRACT(EPOCH FROM (
                wis.started_at + (ws.sla_hours || ' hours')::INTERVAL - NOW()
              ) / 3600)
              ELSE NULL END AS hours_remaining
       FROM "${schema}".workflow_instance_steps wis
       JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       WHERE wis.instance_id = $1
         AND wis.deleted_at IS NULL
       ORDER BY wis.started_at DESC`;
    return safeQuery(query, args);
  }

  static async query221(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_template_versions
       (version_id, template_id, template_code, version, definition,
        change_summary, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT DO NOTHING`;
    return safeQuery(query, args);
  }

  static async query222(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_template_versions
     WHERE template_code = $1 AND version = $2`;
    return safeQuery(query, args);
  }

  static async query223(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_template_versions
     WHERE template_code = $1
     ORDER BY version DESC`;
    return safeQuery(query, args);
  }

  static async query224(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_templates
       (template_id, tenant_id, template_code, name_en, name_ar,
        description_en, description_ar, definition, version, status,
        category, module_code, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'draft', $9, $10, $11, NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query225(schema: string, args: unknown[]) {
    const query = `SELECT template_id FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'`;
    return safeQuery(query, args);
  }

  static async query226(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_templates
     SET status = 'archived', updated_at = NOW()
     WHERE template_code = $1 AND status != 'archived'`;
    return safeQuery(query, args);
  }

  static async query227(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_templates
     SET ${setClauses.join(', ')}
     WHERE template_id = $${idx}
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query228(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     ORDER BY version DESC LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query229(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_templates
     ${whereClause}
     ORDER BY updated_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`;
    return safeQuery(query, args);
  }

  static async query230(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total FROM "${schema}".workflow_templates ${whereClause}`;
    return safeQuery(query, args);
  }

  static async query231(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_templates WHERE template_id = $1`;
    return safeQuery(query, args);
  }

  static async query232(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'
     ORDER BY version DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query233(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_templates
       (template_id, tenant_id, template_code, name_en, name_ar,
        description_en, description_ar, definition, version, status,
        category, module_code, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 'active', $9, $10, $11, NOW(), NOW())
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query234(schema: string, args: unknown[]) {
    const query = `SELECT template_id FROM "${schema}".workflow_templates
     WHERE template_code = $1 AND status != 'archived'`;
    return safeQuery(query, args);
  }

  static async query235(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_actions,
         COUNT(*) FILTER (WHERE action_type = 'recommend')::int AS recommendations_generated,
         COUNT(*) FILTER (WHERE action_type = 'recommend' AND outcome = 'accepted')::int AS recommendations_accepted,
         COUNT(*) FILTER (WHERE action_type = 'classify')::int AS classifications_run,
         COUNT(*) FILTER (WHERE action_type = 'generate_report')::int AS reports_generated,
         MAX(created_at)::text AS last_action_at
       FROM "${schema}".workflow_ai_actions
       WHERE module_code = 'workflow'
         AND created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query236(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS escalation_count
         FROM "${schema}".workflow_escalations
         WHERE created_at >= NOW() - INTERVAL '90 days'
           AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query237(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*) FILTER (WHERE ws.step_type IN ('automated', 'system', 'script'))::int AS automated_steps,
           COUNT(*) FILTER (WHERE ws.step_type IN ('manual', 'approval', 'review', 'task'))::int AS manual_steps
         FROM "${schema}".workflow_instance_steps wis
         JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
         JOIN "${schema}".workflow_instances we ON we.execution_id = wis.instance_id
         WHERE we.deleted_at IS NULL
           AND we.created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query238(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total_executions,
           COALESCE(
             ROUND(
               COUNT(*) FILTER (WHERE status = 'completed')::numeric /
               NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'failed'))::numeric, 0) * 100,
             2),
             100
           ) AS success_rate,
           COALESCE(
             ROUND(AVG(
               EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 2),
             0
           ) AS avg_duration_hours,
           COALESCE(
             ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (
               ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)::numeric, 2),
             0
           ) AS p95_duration_hours
         FROM "${schema}".workflow_instances
         WHERE deleted_at IS NULL
           AND created_at >= NOW() - INTERVAL '90 days'`;
    return safeQuery(query, args);
  }

  static async query239(schema: string, args: unknown[]) {
    const query = `SELECT
         d.date::date::text AS date,
         COUNT(we.execution_id) FILTER (
           WHERE we.created_at::date = d.date::date
         )::int AS created,
         COUNT(we.execution_id) FILTER (
           WHERE we.status = 'completed'
             AND we.completed_at::date = d.date::date
         )::int AS completed,
         COUNT(we.execution_id) FILTER (
           WHERE we.status = 'failed'
             AND we.updated_at::date = d.date::date
         )::int AS failed
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".workflow_instances we
         ON (we.created_at::date = d.date::date
             OR we.completed_at::date = d.date::date
             OR (we.status = 'failed' AND we.updated_at::date = d.date::date))
         AND we.deleted_at IS NULL
       GROUP BY d.date
       ORDER BY d.date ASC`;
    return safeQuery(query, args);
  }

  static async query240(schema: string, args: unknown[]) {
    const query = `SELECT
         wt.assignee_id,
         COALESCE(u.display_name, wt.assignee_id) AS assignee_name,
         COUNT(*) FILTER (WHERE wt.status = 'open')::int AS active_tasks,
         COUNT(*) FILTER (WHERE wt.status = 'completed')::int AS completed_tasks,
         COUNT(*) FILTER (
           WHERE wt.status = 'open'
             AND wt.due_date IS NOT NULL
             AND wt.due_date < NOW()
         )::int AS overdue_tasks
       FROM "${schema}".workflow_tasks wt
       LEFT JOIN "${schema}".users u ON u.user_id = wt.assignee_id
       WHERE wt.assignee_id IS NOT NULL
         AND wt.deleted_at IS NULL
       GROUP BY wt.assignee_id, u.display_name
       ORDER BY active_tasks DESC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query241(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*)::int AS total_tracked,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND (wt.status = 'completed' AND wt.completed_at <= wt.due_date)
         )::int AS within_sla,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND wt.status = 'open'
             AND NOW() > wt.due_date - (wt.due_date - wt.created_at) * 0.25
             AND NOW() <= wt.due_date
         )::int AS warning_zone,
         COUNT(*) FILTER (
           WHERE wt.due_date IS NOT NULL
             AND (
               (wt.status = 'open' AND NOW() > wt.due_date)
               OR (wt.status = 'completed' AND wt.completed_at > wt.due_date)
             )
         )::int AS breached
       FROM "${schema}".workflow_tasks wt
       WHERE wt.due_date IS NOT NULL
         AND wt.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query242(schema: string, args: unknown[]) {
    const query = `SELECT
         wt.assignee_id AS approver_id,
         COALESCE(u.display_name, wt.assignee_id) AS approver_name,
         COUNT(*)::int AS pending_count,
         COALESCE(
           ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - wt.created_at)) / 3600), 2),
           0
         ) AS avg_approval_hours,
         COALESCE(
           ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - wt.created_at)) / 3600), 2),
           0
         ) AS oldest_pending_hours
       FROM "${schema}".workflow_tasks wt
       LEFT JOIN "${schema}".users u ON u.user_id = wt.assignee_id
       WHERE wt.task_type = 'approval'
         AND wt.status = 'open'
         AND wt.assignee_id IS NOT NULL
         AND wt.deleted_at IS NULL
       GROUP BY wt.assignee_id, u.display_name
       ORDER BY pending_count DESC, oldest_pending_hours DESC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query243(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open'
           AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query244(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT we.execution_id)::int AS sla_breaches
         FROM "${schema}".workflow_instances we
         JOIN "${schema}".workflow_instance_steps wis
           ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt
           ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL
           AND we.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query245(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(*) FILTER (
           WHERE status = 'running'
             AND updated_at < NOW() - INTERVAL '30 minutes'
         )::int AS stuck_count,
         COUNT(*) FILTER (
           WHERE status = 'failed'
             AND updated_at >= NOW() - INTERVAL '24 hours'
         )::int AS recent_failures
       FROM "${schema}".workflow_instances
       WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query246(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS stuck_count
         FROM "${schema}".workflow_instances
         WHERE status = 'running'
           AND updated_at < NOW() - INTERVAL '30 minutes'
           AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query247(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(DISTINCT we.execution_id)::int AS sla_breaches
         FROM "${schema}".workflow_instances we
         JOIN "${schema}".workflow_instance_steps wis
           ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt
           ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL
           AND we.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query248(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open'
           AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query249(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'running')::int AS active,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COALESCE(
             ROUND(AVG(
               EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
             ) FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 2),
             0
           ) AS avg_completion_hours
         FROM "${schema}".workflow_instances
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query250(schema: string, args: unknown[]) {
    const query = `SELECT
         we.event_id,
         we.instance_id,
         we.event_type,
         we.step_id,
         ws.step_code,
         we.triggered_by,
         we.payload,
         we.created_at
       FROM "${schema}".workflow_events we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.instance_id = $1
         AND we.event_type IN ('step_transitioned', 'step_completed', 'step_failed',
                               'transition_denied', 'transition_blocked',
                               'auto_recovered', 'recovery_failed')
       ORDER BY we.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query251(schema: string, args: unknown[]) {
    const query = `SELECT
         wa.approval_id,
         wa.execution_id,
         wa.step_id,
         ws.step_code,
         wa.approver_id,
         wa.status,
         wa.decision_comment,
         wa.decided_at,
         wa.escalated_to,
         wa.sla_deadline,
         wa.created_at
       FROM "${schema}".workflow_approvals wa
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = wa.step_id
       WHERE wa.execution_id = $1
         AND wa.deleted_at IS NULL
       ORDER BY wa.created_at ASC`;
    return safeQuery(query, args);
  }

  static async query252(schema: string, args: unknown[]) {
    const query = `SELECT
         at.audit_id,
         at.user_id,
         at.module,
         at.action,
         at.entity_type,
         at.entity_id,
         at.before_state,
         at.after_state,
         at.ip_address,
         at.created_at
       FROM "${schema}".audit_trail at
       WHERE at.module = 'workflow'
         AND (at.entity_id = $1
              OR at.after_state->>'instanceId' = $1
              OR at.after_state->>'executionId' = $1)
         AND at.deleted_at IS NULL
       ORDER BY at.created_at ASC
       LIMIT $2`;
    return safeQuery(query, args);
  }

  static async query253(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS total
       FROM "${schema}".workflow_events
       WHERE instance_id = $1`;
    return safeQuery(query, args);
  }

  static async query254(schema: string, args: unknown[]) {
    const query = `SELECT
         we.event_id,
         we.instance_id,
         we.event_type,
         we.step_id,
         ws.step_code,
         we.triggered_by,
         (we.payload->>'previousState')::text AS previous_state,
         (we.payload->>'newState')::text AS new_state,
         we.payload,
         we.created_at AS occurred_at
       FROM "${schema}".workflow_events we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.instance_id = $1
       ORDER BY we.created_at ASC
       LIMIT $2 OFFSET $3`;
    return safeQuery(query, args);
  }

  static async query255(schema: string, args: unknown[]) {
    const query = `SELECT we.execution_id, we.workflow_id, wd.code AS definition_code, we.status
     FROM "${schema}".workflow_executions we
     JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
     WHERE we.execution_id = $1 AND we.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query256(schema: string, args: unknown[]) {
    const query = `SELECT
         event_type,
         COUNT(*)::int AS success_count,
         0::int AS failure_count,
         MAX(created_at)::text AS last_occurred_at
       FROM "${schema}".workflow_event_log
       WHERE tenant_id = $1
         AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY event_type
       ORDER BY success_count DESC
       LIMIT 30`;
    return safeQuery(query, args);
  }

  static async query257(schema: string, args: unknown[]) {
    const query = `SELECT
         wd.definition_id,
         wd.code,
         wd.version,
         wd.status,
         wd.promoted_at,
         wd.promoted_by,
         wd.change_notes,
         COUNT(we.execution_id)::int AS active_instance_count
       FROM "${schema}".workflow_definitions wd
       LEFT JOIN "${schema}".workflow_executions we
         ON we.workflow_id = wd.definition_id AND we.status = 'running'
       WHERE wd.deleted_at IS NULL
       GROUP BY wd.definition_id, wd.code, wd.version, wd.status, wd.promoted_at, wd.promoted_by, wd.change_notes
       ORDER BY wd.code, wd.version DESC`;
    return safeQuery(query, args);
  }

  static async query258(schema: string, args: unknown[]) {
    const query = `SELECT
         ar.request_id AS approval_id,
         ar.entity_type,
         ar.entity_id,
         ar.submitted_by,
         ar.current_step,
         jsonb_array_length(ac.steps::jsonb) AS total_steps,
         EXTRACT(EPOCH FROM (NOW() - ar.updated_at) / 3600)::int AS stale_since_hours,
         ar.current_approver_id AS assigned_to
       FROM "${schema}".approval_requests ar
       LEFT JOIN public.approval_chains ac ON ac.chain_id = ar.chain_id
       WHERE ar.status = 'pending'
         AND ar.updated_at < NOW() - ($1 || ' hours')::INTERVAL
         AND ar.deleted_at IS NULL
       ORDER BY ar.updated_at ASC
       LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query259(schema: string, args: unknown[]) {
    const query = `SELECT
         at.entity_id AS instance_id,
         (at.before_state->>'fromStepId')::text AS from_step_id,
         (at.after_state->>'reason')::text AS reason,
         (at.after_state->>'deniedBy')::text AS denied_by,
         (at.after_state->>'moduleCode')::text AS module_code,
         (at.after_state->>'entityType')::text AS entity_type,
         at.created_at AS occurred_at
       FROM "${schema}".audit_trail at
       WHERE at.module = 'workflow'
         AND at.action IN ('transition_denied', 'transition_blocked', 'lifecycle_auth_denied')
         AND at.deleted_at IS NULL
       ORDER BY at.created_at DESC
       LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query260(schema: string, args: unknown[]) {
    const query = `SELECT
         we.execution_id AS instance_id,
         we.workflow_id AS definition_id,
         COALESCE(wd.code, we.workflow_id::text) AS definition_code,
         wis.step_id AS current_step_id,
         ws.step_code AS current_step_code,
         we.status,
         EXTRACT(EPOCH FROM (NOW() - we.updated_at) / 60)::int AS stuck_since_minutes,
         CASE WHEN wt.due_date IS NOT NULL AND wt.due_date < NOW() THEN TRUE ELSE FALSE END AS is_overdue,
         we.trigger_type AS triggered_by,
         we.created_at AS started_at
       FROM "${schema}".workflow_executions we
       LEFT JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
       LEFT JOIN "${schema}".workflow_instance_steps wis
         ON wis.instance_id = we.execution_id AND wis.status = 'active'
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = wis.step_id
       LEFT JOIN "${schema}".workflow_tasks wt ON wt.instance_step_id = wis.instance_step_id
       WHERE we.status = 'running'
         AND we.updated_at < NOW() - ($1 || ' minutes')::INTERVAL
         AND we.deleted_at IS NULL
       ORDER BY we.updated_at ASC
       LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query261(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS pending_approvals
         FROM "${schema}".workflow_tasks
         WHERE task_type = 'approval' AND status = 'open' AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query262(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS sla_breaches
         FROM "${schema}".workflow_executions we
         JOIN "${schema}".workflow_instance_steps wis ON wis.instance_id = we.execution_id AND wis.status = 'active'
         JOIN "${schema}".workflow_tasks wt ON wt.instance_step_id = wis.instance_step_id
         WHERE we.status = 'running'
           AND wt.due_date IS NOT NULL AND wt.due_date < NOW()
           AND wt.deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query263(schema: string, args: unknown[]) {
    const query = `SELECT
           COUNT(*) FILTER (WHERE status = 'running')::int AS active_instances,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_instances,
           ROUND(
             AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
             FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL)
           , 2) AS avg_completion_hours
         FROM "${schema}".workflow_executions
         WHERE deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query264(schema: string, args: unknown[]) {
    const query = `SELECT a.permission FROM "${schema}".workflow_acl a
     JOIN "${schema}".team_members tm ON tm.team_id::text = a.grantee_id
     WHERE a.workflow_id = $1 AND a.grantee_type = 'team' AND tm.user_id = $2`;
    return safeQuery(query, args);
  }

  static async query265(schema: string, args: unknown[]) {
    const query = `SELECT a.permission FROM "${schema}".workflow_acl a
     JOIN "${schema}".user_role_assignments ura ON ura.role_id::text = a.grantee_id
     WHERE a.workflow_id = $1 AND a.grantee_type = 'role' AND ura.user_id = $2`;
    return safeQuery(query, args);
  }

  static async query266(schema: string, args: unknown[]) {
    const query = `SELECT permission FROM "${schema}".workflow_acl
     WHERE workflow_id = $1 AND grantee_type = 'user' AND grantee_id = $2`;
    return safeQuery(query, args);
  }

  static async query267(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) AS cnt FROM "${schema}".workflow_acl WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query268(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".workflow_acl WHERE acl_id = $1 RETURNING acl_id`;
    return safeQuery(query, args);
  }

  static async query269(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_acl
       WHERE workflow_id = $1 AND grantee_type = $2 AND grantee_id = $3 AND permission = $4`;
    return safeQuery(query, args);
  }

  static async query270(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_acl
      (workflow_id, grantee_type, grantee_id, permission, granted_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (workflow_id, grantee_type, grantee_id, permission) DO NOTHING
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query271(schema: string, args: unknown[]) {
    const query = `SELECT a.acl_id, a.workflow_id, a.grantee_type, a.grantee_id, a.permission,
            a.granted_by, a.created_at
     FROM "${schema}".workflow_acl a
     WHERE a.workflow_id = $1
     ORDER BY a.grantee_type, a.created_at`;
    return safeQuery(query, args);
  }

  static async query272(schema: string, args: unknown[]) {
    const query = `SELECT
         current_step,
         AVG(EXTRACT(EPOCH FROM (now() - updated_at)) / 3600)::numeric(10,1) AS avg_wait_hours,
         COUNT(*)::int AS stuck_count
       FROM "${schema}".workflow_instances
       WHERE status = 'in_progress'
       GROUP BY current_step
       ORDER BY avg_wait_hours DESC
       LIMIT 5`;
    return safeQuery(query, args);
  }

  static async query273(schema: string, args: unknown[]) {
    const query = `SELECT
         COUNT(CASE WHEN completed_at <= sla_deadline THEN 1 END)::int AS on_time,
         COUNT(CASE WHEN completed_at > sla_deadline THEN 1 END)::int AS breached,
         COUNT(*)::int AS total
       FROM "${schema}".workflow_instances
       WHERE completed_at IS NOT NULL AND sla_deadline IS NOT NULL ${dateFilter}`;
    return safeQuery(query, args);
  }

  static async query274(schema: string, args: unknown[]) {
    const query = `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric(10,1) AS avg_hours
       FROM "${schema}".workflow_instances
       WHERE completed_at IS NOT NULL ${dateFilter}`;
    return safeQuery(query, args);
  }

  static async query275(schema: string, args: unknown[]) {
    const query = `SELECT status, COUNT(*)::int AS count
       FROM "${schema}".workflow_instances
       WHERE 1=1 ${dateFilter}
       GROUP BY status`;
    return safeQuery(query, args);
  }

  static async query276(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".parallel_approvals
     SET approvers = $1::jsonb, status = $2, updated_at = now()
     WHERE approval_id = $3
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query277(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".parallel_approvals WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query278(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".parallel_approvals
       (workflow_instance_id, step_id, approvers, logic, status)
     VALUES ($1, $2, $3::jsonb, $4, 'pending')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query279(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query280(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approval_routing_rules
       (entity_type, conditions, approver_role, priority_order, active)
     VALUES ($1, $2::jsonb, $3, $4, true)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query281(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_definitions WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query282(schema: string, args: unknown[]) {
    const query = `SELECT delegate FROM "${schema}".approval_delegation_rules
     WHERE delegator = $1
       AND active = true
       AND start_date <= CURRENT_DATE
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
     ORDER BY created_at DESC
     LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query283(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approval_delegation_rules
     SET active = false
     WHERE rule_id = $1
     RETURNING rule_id`;
    return safeQuery(query, args);
  }

  static async query284(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query285(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approval_delegation_rules
       (delegator, delegate, scope, start_date, end_date, active)
     VALUES ($1, $2, $3, $4::date, $5::date, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query286(schema: string, args: unknown[]) {
    const query = `SELECT branch_rules FROM "${schema}".workflow_definitions WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query287(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_definitions
     SET branch_rules = $1::jsonb, updated_at = now()
     WHERE workflow_id = $2
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query288(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_attachments
     SET deleted_at = NOW(), updated_by = $1
     WHERE attachment_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query289(schema: string, args: unknown[]) {
    const query = `SELECT wa.*, fs.file_size, fs.mime_type
     FROM "${schema}".workflow_attachments wa
     LEFT JOIN "${schema}".file_storage fs ON fs.file_id = wa.file_id
     WHERE ${where.join(' AND ')}
     ORDER BY wa.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query290(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_attachments
       (instance_id, step_id, file_id, file_name, uploaded_by, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query291(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_comments
     SET deleted_at = NOW(), updated_by = $1
     WHERE comment_id = $2 AND deleted_at IS NULL`;
    return safeQuery(query, args);
  }

  static async query292(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_comments SET ${sets.join(', ')}
     WHERE comment_id = $${idx} AND deleted_at IS NULL RETURNING *`;
    return safeQuery(query, args);
  }

  static async query293(schema: string, args: unknown[]) {
    const query = `SELECT wc.*, u.name AS commenter_name
     FROM "${schema}".workflow_comments wc
     LEFT JOIN users u ON u.user_id = wc.commenter_id
     WHERE ${where.join(' AND ')}
     ORDER BY wc.created_at ASC
     LIMIT ${limit} OFFSET ${offset}`;
    return safeQuery(query, args);
  }

  static async query294(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*)::int AS cnt FROM "${schema}".workflow_comments wc WHERE ${where.join(' AND ')}`;
    return safeQuery(query, args);
  }

  static async query295(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_comments
       (instance_id, step_id, commenter_id, comment_text, visibility, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query296(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".approvals
      (execution_id, step_id, approver_id, status, sla_deadline, escalation_chain)
     VALUES ($1, $2, $3, 'pending', $4, $5)`;
    return safeQuery(query, args);
  }

  static async query297(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".approvals SET status = 'escalated', decided_at = NOW()
     WHERE approval_id = $1`;
    return safeQuery(query, args);
  }

  static async query298(schema: string, args: unknown[]) {
    const query = `SELECT approval_id, approver_id, sla_deadline, escalation_chain
     FROM "${schema}".approvals
     WHERE execution_id = $1 AND step_id = $2 AND status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query299(schema: string, args: unknown[]) {
    const query = `SELECT definition FROM "${schema}".workflows WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query300(schema: string, args: unknown[]) {
    const query = `SELECT definition FROM "${schema}".workflows WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

  static async query301(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_forbidden_boundaries
     SET is_active = FALSE WHERE boundary_id = $1 AND is_active = TRUE`;
    return safeQuery(query, args);
  }

  static async query302(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_forbidden_boundaries
       (module_code, entity_type, step_type, forbidden_action, reason, severity)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query303(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_forbidden_boundaries
     WHERE is_active = TRUE
       AND forbidden_action = $1
       AND (module_code IS NULL OR module_code = $2)
       AND (entity_type IS NULL OR entity_type = $3)
       AND (step_type IS NULL OR step_type = $4)`;
    return safeQuery(query, args);
  }

  static async query304(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_forbidden_boundaries ${whereClause}
     ORDER BY severity, forbidden_action`;
    return safeQuery(query, args);
  }

  static async query305(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_intervention_log
     SET acknowledged_by = $1, acknowledged_at = NOW()
     WHERE intervention_id = $2 AND acknowledged_by IS NULL`;
    return safeQuery(query, args);
  }

  static async query306(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_intervention_log ${whereClause}
     ORDER BY created_at DESC LIMIT ${limit}`;
    return safeQuery(query, args);
  }

  static async query307(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_intervention_log
       (instance_id, step_id, intervention_type, agent_id, details, notified_users)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING intervention_id`;
    return safeQuery(query, args);
  }

  static async query308(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_kill_switch
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY activated_at DESC`;
    return safeQuery(query, args);
  }

  static async query309(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_kill_switch
     SET is_active = FALSE, deactivated_at = NOW(), deactivated_by = $1
     WHERE switch_id = $2 AND is_active = TRUE
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query310(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_kill_switch
       (tenant_id, activated_by, scope, scope_filter, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query311(schema: string, args: unknown[]) {
    const query = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('open','pending'))::int AS open,
      COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed','cancelled'))::int AS overdue,
      COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical,
      COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
      COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
      COUNT(*) FILTER (WHERE priority = 'low')::int AS low
    FROM (
      SELECT status, due_date, priority, assigned_to FROM "${schema}".workflow_tasks
        WHERE deleted_at IS NULL ${userFilter}
      UNION ALL
      SELECT status, due_date, priority, assignee_key AS assigned_to FROM "${schema}".process_tasks
        WHERE deleted_at IS NULL ${ptUserFilter}
    ) combined
  `;
    return safeQuery(query, args);
  }

  static async query312(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
     SET assignee_key = NULL, status = 'open', updated_at = NOW()
     WHERE task_id = $1 AND status = 'in_progress'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query313(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_tasks
     SET assigned_to = NULL, status = 'open', updated_at = NOW()
     WHERE task_id = $1 AND status = 'in_progress'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query314(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
     SET assignee_key = $2, status = 'in_progress', updated_at = NOW()
     WHERE task_id = $1 AND (assignee_key IS NULL OR assignee_key = $2) AND status IN ('pending', 'open')
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query315(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_tasks
     SET assigned_to = $2, status = 'in_progress', updated_at = NOW(), updated_by = $2
     WHERE task_id = $1 AND (assigned_to IS NULL OR assigned_to = $2) AND status = 'open'
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query316(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query317(schema: string, args: unknown[]) {
    const query = sql;
    return safeQuery(query, args);
  }

  static async query318(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflows SET status = 'active', updated_at = NOW()
     WHERE workflow_id = $1 AND status = 'archived' RETURNING workflow_id`;
    return safeQuery(query, args);
  }

  static async query319(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflows SET status = 'archived', updated_at = NOW()
     WHERE workflow_id = $1 AND status != 'archived' RETURNING workflow_id`;
    return safeQuery(query, args);
  }

  static async query320(schema: string, args: unknown[]) {
    const query = `WITH restored AS (
      INSERT INTO "${schema}".workflow_instances
        (execution_id, workflow_id, trigger_type, status, started_at, completed_at,
         step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth)
      SELECT execution_id, workflow_id, trigger_type, status, started_at, completed_at,
             step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth
      FROM "${schema}".workflow_executions_archive
      WHERE execution_id = $1
      RETURNING execution_id
    )
    DELETE FROM "${schema}".workflow_executions_archive
    WHERE execution_id IN (SELECT execution_id FROM restored)
    RETURNING execution_id`;
    return safeQuery(query, args);
  }

  static async query321(schema: string, args: unknown[]) {
    const query = `SELECT a.*, w.name AS workflow_name
     FROM "${schema}".workflow_executions_archive a
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = a.workflow_id
     ORDER BY a.archived_at DESC
     LIMIT 200`;
    return safeQuery(query, args);
  }

  static async query322(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflows
         SET status = 'archived', updated_at = NOW()
         WHERE status != 'archived'
           AND updated_at < NOW() - INTERVAL '${policy.archive_after_days} days'
           ${policy.workflow_id ? `AND workflow_id = '${policy.workflow_id}'` : ""}
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".workflow_instances we
             WHERE we.workflow_id = workflows.workflow_id
               AND we.started_at > NOW() - INTERVAL '${policy.archive_after_days} days'
           )
         RETURNING workflow_id`;
    return safeQuery(query, args);
  }

  static async query323(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".workflow_executions_archive
           WHERE archived_at < NOW() - INTERVAL '${policy.retention_days} days'
           ${policy.workflow_id ? `AND workflow_id = '${policy.workflow_id}'` : ""}
           RETURNING execution_id`;
    return safeQuery(query, args);
  }

  static async query324(schema: string, args: unknown[]) {
    const query = `WITH moved AS (
          INSERT INTO "${schema}".workflow_executions_archive
            (execution_id, workflow_id, trigger_type, status, started_at, completed_at,
             step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth)
          SELECT execution_id, workflow_id, trigger_type, status, started_at, completed_at,
                 step_log, is_simulation, sla_deadline, deadline, due_at, parent_execution_id, depth
          FROM "${schema}".workflow_instances we
          WHERE we.completed_at IS NOT NULL
            AND we.completed_at < NOW() - INTERVAL '${policy.archive_after_days} days'
            ${workflowFilter}
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".workflow_executions_archive a WHERE a.execution_id = we.execution_id
            )
          RETURNING execution_id
        )
        DELETE FROM "${schema}".workflow_instances
        WHERE execution_id IN (SELECT execution_id FROM moved)
        RETURNING execution_id`;
    return safeQuery(query, args);
  }

  static async query325(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_retention_policies`;
    return safeQuery(query, args);
  }

  static async query326(schema: string, args: unknown[]) {
    const query = `DELETE FROM "${schema}".workflow_retention_policies WHERE policy_id = $1 RETURNING policy_id`;
    return safeQuery(query, args);
  }

  static async query327(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_retention_policies SET ${sets.join(", ")} WHERE policy_id = $1 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query328(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_retention_policies
      (workflow_id, retention_days, archive_after_days, auto_delete, applies_to)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query329(schema: string, args: unknown[]) {
    const query = `SELECT rp.*, w.name AS workflow_name
     FROM "${schema}".workflow_retention_policies rp
     LEFT JOIN "${schema}".workflows w ON w.workflow_id = rp.workflow_id
     ORDER BY rp.created_at DESC`;
    return safeQuery(query, args);
  }

  static async query330(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_rollback_log
     WHERE rollback_status IN ('pending','in_progress')
     ORDER BY created_at ASC LIMIT $1`;
    return safeQuery(query, args);
  }

  static async query331(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_rollback_log
     WHERE instance_id = $1 ORDER BY created_at DESC`;
    return safeQuery(query, args);
  }

  static async query332(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_rollback_log
       SET rollback_status = 'failed', compensating_state = $1
       WHERE rollback_id = $2`;
    return safeQuery(query, args);
  }

  static async query333(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_rollback_log
       SET rollback_status = 'completed', compensating_state = $1, completed_at = NOW()
       WHERE rollback_id = $2
       RETURNING *`;
    return safeQuery(query, args);
  }

  static async query334(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_rollback_log
     SET rollback_status = 'in_progress' WHERE rollback_id = $1 AND rollback_status = 'pending'`;
    return safeQuery(query, args);
  }

  static async query335(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_rollback_log
       (instance_id, step_id, original_action_id, original_action_type,
        original_state, compensating_action_type, rollback_reason, initiated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query336(schema: string, args: unknown[]) {
    const query = "SELECT tenant_id FROM tenants WHERE status = 'active'";
    return safeQuery(query, args);
  }

  static async query337(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_events (instance_id, event_type, step_id, payload, triggered_by, created_by)
             VALUES ($1, 'recovery_failed', $2, $3, 'system', 'system')`;
    return safeQuery(query, args);
  }

  static async query338(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_events (instance_id, event_type, step_id, payload, triggered_by, created_by)
           VALUES ($1, 'auto_recovered', $2, $3, 'system', 'system')`;
    return safeQuery(query, args);
  }

  static async query339(schema: string, args: unknown[]) {
    const query = `SELECT wi.instance_id, wi.workflow_id, wi.current_step_id, wi.status, wi.updated_at
       FROM "${schema}".workflow_instances wi
       WHERE wi.status = 'in_progress'
         AND wi.updated_at < NOW() - INTERVAL '${STALL_THRESHOLD_MINUTES} minutes'
         AND wi.deleted_at IS NULL
       ORDER BY wi.updated_at ASC
       LIMIT 20`;
    return safeQuery(query, args);
  }

  static async query340(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query341(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instances SET status = 'archived', updated_at = NOW() WHERE instance_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query342(schema: string, args: unknown[]) {
    const query = `SELECT instance_id FROM "${schema}".workflow_instances WHERE tenant_id = $1 AND status IN ('completed', 'failed') AND updated_at < NOW() - INTERVAL '30 days'`;
    return safeQuery(query, args);
  }

  static async query343(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query344(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instances SET status = $1, updated_at = NOW() WHERE instance_id = $2 AND tenant_id = $3`;
    return safeQuery(query, args);
  }

  static async query345(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".workflow_instances WHERE instance_id = $1 AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query346(schema: string, args: unknown[]) {
    const query = `SELECT action, before_state, after_state, user_id, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND entity_type = 'instance' ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query347(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".audit_trail (tenant_id, user_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
    return safeQuery(query, args);
  }

  static async query348(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflow_instances SET status = $1, updated_at = NOW() WHERE instance_id = $2 AND tenant_id = $3 RETURNING instance_id`;
    return safeQuery(query, args);
  }

  static async query349(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_tasks
       (task_id, tenant_id, task_type, title, description, module_code, entity_type, entity_id,
        priority, assignee_user_id, assignee_role_code, status, due_date, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending',
               CASE WHEN $12 > 0 THEN NOW() + ($12 || ' days')::interval ELSE NULL END,
               $13, NOW())`;
    return safeQuery(query, args);
  }

  static async query350(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
         SET escalation_level = COALESCE(escalation_level, 0) + 1
         WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query351(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
               SET team_id = $1, assigned_user_id = $2, status = 'escalated',
                   escalation_level = COALESCE(escalation_level, 0) + 1
               WHERE task_id = $3`;
    return safeQuery(query, args);
  }

  static async query352(schema: string, args: unknown[]) {
    const query = `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
           WHERE from_team_id = $1 AND escalation_level = 1 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query353(schema: string, args: unknown[]) {
    const query = `SELECT task_id, team_id, assigned_user_id, title, priority, created_at, updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400 AS days_stale
     FROM "${schema}".process_tasks
     WHERE status = 'pending'
       AND updated_at < NOW() - INTERVAL '14 days'
       AND breached_at IS NULL
     ORDER BY updated_at ASC`;
    return safeQuery(query, args);
  }

  static async query354(schema: string, args: unknown[]) {
    const query = `SELECT task_id, team_id, assigned_user_id, title, priority, created_at, updated_at,
            EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400 AS days_stale
     FROM "${schema}".process_tasks
     WHERE status = 'pending'
       AND updated_at < NOW() - INTERVAL '7 days'
       AND updated_at >= NOW() - INTERVAL '14 days'
       AND breached_at IS NULL
     ORDER BY updated_at ASC`;
    return safeQuery(query, args);
  }

  static async query355(schema: string, args: unknown[]) {
    const query = `SELECT task_id, assigned_user_id, title, priority, sla_hours, due_date,
            EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 AS hours_remaining
     FROM "${schema}".process_tasks
     WHERE status NOT IN ('completed', 'cancelled', 'auto_closed', 'escalated')
       AND breached_at IS NULL
       AND sla_hours > 0
       AND EXTRACT(EPOCH FROM (due_date - NOW())) / 3600 < (sla_hours * 0.25)
       AND EXTRACT(EPOCH FROM (due_date - NOW())) > 0`;
    return safeQuery(query, args);
  }

  static async query356(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
             SET team_id = $1, assigned_user_id = $2, status = 'escalated'
             WHERE task_id = $3`;
    return safeQuery(query, args);
  }

  static async query357(schema: string, args: unknown[]) {
    const query = `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
         WHERE from_team_id = $1 AND escalation_level = $2 LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query358(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
     SET breached_at = NOW(), escalation_level = COALESCE(escalation_level, 0) + 1
     WHERE status NOT IN ('completed', 'cancelled', 'auto_closed')
       AND due_date < NOW()
       AND breached_at IS NULL
     RETURNING task_id, team_id, assigned_user_id, title, priority, escalation_level`;
    return safeQuery(query, args);
  }

  static async query359(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".process_tasks
       SET auto_resolved = TRUE,
           resolution_source = $2,
           resolution_evidence = $3
       WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query360(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(risk_score, 0)::int AS risk_score
       FROM "${schema}".risks WHERE risk_id = $1
       UNION ALL
       SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM "${schema}".risks WHERE risk_id = $1)
       LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query361(schema: string, args: unknown[]) {
    const query = `SELECT task_id, assigned_user_id, priority, entity_type, entity_id
         FROM "${schema}".process_tasks
         WHERE entity_type = $1 AND entity_id = $2 AND task_type = $3
           AND status NOT IN ('completed', 'cancelled', 'auto_closed')
         ORDER BY created_at ASC`;
    return safeQuery(query, args);
  }

  static async query362(schema: string, args: unknown[]) {
    const query = `SELECT entity_type, max_priority, max_risk_score, min_authority_level, require_audit_log
       FROM "${schema}".auto_approval_config
       WHERE entity_type = $1 AND enabled = TRUE LIMIT 1`;
    return safeQuery(query, args);
  }

  static async query363(schema: string, args: unknown[]) {
    const query = `SELECT id, entity_type, task_type, trigger_event, resolution_conditions,
              auto_close, require_validation, validation_min_score
       FROM "${schema}".task_auto_resolution_rules
       WHERE active = TRUE`;
    return safeQuery(query, args);
  }

  static async query364(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'done' OR status = 'completed') as completed
     FROM "${schema}".remediation_tasks WHERE linked_entity_type = $1 AND linked_entity_id = $2`;
    return safeQuery(query, args);
  }

  static async query365(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_tasks SET status = $1, completed_at = ${completedAt} WHERE task_id = $2 RETURNING *`;
    return safeQuery(query, args);
  }

  static async query366(schema: string, args: unknown[]) {
    const query = `SELECT status FROM "${schema}".remediation_tasks WHERE task_id = $1`;
    return safeQuery(query, args);
  }

  static async query367(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".remediation_tasks (title, description, assigned_to, due_date, linked_entity_type, linked_entity_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'todo') RETURNING *`;
    return safeQuery(query, args);
  }

  static async query368(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, description,
              CASE status
                WHEN 'pending' THEN 'todo'
                WHEN 'assigned' THEN 'todo'
                WHEN 'in_progress' THEN 'in_progress'
                WHEN 'escalated' THEN 'in_progress'
                WHEN 'completed' THEN 'done'
                WHEN 'cancelled' THEN 'done'
                ELSE 'todo'
              END AS status,
              assigned_user_id AS assigned_to,
              due_date, task_type AS linked_entity_type, trigger_source AS linked_entity_id, created_at
       FROM "${schema}".process_tasks ORDER BY due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query369(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, description, status, assigned_to, due_date, linked_entity_type, linked_entity_id, created_at
     FROM "${schema}".remediation_tasks ORDER BY due_date ASC NULLS LAST`;
    return safeQuery(query, args);
  }

  static async query370(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".triage_proposals ${where} ORDER BY created_at DESC LIMIT 100`;
    return safeQuery(query, args);
  }

  static async query371(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".remediation_tasks SET assigned_to = $1 WHERE task_id = $2`;
    return safeQuery(query, args);
  }

  static async query372(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".triage_proposals
     SET status = $1, resolved_by = $2, resolved_at = NOW()
     WHERE proposal_id = $3`;
    return safeQuery(query, args);
  }

  static async query373(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".triage_proposals WHERE proposal_id = $1`;
    return safeQuery(query, args);
  }

  static async query374(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".triage_proposals
         (task_id, task_title, proposed_assignee_id, proposed_assignee_name,
          agent_id, reasoning, confidence_score, workload_score, skill_match_score)
       VALUES ($1,$2,$3,$4,'AGENT-A01',$5,$6,$7,$8) RETURNING proposal_id, created_at`;
    return safeQuery(query, args);
  }

  static async query375(schema: string, args: unknown[]) {
    const query = `SELECT u.user_id, u.display_name, u.role,
            COALESCE(wl.open_tasks, 0) AS open_tasks
     FROM "${schema}".unified_squad_members u
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS open_tasks
       FROM "${schema}".remediation_tasks t
       WHERE t.assigned_to = u.user_id AND t.status NOT IN ('completed', 'resolved')
     ) wl ON true
     WHERE u.is_agent = FALSE AND u.current_status != 'offline'`;
    return safeQuery(query, args);
  }

  static async query376(schema: string, args: unknown[]) {
    const query = `SELECT task_id, title, description, due_date, linked_entity_type
     FROM "${schema}".remediation_tasks
     WHERE (assigned_to IS NULL OR assigned_to = '')
       AND status NOT IN ('completed', 'resolved')
     ORDER BY due_date ASC NULLS LAST LIMIT 50`;
    return safeQuery(query, args);
  }

  static async query377(schema: string, args: unknown[]) {
    const query = `SELECT DISTINCT agent_id FROM "${schema}".agent_runs WHERE tenant_id = $1`;
    return safeQuery(query, args);
  }

  static async query378(schema: string, args: unknown[]) {
    const query = `SELECT MAX(created_at) as last_executed
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND tenant_id = $2 AND status = 'completed'`;
    return safeQuery(query, args);
  }

  static async query379(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as count
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND status = 'queued' AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query380(schema: string, args: unknown[]) {
    const query = `SELECT COUNT(*) as count, AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) * 1000) as avg_duration
     FROM "${schema}".agent_runs
     WHERE agent_id = $1 AND status IN ('running', 'pending') AND tenant_id = $2`;
    return safeQuery(query, args);
  }

  static async query381(schema: string, args: unknown[]) {
    const query = `SELECT version_number, definition_snapshot
     FROM "${schema}".workflow_versions
     WHERE definition_id = $1 AND version_number IN ($2, $3)`;
    return safeQuery(query, args);
  }

  static async query382(schema: string, args: unknown[]) {
    const query = `SELECT execution_id, status, started_at, completed_at, step_log
     FROM "${schema}".workflow_instances
     WHERE execution_id IN ($1, $2)`;
    return safeQuery(query, args);
  }

  static async query383(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflows (name, definition, status, created_by)
     VALUES ($1, $2, 'active', $3) RETURNING *`;
    return safeQuery(query, args);
  }

  static async query384(schema: string, args: unknown[]) {
    const query = `SELECT name, definition FROM "${schema}".workflows WHERE workflow_id::text = $1 AND status = 'template'`;
    return safeQuery(query, args);
  }

  static async query385(schema: string, args: unknown[]) {
    const query = `SELECT name, definition FROM "${schema}".workflow_templates WHERE template_id::text = $1 OR name = $1`;
    return safeQuery(query, args);
  }

  static async query386(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_templates (name, description, definition, parameters_schema, created_by)
         VALUES ($1, $2, $3, '{}', $4)`;
    return safeQuery(query, args);
  }

  static async query387(schema: string, args: unknown[]) {
    const query = `SELECT template_id FROM "${schema}".workflow_templates WHERE name = $1`;
    return safeQuery(query, args);
  }

  static async query388(schema: string, args: unknown[]) {
    const query = `SELECT w.workflow_id AS "templateKey", w.name AS name_en, w.name_ar, w.description, w.definition
     FROM "${schema}".workflows w
     WHERE w.status = 'template'
     ORDER BY w.created_at`;
    return safeQuery(query, args);
  }

  static async query389(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_graph_versions WHERE version_id = $1`;
    return safeQuery(query, args);
  }

  static async query390(schema: string, args: unknown[]) {
    const query = `SELECT * FROM "${schema}".workflow_graph_versions
       WHERE run_id = $1 ORDER BY version_number DESC`;
    return safeQuery(query, args);
  }

  static async query391(schema: string, args: unknown[]) {
    const query = `INSERT INTO "${schema}".workflow_graph_versions
         (tenant_id, run_id, version_number, graph_snapshot, change_summary, changed_by, change_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING version_id`;
    return safeQuery(query, args);
  }

  static async query392(schema: string, args: unknown[]) {
    const query = `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM "${schema}".workflow_graph_versions WHERE run_id = $1`;
    return safeQuery(query, args);
  }

  static async query393(schema: string, args: unknown[]) {
    const query = `UPDATE "${schema}".workflows SET
       name = $1, definition = $2, version = $3, updated_at = NOW()
     WHERE workflow_id = $4
     RETURNING *`;
    return safeQuery(query, args);
  }

  static async query394(schema: string, args: unknown[]) {
    const query = `SELECT version, workflow_id FROM "${schema}".workflows WHERE workflow_id = $1`;
    return safeQuery(query, args);
  }

}

// Auto-extracted Ai repository
import { safeQuery } from '../ports/database.port.js';
export class AiAutoRepo {
    static async query1(schema, args) {
        const query = `UPDATE "${schema}".ai_activity_alerts SET acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query2(schema, args) {
        const query = `INSERT INTO "${schema}".ai_alert_rules (id, tenant_id, rule_name, condition_type, condition_config, severity, message_template)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       rule_name = EXCLUDED.rule_name,
       condition_type = EXCLUDED.condition_type,
       condition_config = EXCLUDED.condition_config,
       severity = EXCLUDED.severity,
       message_template = EXCLUDED.message_template,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query3(schema, args) {
        const query = `INSERT INTO "${schema}".ai_activity_alerts (tenant_id, alert_type, severity, message, metadata)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`;
        return safeQuery(query, args);
    }
    static async query4(schema, args) {
        const query = `SELECT COUNT(*) AS cnt FROM "${schema}".role_usage_audit WHERE result = 'denied' AND created_at > NOW() - make_interval(hours => $1)`;
        return safeQuery(query, args);
    }
    static async query5(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_alert_rules WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query6(schema, args) {
        const query = `CREATE TABLE IF NOT EXISTS "${schema}".ai_alert_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT $1::uuid,
        rule_name VARCHAR(100) NOT NULL,
        condition_type VARCHAR(50) NOT NULL,
        condition_config JSONB DEFAULT '{}',
        severity VARCHAR(20) DEFAULT 'warning',
        message_template TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
        return safeQuery(query, args);
    }
    static async query7(schema, args) {
        const query = `CREATE TABLE IF NOT EXISTS "${schema}".ai_activity_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL DEFAULT $1::uuid,
        alert_type VARCHAR(50) NOT NULL DEFAULT 'system',
        severity VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
        message TEXT NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        acknowledged_by VARCHAR(100),
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;
        return safeQuery(query, args);
    }
    static async query8(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_activity_alerts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query9(schema, args) {
        const query = `SELECT * FROM "${schema}".activity_feed
       WHERE created_at BETWEEN ($1::timestamptz - make_interval(mins => $2)) AND ($1::timestamptz + make_interval(mins => $2))
         AND NOT (entity_type = $3 AND entity_id = $4)
       ORDER BY created_at DESC
       LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query10(schema, args) {
        const query = `SELECT created_at FROM "${schema}".activity_feed
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query11(schema, args) {
        const query = `SELECT * FROM "${schema}".activity_feed
       WHERE entity_type = $1 AND entity_id = $2
         AND created_at > NOW() - make_interval(days => $3)
       ORDER BY created_at DESC
       LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query12(schema, args) {
        const query = `SELECT
       e1.event_id AS trigger_event_id,
       e1.event_type AS trigger_event_type,
       e1.source_service AS trigger_source,
       e1.payload AS trigger_payload,
       e2.event_id AS responder_event_id,
       e2.event_type AS responder_event_type,
       e2.source_service AS responder_source,
       e2.payload AS responder_payload,
       e1.entity_type,
       e1.entity_id,
       e2.created_at
     FROM "${schema}".agrc_event_log e1
     JOIN "${schema}".agrc_event_log e2
       ON e1.entity_id = e2.entity_id
       AND e1.entity_id IS NOT NULL
       AND e1.entity_id != ''
       AND e2.created_at > e1.created_at
       AND e2.created_at <= e1.created_at + INTERVAL '24 hours'
       AND e1.event_id != e2.event_id
       AND e1.source_service != e2.source_service
     WHERE (e1.source_service LIKE 'agent%' OR e1.source_service LIKE '%agent-runner%')
       AND (e2.source_service LIKE 'agent%' OR e2.source_service LIKE '%agent-runner%')
     ORDER BY e2.created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(safeLimit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query13(schema, args) {
        const query = `SELECT
       COALESCE(payload->>'agent_id', payload->>'agentId', 'any') AS agent_id,
       COUNT(*) FILTER (WHERE status = 'completed' AND assignee_type = 'agent') AS auto_resolved,
       COUNT(*) FILTER (WHERE status = 'escalated' OR assignee_type = 'human') AS escalated
     FROM "${schema}".process_tasks
     WHERE (payload->>'agent_id' IS NOT NULL OR payload->>'agentId' IS NOT NULL)
     GROUP BY COALESCE(payload->>'agent_id', payload->>'agentId', 'any')`;
        return safeQuery(query, args);
    }
    static async query14(schema, args) {
        const query = `SELECT event_type, source_service, payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE source_service LIKE 'agent%'
        OR source_service LIKE '%agent-runner%'
        OR event_type LIKE 'agent.%'
        OR event_type LIKE 'process_task.%'
     ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query15(schema, args) {
        const query = `SELECT event_id, event_type, source_service, entity_type, entity_id, severity, payload, created_at
     FROM "${schema}".agrc_event_log
     ${where}
     ORDER BY created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query16(schema, args) {
        const query = `SELECT user_id FROM "${schema}".unified_squad_members
     WHERE is_agent = FALSE AND (role LIKE '%admin%' OR role LIKE '%lead%')`;
        return safeQuery(query, args);
    }
    static async query17(schema, args) {
        const query = `SELECT event_type, payload FROM "${schema}".event_log
     WHERE source_service LIKE $1 AND created_at >= $2
     ORDER BY created_at DESC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query18(schema, args) {
        const query = `SELECT tasks_completed, suggestions_generated, error_count
     FROM "${schema}".agent_collaboration_metrics WHERE agent_user_id = $1`;
        return safeQuery(query, args);
    }
    static async query19(schema, args) {
        const query = `SELECT team_lead_priorities FROM "${schema}".standup_digests
     WHERE tenant_id = $1 AND team_lead_priorities IS NOT NULL
     ORDER BY generated_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query20(schema, args) {
        const query = `SELECT * FROM "${schema}".standup_digests WHERE tenant_id = $1 ORDER BY generated_at DESC LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query21(schema, args) {
        const query = `SELECT * FROM "${schema}".standup_digests WHERE digest_id = $1`;
        return safeQuery(query, args);
    }
    static async query22(schema, args) {
        const query = `UPDATE "${schema}".standup_digests
     SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $1,
         team_lead_priorities = $2
     WHERE digest_id = $3`;
        return safeQuery(query, args);
    }
    static async query23(schema, args) {
        const query = `INSERT INTO "${schema}".standup_digests (tenant_id, entries)
     VALUES ($1, $2) RETURNING digest_id, generated_at`;
        return safeQuery(query, args);
    }
    static async query24(schema, args) {
        const query = `SELECT 
        agent_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
        MAX(started_at) as last_task_at
       FROM "${schema}".agent_tasks
       WHERE started_at > NOW() - INTERVAL '${days} days'
       GROUP BY agent_id`;
        return safeQuery(query, args);
    }
    static async query25(schema, args) {
        const query = `SELECT 
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms,
        MAX(started_at) as last_task_at
       FROM "${schema}".agent_tasks
       WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '${days} days'`;
        return safeQuery(query, args);
    }
    static async query26(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query27(schema, args) {
        const query = `SELECT task_id, tenant_id, agent_id, run_id, action_type, action_title,
              entity_type, entity_id, status, verification_status, verification_details,
              started_at, completed_at, duration_ms, error, retry_count, metadata
       FROM "${schema}".agent_tasks
       WHERE task_id = $1`;
        return safeQuery(query, args);
    }
    static async query28(schema, args) {
        const query = `UPDATE "${schema}".agent_tasks SET retry_count = retry_count + 1 WHERE task_id = $1`;
        return safeQuery(query, args);
    }
    static async query29(schema, args) {
        const query = `UPDATE "${schema}".agent_tasks
       SET verification_status = $1, verification_details = $2, status = CASE WHEN $1 = true THEN 'verified' ELSE 'unverified' END
       WHERE task_id = $3`;
        return safeQuery(query, args);
    }
    static async query30(schema, args) {
        const query = `UPDATE "${schema}".agent_tasks SET ${updates.join(', ')} WHERE task_id = $${paramIndex}`;
        return safeQuery(query, args);
    }
    static async query31(schema, args) {
        const query = `INSERT INTO "${schema}".agent_tasks (
        task_id, tenant_id, agent_id, run_id, action_type, action_title,
        entity_type, entity_id, status, started_at, retry_count, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), 0, $10)`;
        return safeQuery(query, args);
    }
    static async query32(schema, args) {
        const query = `SELECT * FROM "${schema}".activity_feed
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(safeLimit + 1)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query33(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
       VALUES ('agent_conflict', 'conflict', $1, $2::jsonb, NOW())
       ON CONFLICT DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query34(schema, args) {
        const query = `SELECT 1 FROM "${schema}".agent_conflicts
     WHERE tenant_id = $1 AND entity_type = $2 AND (entity_id IS NOT DISTINCT FROM $3) AND status = 'open'
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query35(schema, args) {
        const query = `INSERT INTO "${schema}".agent_conflicts
         (tenant_id, cycle_id, entity_type, entity_id, proposals, conflict_type, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')
         RETURNING conflict_id`;
        return safeQuery(query, args);
    }
    static async query36(schema, args) {
        const query = `INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
                 findings = EXCLUDED.findings`;
        return safeQuery(query, args);
    }
    static async query37(schema, args) {
        const query = `INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET
               agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
               findings = EXCLUDED.findings`;
        return safeQuery(query, args);
    }
    static async query38(schema, args) {
        const query = `INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
                 findings = EXCLUDED.findings`;
        return safeQuery(query, args);
    }
    static async query39(schema, args) {
        const query = `SELECT observation_id as id, agent_id as "agentId", observation_type as type,
              title, severity, entity_type as "entityType", entity_id as "entityId",
              description as details, created_at as timestamp
       FROM "${schema}".ai_observations
       WHERE tenant_id = $1 AND created_at >= $2 ${otherAgentsFilter}
       ORDER BY created_at DESC
       LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query40(schema, args) {
        const query = `SELECT id, agent_id as "agentId", discovery_type as type, title, severity,
              entity_type as "entityType", entity_id as "entityId", details, created_at as timestamp
       FROM "${schema}".agent_discoveries
       WHERE tenant_id = $1 AND created_at >= $2 ${otherAgentsFilter}
       ORDER BY created_at DESC
       LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query41(schema, args) {
        const query = `SELECT observation_id as id, agent_id as "agentId", observation_type as type,
                title, severity, entity_type as "entityType", entity_id as "entityId",
                description as details, created_at as timestamp
         FROM "${schema}".ai_observations
         WHERE tenant_id = $1 AND agent_id = $2 AND created_at >= $3
         ORDER BY created_at DESC
         LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query42(schema, args) {
        const query = `SELECT DISTINCT ON (agent_id)
         agent_id, depends_on_agents, feeds_into_agents, priority, can_parallel_with
       FROM "${schema}".agent_dependency_config
       WHERE tenant_id = $1
         AND enabled = TRUE
         AND effective_from <= $2
         AND (effective_until IS NULL OR effective_until >= $2)
       ORDER BY agent_id, effective_from DESC`;
        return safeQuery(query, args);
    }
    static async query43(schema, args) {
        const query = `INSERT INTO "${schema}".agent_dependency_config
       (tenant_id, agent_id, depends_on_agents, feeds_into_agents, priority,
        can_parallel_with, effective_from, effective_until, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        return safeQuery(query, args);
    }
    static async query44(schema, args) {
        const query = `SELECT depends_on_agents, feeds_into_agents, priority, can_parallel_with
       FROM "${schema}".agent_dependency_config
       WHERE tenant_id = $1 AND agent_id = $2
         AND enabled = TRUE
         AND effective_from <= $3
         AND (effective_until IS NULL OR effective_until >= $3)
       ORDER BY effective_from DESC
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query45(schema, args) {
        const query = `INSERT INTO "${schema}".agent_correlations (id, agents, shared_entity, severity, findings, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT (id) DO UPDATE SET
           agents = EXCLUDED.agents, shared_entity = EXCLUDED.shared_entity, severity = EXCLUDED.severity,
           findings = EXCLUDED.findings
         WHERE (agent_correlations.shared_entity, agent_correlations.severity) IS DISTINCT FROM (EXCLUDED.shared_entity, EXCLUDED.severity)`;
        return safeQuery(query, args);
    }
    static async query46(schema, args) {
        const query = `INSERT INTO "${schema}".agent_discoveries (id, agent_id, discovery_type, title, severity, entity_type, entity_id, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           discovery_type = EXCLUDED.discovery_type, title = EXCLUDED.title, severity = EXCLUDED.severity,
           details = EXCLUDED.details
         WHERE (agent_discoveries.title, agent_discoveries.severity) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.severity)`;
        return safeQuery(query, args);
    }
    static async query47(schema, args) {
        const query = `INSERT INTO "${schema}".agent_handoffs (id, from_agent, to_agent, handoff_type, priority, status, payload, created_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, completed_at = EXCLUDED.completed_at`;
        return safeQuery(query, args);
    }
    static async query48(schema, args) {
        const query = `INSERT INTO "${schema}".agent_cycle_summaries
         (cycle_id, tenant_id, discoveries, handoffs, correlations, discovery_count, handoff_count, correlation_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (cycle_id) DO UPDATE SET
         discoveries = EXCLUDED.discoveries,
         handoffs = EXCLUDED.handoffs,
         correlations = EXCLUDED.correlations,
         discovery_count = EXCLUDED.discovery_count,
         handoff_count = EXCLUDED.handoff_count,
         correlation_count = EXCLUDED.correlation_count`;
        return safeQuery(query, args);
    }
    static async query49(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, entity_id, payload, created_at)
         VALUES ('shared_finding', $1, $2, $3::jsonb, NOW())`;
        return safeQuery(query, args);
    }
    static async query50(schema, args) {
        const query = `SELECT id, event_type, source_service, payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE event_type = 'agent.cooperation'
       AND tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query51(schema, args) {
        const query = `SELECT payload, created_at
     FROM "${schema}".agrc_event_log
     WHERE event_type = 'agent.cooperation'
       AND tenant_id = $1
       AND (payload->>'toAgentId') = $2
       AND (payload->>'cooperationType') = 'share_findings'
     ORDER BY created_at DESC
     LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query52(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log
       (event_type, source_service, tenant_id, severity, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
        return safeQuery(query, args);
    }
    static async query53(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log
         (event_type, source_service, tenant_id, severity, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`;
        return safeQuery(query, args);
    }
    static async query54(schema, args) {
        const query = text;
        return safeQuery(query, args);
    }
    static async query55(schema, args) {
        const query = `SELECT
        COUNT(*) FILTER (WHERE status = 'pending_approval') AS pending,
        COUNT(*) FILTER (WHERE status = 'executed' AND updated_at > NOW() - INTERVAL '24 hours') AS executed,
        COUNT(*) FILTER (WHERE status = 'rejected' AND updated_at > NOW() - INTERVAL '24 hours') AS rejected
       FROM "${schema}".agent_proposals
       WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query56(schema, args) {
        const query = `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS recent
       FROM "${schema}".agent_memories
       WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query57(schema, args) {
        const query = `SELECT
        COUNT(*) FILTER (WHERE status IN ('open','in_progress')) AS open_tasks,
        COUNT(*) FILTER (WHERE breached_at IS NOT NULL) AS breached_tasks,
        COUNT(*) FILTER (WHERE due_at IS NOT NULL AND due_at < NOW() + INTERVAL '4 hours' AND breached_at IS NULL AND status IN ('open','in_progress')) AS warning_tasks
       FROM "${schema}".process_tasks
       WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query58(schema, args) {
        const query = `SELECT status, started_at, completed_at,
                EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) * 1000 AS duration_ms
         FROM "${schema}".agent_runs
         WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '24 hours'
         ORDER BY started_at DESC`;
        return safeQuery(query, args);
    }
    static async query59(schema, args) {
        const query = `SELECT * FROM "${schema}".co_draft_sessions ${where} ORDER BY updated_at DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query60(schema, args) {
        const query = `SELECT * FROM "${schema}".co_draft_sessions WHERE session_id = $1`;
        return safeQuery(query, args);
    }
    static async query61(schema, args) {
        const query = `UPDATE "${schema}".co_draft_sessions SET status = 'finalized', updated_at = NOW() WHERE session_id = $1`;
        return safeQuery(query, args);
    }
    static async query62(schema, args) {
        const query = `UPDATE "${schema}".co_draft_sessions
     SET uncertain_sections = $1, human_resolutions = $2, draft_content = $3, status = $4, updated_at = NOW()
     WHERE session_id = $5`;
        return safeQuery(query, args);
    }
    static async query63(schema, args) {
        const query = `SELECT * FROM "${schema}".co_draft_sessions WHERE session_id = $1`;
        return safeQuery(query, args);
    }
    static async query64(schema, args) {
        const query = `INSERT INTO "${schema}".co_draft_sessions
       (entity_type, entity_id, agent_id, human_user_id, draft_content, uncertain_sections)
     VALUES ($1,$2,'AGENT-A04',$3,$4,$5) RETURNING session_id, created_at, updated_at`;
        return safeQuery(query, args);
    }
    static async query65(schema, args) {
        const query = `SELECT module_code, state, activation_source, trial_expiry_at, is_mandatory
       FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY priority, module_code`;
        return safeQuery(query, args);
    }
    static async query66(schema, args) {
        const query = `SELECT tenant_id, context_version, complexity,
              business_profile, regulatory_profile, framework_profile,
              module_profile, ownership_profile, persona_profile,
              pain_profile, automation_profile, agent_profile,
              computed_at
       FROM public.tenant_governance_context
       WHERE tenant_id = $1 AND is_active = true
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query67(schema, args) {
        const query = `SELECT overall_score FROM "${schema}".governance_health_scores ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query68(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'open')::int AS open, COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS critical FROM "${schema}".audit_findings`;
        return safeQuery(query, args);
    }
    static async query69(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'in_progress')::int AS active FROM "${schema}".audit_engagements`;
        return safeQuery(query, args);
    }
    static async query70(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE risk_tier IN ('critical','high'))::int AS high_risk,
            COUNT(*) FILTER (WHERE reassessment_due < NOW())::int AS overdue
     FROM "${schema}".vendor_profiles`;
        return safeQuery(query, args);
    }
    static async query71(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
            COUNT(*) FILTER (WHERE status = 'pending_approval')::int AS pending,
            COUNT(*) FILTER (WHERE review_date < NOW())::int AS overdue_review
     FROM "${schema}".policies`;
        return safeQuery(query, args);
    }
    static async query72(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE current_value > threshold_value)::int AS breached FROM "${schema}".key_risk_indicators`;
        return safeQuery(query, args);
    }
    static async query73(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE risk_level IN ('critical'))::int AS critical, COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high, COALESCE(AVG(risk_score),0)::int AS avg_score FROM "${schema}".risks`;
        return safeQuery(query, args);
    }
    static async query74(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'open')::int AS open,
            COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
     FROM "${schema}".compliance_gaps`;
        return safeQuery(query, args);
    }
    static async query75(schema, args) {
        const query = `SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending, COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('approved','cancelled'))::int AS overdue FROM "${schema}".evidence_requests`;
        return safeQuery(query, args);
    }
    static async query76(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < NOW() + INTERVAL '30 days' AND expiry_date > NOW())::int AS expiring FROM "${schema}".evidence`;
        return safeQuery(query, args);
    }
    static async query77(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE implementation_status = 'implemented')::int AS implemented,
            COUNT(*) FILTER (WHERE effectiveness = 'ineffective')::int AS ineffective,
            COUNT(*) FILTER (WHERE status = 'draft')::int AS draft
     FROM "${schema}".controls`;
        return safeQuery(query, args);
    }
    static async query78(schema, args) {
        const query = `SELECT COUNT(*)::int AS mappings FROM "${schema}".control_mappings`;
        return safeQuery(query, args);
    }
    static async query79(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM "${schema}".frameworks`;
        return safeQuery(query, args);
    }
    static async query80(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'active')::int AS active,
            COUNT(*) FILTER (WHERE last_login < NOW() - INTERVAL '90 days')::int AS dormant
     FROM "${schema}".users`;
        return safeQuery(query, args);
    }
    static async query81(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
     FROM "${schema}".onboarding_steps`;
        return safeQuery(query, args);
    }
    static async query82(schema, args) {
        const query = `SELECT role, permissions FROM "${schema}".users WHERE user_id = (SELECT actor_id FROM "${schema}".audit_trail ORDER BY created_at DESC LIMIT 1)`;
        return safeQuery(query, args);
    }
    static async query83(schema, args) {
        const query = `SELECT entity_type, action, created_at FROM "${schema}".audit_trail WHERE created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query84(schema, args) {
        const query = `SELECT model_id, COUNT(*)::int AS runs, COALESCE(SUM(tokens_used), 0)::int AS tokens
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - ($1 || ' days')::INTERVAL AND deleted_at IS NULL AND model_id IS NOT NULL
         GROUP BY model_id ORDER BY tokens DESC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query85(schema, args) {
        const query = `SELECT aa.agent_code, COUNT(*)::int AS runs, COALESCE(SUM(ar.tokens_used), 0)::int AS tokens
         FROM "${schema}".ai_agent_runs ar
         LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
         WHERE ar.created_at > NOW() - ($1 || ' days')::INTERVAL AND ar.deleted_at IS NULL
         GROUP BY aa.agent_code ORDER BY tokens DESC LIMIT 15`;
        return safeQuery(query, args);
    }
    static async query86(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total_runs,
           COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
           ROUND(COALESCE(SUM(estimated_cost_usd), 0)::numeric, 4) AS total_cost
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - ($1 || ' days')::INTERVAL AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query87(schema, args) {
        const query = `SELECT ar.run_id, aa.agent_code, ar.module_code, ar.error_message, ar.started_at
     FROM "${schema}".ai_agent_runs ar
     LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
     WHERE ar.status = 'failed' AND ar.created_at > NOW() - INTERVAL '24 hours' AND ar.deleted_at IS NULL
     ORDER BY ar.started_at DESC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query88(schema, args) {
        const query = `SELECT ar.agent_id, aa.agent_code,
       COUNT(*)::int AS run_count,
       COUNT(*) FILTER (WHERE ar.status = 'failed')::int AS failed_count,
       ROUND(AVG(EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at)) * 1000)
         FILTER (WHERE ar.status = 'completed'), 0) AS avg_ms
     FROM "${schema}".ai_agent_runs ar
     LEFT JOIN "${schema}".ai_agents aa ON aa.agent_id = ar.agent_id
     WHERE ar.created_at > NOW() - INTERVAL '24 hours' AND ar.deleted_at IS NULL
     GROUP BY ar.agent_id, aa.agent_code
     ORDER BY run_count DESC
     LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query89(schema, args) {
        const query = `SELECT COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
           ROUND(SUM(estimated_cost_usd)::numeric, 4) AS est_cost
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query90(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('failed', 'timeout', 'denied'))::int AS failures
         FROM "${schema}".ai_tool_executions
         WHERE executed_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query91(schema, args) {
        const query = `SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open
         FROM "${schema}".ai_recommendations WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query92(schema, args) {
        const query = `SELECT COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending
         FROM "${schema}".ai_proposals WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query93(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
             FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL), 0) AS avg_ms
         FROM "${schema}".ai_agent_runs
         WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query94(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled
         FROM "${schema}".ai_agents WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query95(schema, args) {
        const query = `SELECT COUNT(*) AS cnt FROM "${schema}".sod_rules WHERE is_active = TRUE`;
        return safeQuery(query, args);
    }
    static async query96(schema, args) {
        const query = `SELECT ura.user_id, COUNT(DISTINCT rp.permission_id) AS total_perms,
            COUNT(DISTINCT CASE WHEN adl.id IS NOT NULL THEN rp.permission_id END) AS used_perms
     FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = ura.functional_role_id
     LEFT JOIN "${schema}".authz_decision_log adl ON adl.user_id = ura.user_id
       AND adl.permission_code = (SELECT code FROM "${schema}".permissions WHERE id = rp.permission_id)
       AND adl.decision = 'allow' AND adl.created_at > NOW() - INTERVAL '90 days'
     WHERE ura.is_active = TRUE
     GROUP BY ura.user_id HAVING COUNT(DISTINCT rp.permission_id) > 0`;
        return safeQuery(query, args);
    }
    static async query97(schema, args) {
        const query = `SELECT fr.code, fr.is_active, COUNT(DISTINCT ura.user_id) AS user_count
     FROM "${schema}".functional_roles fr
     LEFT JOIN "${schema}".user_role_assignments ura ON ura.functional_role_id = fr.id AND ura.is_active = TRUE
     GROUP BY fr.id, fr.code, fr.is_active`;
        return safeQuery(query, args);
    }
    static async query98(schema, args) {
        const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".agent_delegations (
      delegation_id UUID PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      source_agent_id VARCHAR(10) NOT NULL,
      target_agent_id VARCHAR(10) NOT NULL,
      task_type VARCHAR(100) NOT NULL,
      task_description TEXT NOT NULL,
      context JSONB DEFAULT '{}',
      priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
      expected_outcome TEXT,
      deadline TIMESTAMPTZ,
      requires_approval BOOLEAN DEFAULT FALSE,
      confidence DECIMAL(3,2),
      governance_check JSONB,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'failed')),
      acceptance_reason TEXT,
      rejection_reason TEXT,
      execution_result JSONB,
      error_message TEXT,
      accepted_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_target_status
      ON "${schema}".agent_delegations (target_agent_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_source
      ON "${schema}".agent_delegations (source_agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_agent_delegations_tenant_status
      ON "${schema}".agent_delegations (tenant_id, status, created_at DESC);
  `;
        return safeQuery(query, args);
    }
    static async query99(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_delegations
     WHERE tenant_id = $1 AND target_agent_id = $2 AND status = 'pending'
     ORDER BY 
       CASE priority
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END,
       created_at ASC`;
        return safeQuery(query, args);
    }
    static async query100(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_delegations
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query101(schema, args) {
        const query = `UPDATE "${schema}".agent_delegations
     SET status = $1, execution_result = $2, error_message = $3, completed_at = $4
     WHERE delegation_id = $5 AND target_agent_id = $6 AND status IN ('accepted', 'in_progress')
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query102(schema, args) {
        const query = `UPDATE "${schema}".agent_delegations
     SET status = 'rejected', rejection_reason = $1
     WHERE delegation_id = $2 AND target_agent_id = $3 AND status = 'pending'
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query103(schema, args) {
        const query = `UPDATE "${schema}".agent_delegations
     SET status = 'accepted', acceptance_reason = $1, accepted_at = $2
     WHERE delegation_id = $3`;
        return safeQuery(query, args);
    }
    static async query104(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_delegations
     WHERE delegation_id = $1 AND target_agent_id = $2 AND status = 'pending'`;
        return safeQuery(query, args);
    }
    static async query105(schema, args) {
        const query = `INSERT INTO "${schema}".agent_delegations
       (delegation_id, tenant_id, source_agent_id, target_agent_id, task_type,
        task_description, context, priority, expected_outcome, deadline,
        requires_approval, confidence, governance_check, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14)`;
        return safeQuery(query, args);
    }
    static async query106(schema, args) {
        const query = `SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM "${schema}".agent_runs
       WHERE created_at > NOW() - INTERVAL '${windowHours} hours'`;
        return safeQuery(query, args);
    }
    static async query107(schema, args) {
        const query = `SELECT
        tool_name, agent_id, block_reason, created_at, dauth_decision
       FROM "${schema}".agent_step_logs
       WHERE status = 'blocked'
         AND step_type = 'tool_call'
         AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC
       LIMIT $1`;
        return safeQuery(query, args);
    }
    static async query108(schema, args) {
        const query = `SELECT
        run_id, agent_id, error_message, error_context, duration_ms, updated_at
       FROM "${schema}".agent_runs
       WHERE status = 'failed'
         AND created_at > NOW() - INTERVAL '72 hours'
       ORDER BY updated_at DESC
       LIMIT $1`;
        return safeQuery(query, args);
    }
    static async query109(schema, args) {
        const query = `
          SELECT
            COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
            1000000 AS budget
          FROM "${schema}".agent_runs
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `;
        return safeQuery(query, args);
    }
    static async query110(schema, args) {
        const query = `SELECT COUNT(*)::int AS circuit_open FROM "${schema}".agent_circuit_breaker WHERE state = 'open'`;
        return safeQuery(query, args);
    }
    static async query111(schema, args) {
        const query = `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE accessed_at < NOW() - INTERVAL '30 days' OR accessed_at IS NULL)::int AS stale,
            COALESCE(SUM(token_count), 0)::int AS tokens
          FROM "${schema}".agent_memories
          WHERE deleted_at IS NULL
        `;
        return safeQuery(query, args);
    }
    static async query112(schema, args) {
        const query = `SELECT COUNT(*)::int AS pending FROM "${schema}".agent_handoffs WHERE status = 'pending'`;
        return safeQuery(query, args);
    }
    static async query113(schema, args) {
        const query = `SELECT COUNT(*)::int AS pending FROM "${schema}".agent_approvals WHERE status = 'pending'`;
        return safeQuery(query, args);
    }
    static async query114(schema, args) {
        const query = `
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked,
            COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
          FROM "${schema}".agent_step_logs
          WHERE created_at > NOW() - INTERVAL '24 hours'
            AND step_type = 'tool_call'
        `;
        return safeQuery(query, args);
    }
    static async query115(schema, args) {
        const query = `
          SELECT COUNT(*)::int AS stuck
          FROM "${schema}".agent_runs
          WHERE status = 'running' AND created_at < NOW() - INTERVAL '2 hours'
        `;
        return safeQuery(query, args);
    }
    static async query116(schema, args) {
        const query = `
          SELECT
            COUNT(*) FILTER (WHERE status = 'running')::int AS active,
            COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::int AS failed24h,
            COALESCE(AVG(duration_ms), 0)::int AS avg_latency,
            COALESCE(
              COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours')::float /
              NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'), 0), 0
            ) AS error_rate
          FROM "${schema}".agent_runs
        `;
        return safeQuery(query, args);
    }
    static async query117(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_model_config ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query118(schema, args) {
        const query = `SELECT provider, model, avg_latency_ms, success_rate, sample_count
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND complexity_tier = $3
         AND (task_type = $4 OR task_type IS NULL)
         AND (provider, model) IN (VALUES ${modelList})
         AND sample_count >= 5
         AND success_rate >= 0.85
       ORDER BY 
         success_rate DESC,
         avg_latency_ms ASC
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query119(schema, args) {
        const query = `INSERT INTO "${schema}".agent_model_performance_cache
         (tenant_id, agent_id, provider, model, complexity_tier, task_type,
          avg_latency_ms, success_rate, avg_tokens_per_request, cost_per_1k_tokens,
          sample_count, window_start, window_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12)`;
        return safeQuery(query, args);
    }
    static async query120(schema, args) {
        const query = `UPDATE "${schema}".agent_model_performance_cache
         SET avg_latency_ms = $7, success_rate = $8, sample_count = $9,
             avg_tokens_per_request = $10,
             cost_per_1k_tokens = COALESCE($11, cost_per_1k_tokens),
             last_updated_at = NOW(), window_end = $12
         WHERE cache_id = $6`;
        return safeQuery(query, args);
    }
    static async query121(schema, args) {
        const query = `SELECT cache_id, avg_latency_ms, success_rate, sample_count,
              avg_tokens_per_request, cost_per_1k_tokens
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND provider = $3 AND model = $4 AND complexity_tier = $5
         AND (task_type = $6 OR (task_type IS NULL AND $6 IS NULL))
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query122(schema, args) {
        const query = `SELECT provider, model, avg_latency_ms, success_rate, 
              avg_tokens_per_request, cost_per_1k_tokens, sample_count
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND provider = $3 AND model = $4 AND complexity_tier = $5
         AND (task_type = $6 OR task_type IS NULL)
       ORDER BY task_type NULLS LAST, last_updated_at DESC
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query123(schema, args) {
        const query = `INSERT INTO "${schema}".agent_model_config (agent_id, preferred_model, preferred_provider, max_tokens, temperature, complexity_tier, fallback_model, fallback_provider, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         preferred_model = COALESCE($2, agent_model_config.preferred_model),
         preferred_provider = COALESCE($3, agent_model_config.preferred_provider),
         max_tokens = COALESCE($4, agent_model_config.max_tokens),
         temperature = COALESCE($5, agent_model_config.temperature),
         complexity_tier = COALESCE($6, agent_model_config.complexity_tier),
         fallback_model = COALESCE($7, agent_model_config.fallback_model),
         fallback_provider = COALESCE($8, agent_model_config.fallback_provider),
         enabled = COALESCE($9, agent_model_config.enabled),
         updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query124(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_model_config WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query125(schema, args) {
        const query = `UPDATE "${row.schema_name}".tenant_llm_budgets
           SET tokens_used_month = 0, cost_used_month = 0,
               notified_soft = FALSE, notified_hard = FALSE,
               budget_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month',
               updated_at = NOW()
           WHERE budget_reset_at <= NOW()`;
        return safeQuery(query, args);
    }
    static async query126(schema, args) {
        const query = `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`;
        return safeQuery(query, args);
    }
    static async query127(schema, args) {
        const query = `UPDATE "${schema}".tenant_llm_budgets
       SET monthly_token_limit = $1, monthly_cost_limit = $2,
           soft_limit_pct = $3, hard_limit_action = $4, updated_at = NOW()
       WHERE tenant_id = $5`;
        return safeQuery(query, args);
    }
    static async query128(schema, args) {
        const query = `INSERT INTO "${schema}".tenant_llm_budgets (tenant_id) VALUES ($1) ON CONFLICT DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query129(schema, args) {
        const query = `SELECT * FROM "${schema}".tenant_llm_budgets WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query130(schema, args) {
        const query = `SELECT provider, agent_id,
              COUNT(*)::int AS calls,
              SUM(total_tokens)::int AS tokens,
              SUM(cost_usd)::real AS cost,
              AVG(latency_ms)::int AS avg_latency
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY provider, agent_id`;
        return safeQuery(query, args);
    }
    static async query131(schema, args) {
        const query = `UPDATE "${schema}".tenant_llm_budgets
       SET tokens_used_month = tokens_used_month + $1,
           cost_used_month = cost_used_month + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`;
        return safeQuery(query, args);
    }
    static async query132(schema, args) {
        const query = `INSERT INTO "${schema}".llm_usage_log
         (tenant_id, user_id, agent_id, run_id, provider, model,
          input_tokens, output_tokens, total_tokens, cost_usd,
          latency_ms, cache_hit, endpoint_type, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`;
        return safeQuery(query, args);
    }
    static async query133(schema, args) {
        const query = `SELECT ${tbl.fields}, ${tbl.idField} AS id FROM "${schema}".${tbl.table}
         WHERE to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(description,''))
               @@ plainto_tsquery('english', $1)
         LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query134(schema, args) {
        const query = `UPDATE "${schema}".tool_versions
     SET is_deprecated = TRUE, is_default = FALSE
     WHERE tool_id = $1 AND version = $2`;
        return safeQuery(query, args);
    }
    static async query135(schema, args) {
        const query = `UPDATE "${schema}".tool_registry
     SET deprecated_at = NOW(), replaced_by = $1, updated_at = NOW()
     WHERE id = $2 AND version = $3`;
        return safeQuery(query, args);
    }
    static async query136(schema, args) {
        const query = `SELECT * FROM "${schema}".tool_versions
       WHERE tool_id = $1
       ORDER BY released_at DESC`;
        return safeQuery(query, args);
    }
    static async query137(schema, args) {
        const query = `SELECT DISTINCT ON (id) *
       FROM "${schema}".tool_registry
       WHERE ${conditions.join(' AND ')}
       ORDER BY id, version DESC`;
        return safeQuery(query, args);
    }
    static async query138(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query139(schema, args) {
        const query = `INSERT INTO "${schema}".tool_versions
     (tool_id, version, released_at, changelog, is_default, is_deprecated)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tool_id, version) DO UPDATE SET
       changelog = EXCLUDED.changelog,
       is_default = EXCLUDED.is_default,
       is_deprecated = EXCLUDED.is_deprecated`;
        return safeQuery(query, args);
    }
    static async query140(schema, args) {
        const query = `INSERT INTO "${schema}".tool_registry
     (id, name, version, description, category, input_schema, output_schema,
      handler_path, is_active, metadata, deprecated_at, replaced_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     ON CONFLICT (id, version) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       input_schema = EXCLUDED.input_schema,
       output_schema = EXCLUDED.output_schema,
       handler_path = EXCLUDED.handler_path,
       is_active = EXCLUDED.is_active,
       metadata = EXCLUDED.metadata,
       deprecated_at = EXCLUDED.deprecated_at,
       replaced_by = EXCLUDED.replaced_by,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query141(schema, args) {
        const query = `SELECT chain_id AS entry_id, agent_id, 'reasoning' AS entry_type,
              step_name AS action, outcome AS result, context AS details, created_at
       FROM "${schema}".reasoning_chains
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query142(schema, args) {
        const query = `SELECT gate_id, agent_id, tool_name, action, status, decision,
              decided_by, reason, requested_at AS created_at, context AS details
       FROM "${schema}".hitl_gates
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query143(schema, args) {
        const query = `SELECT entry_id, agent_id, entry_type, action, result, details, created_at
       FROM "${schema}".agent_governance_audit
       WHERE agent_id = $1
       ORDER BY created_at DESC
       LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query144(schema, args) {
        const query = `UPDATE "${schema}".hitl_gates
     SET status = 'expired', updated_at = NOW()
     WHERE status = 'pending' AND expires_at < NOW()
     RETURNING gate_id, agent_id, tool_name, action`;
        return safeQuery(query, args);
    }
    static async query145(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query146(schema, args) {
        const query = `SELECT * FROM "${schema}".hitl_gates WHERE gate_id = $1`;
        return safeQuery(query, args);
    }
    static async query147(schema, args) {
        const query = `UPDATE "${schema}".hitl_gates
     SET status = $1, decision = $1, decided_by = $2, decided_at = NOW(), reason = $3, updated_at = NOW()
     WHERE gate_id = $4`;
        return safeQuery(query, args);
    }
    static async query148(schema, args) {
        const query = `UPDATE "${schema}".hitl_gates SET status = 'expired', updated_at = NOW() WHERE gate_id = $1`;
        return safeQuery(query, args);
    }
    static async query149(schema, args) {
        const query = `SELECT * FROM "${schema}".hitl_gates WHERE gate_id = $1`;
        return safeQuery(query, args);
    }
    static async query150(schema, args) {
        const query = `INSERT INTO "${schema}".hitl_gates
     (gate_id, agent_id, tool_name, action, context, status, requested_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), $6)`;
        return safeQuery(query, args);
    }
    static async query151(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_tool_permissions WHERE permission_id = $1`;
        return safeQuery(query, args);
    }
    static async query152(schema, args) {
        const query = `UPDATE "${schema}".agent_tool_permissions
     SET ${fields.join(', ')}
     WHERE permission_id = $${idx}`;
        return safeQuery(query, args);
    }
    static async query153(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_tool_permissions WHERE permission_id = $1`;
        return safeQuery(query, args);
    }
    static async query154(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1
     ORDER BY tool_name, action`;
        return safeQuery(query, args);
    }
    static async query155(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1 AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (tool_name = '*' OR (tool_name = $2 AND action = '*'))
     ORDER BY
       CASE WHEN tool_name = $2 THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query156(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_tool_permissions
     WHERE agent_id = $1 AND tool_name = $2 AND action = $3
       AND active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query157(schema, args) {
        const query = `INSERT INTO "${schema}".agent_governance_audit
       (entry_id, agent_id, entry_type, action, result, details)
       VALUES ($1, $2, $3, $4, $5, $6)`;
        return safeQuery(query, args);
    }
    static async query158(schema, args) {
        const query = `SELECT DISTINCT m.model_version_id, m.asset_id, m.system_id, s.system_name,
            COALESCE(MAX(a.next_assessment_due), m.created_at::date + INTERVAL '1 year') as next_due
     FROM "${schema}".ai_model_registry m
     LEFT JOIN "${schema}".ai_system_registry s ON m.system_id = s.id
     LEFT JOIN "${schema}".ai_model_risk_assessments a ON m.model_version_id = a.model_version_id
     WHERE m.is_active = TRUE AND m.approval_status = 'approved'
     GROUP BY m.model_version_id, m.asset_id, m.system_id, s.system_name, m.created_at
     HAVING COALESCE(MAX(a.next_assessment_due), m.created_at::date + INTERVAL '1 year') <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY next_due ASC`;
        return safeQuery(query, args);
    }
    static async query159(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query160(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_risk_assessments 
     (model_version_id, system_id, assessment_type, risk_level, risk_findings, 
      recommendations, remediation_required, assessed_by, assessment_notes, assessment_date, next_assessment_due)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year')
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query161(schema, args) {
        const query = `UPDATE "${schema}".ai_model_lifecycle 
     SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), approval_notes = $2
     WHERE lifecycle_id = $3 AND approval_status = 'pending'
     RETURNING lifecycle_id`;
        return safeQuery(query, args);
    }
    static async query162(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_lifecycle 
     (model_version_id, system_id, current_state, previous_state, transition_reason, 
      transitioned_by, transitioned_at, requires_approval, approval_status)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query163(schema, args) {
        const query = `SELECT current_state FROM "${schema}".ai_model_lifecycle 
     WHERE model_version_id = $1 ORDER BY transitioned_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query164(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query165(schema, args) {
        const query = `SELECT risk_id, likelihood, impact, title FROM "${schema}".risks
     WHERE risk_category = 'ai_model' AND (entity_links->>'modelId') = $1 AND deleted_at IS NULL
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query166(schema, args) {
        const query = `INSERT INTO "${schema}".ai_model_risk_scores 
     (model_version_id, system_id, data_risk_score, model_risk_score, operational_risk_score, 
      compliance_risk_score, composite_risk_score, risk_factors, scoring_method, scored_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'automated', NOW())
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query167(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_permission_recommendations'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query168(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_permission_recommendations', $1, 'info', 'platform')`;
        return safeQuery(query, args);
    }
    static async query169(schema, args) {
        const query = `SELECT user_id, permission_code, COUNT(*) AS denied_count
       FROM "${schema}".role_usage_audit
       WHERE result = 'denied'
         AND created_at > NOW() - make_interval(days => $1)
       GROUP BY user_id, permission_code
       HAVING COUNT(*) >= $2
       ORDER BY COUNT(*) DESC
       LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query170(schema, args) {
        const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled_count,
         COUNT(*) FILTER (WHERE action_on_match = 'block')::int AS block_count,
         COUNT(*) FILTER (WHERE action_on_match = 'warn')::int AS warn_count
       FROM "${schema}".ai_policy_rule WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query171(schema, args) {
        const query = `SELECT signal_code, signal_value, context_json, recorded_at
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND signal_code LIKE 'guard.blocked%' AND recorded_at > NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at DESC LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query172(schema, args) {
        const query = `UPDATE "${schema}".ai_policy_rule SET ${setClauses.join(', ')} WHERE rule_id = $${idx++} AND tenant_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query173(schema, args) {
        const query = `UPDATE "${schema}".ai_policy_rule SET enabled = $3, updated_at = NOW() WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`;
        return safeQuery(query, args);
    }
    static async query174(schema, args) {
        const query = `DELETE FROM "${schema}".ai_policy_rule WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`;
        return safeQuery(query, args);
    }
    static async query175(schema, args) {
        const query = `INSERT INTO "${schema}".ai_policy_rule
       (tenant_id, rule_name, rule_type, target_scope, target_id, condition_json, action_on_match, severity, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query176(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_policy_rule WHERE ${conditions.join(' AND ')} ORDER BY severity DESC, rule_name`;
        return safeQuery(query, args);
    }
    static async query177(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_policy_rule
       WHERE tenant_id = $1 AND enabled = TRUE
         AND (target_scope = 'all' OR target_scope = $2)
         AND (target_id IS NULL OR target_id = $3)
       ORDER BY severity DESC`;
        return safeQuery(query, args);
    }
    static async query178(schema, args) {
        const query = `SELECT status, agent_id, COUNT(*)::int AS cnt, AVG(latency_ms)::int AS avg_lat
       FROM "${schema}".llm_traces
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY status, agent_id`;
        return safeQuery(query, args);
    }
    static async query179(schema, args) {
        const query = `SELECT * FROM "${schema}".llm_traces WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query180(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".llm_traces WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query181(schema, args) {
        const query = `INSERT INTO "${schema}".llm_traces
         (trace_id, span_id, parent_span_id, run_id, agent_id, tenant_id, user_id,
          operation, provider, model, input_preview, output_preview,
          input_tokens, output_tokens, latency_ms, status, error_message,
          metadata, prompt_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`;
        return safeQuery(query, args);
    }
    static async query182(schema, args) {
        const query = `SELECT DISTINCT prompt_version_id FROM "${schema}".prompt_drift_baselines`;
        return safeQuery(query, args);
    }
    static async query183(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET flagged_for_review = FALSE, flagged_at = NULL, flag_reason = NULL, updated_at = NOW()
     WHERE prompt_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query184(schema, args) {
        const query = `UPDATE "${schema}".ai_prompt_registry
     SET flagged_for_review = TRUE, flagged_at = NOW(), flag_reason = $1, updated_at = NOW()
     WHERE prompt_version_id = $2`;
        return safeQuery(query, args);
    }
    static async query185(schema, args) {
        const query = `SELECT baseline_id, prompt_version_id, avg_confidence, rejection_rate,
            action_distribution, sample_size, computed_at
     FROM "${schema}".prompt_drift_baselines
     WHERE prompt_version_id = $1
     ORDER BY computed_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query186(schema, args) {
        const query = `SELECT confidence, outcome, decision_type, created_at
     FROM "${schema}".decision_record
     WHERE tenant_id = $1 AND agent_id IN (${placeholders})
       AND created_at > NOW() - make_interval(days => $${daysParamIndex})
     ORDER BY created_at DESC`;
        return safeQuery(query, args);
    }
    static async query187(schema, args) {
        const query = `SELECT inv.asset_key
     FROM "${schema}".ai_prompt_registry apr
     JOIN "${schema}".ai_agent_registry ar ON ar.linked_prompt_asset_id = apr.asset_id
     JOIN "${schema}".ai_asset_inventory inv ON inv.asset_id = ar.asset_id AND inv.deleted_at IS NULL
     WHERE apr.prompt_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query188(schema, args) {
        const query = `SELECT detection_type, blocked, COUNT(*)::int AS cnt
       FROM "${schema}".prompt_injection_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY detection_type, blocked`;
        return safeQuery(query, args);
    }
    static async query189(schema, args) {
        const query = `INSERT INTO "${schema}".prompt_injection_log
         (tenant_id, user_id, agent_id, input_preview, detection_type, severity, blocked)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`;
        return safeQuery(query, args);
    }
    static async query190(schema, args) {
        const query = `SELECT COUNT(*)::int AS dupes FROM (
         SELECT namespace, content FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND is_deleted = FALSE
         GROUP BY namespace, content HAVING COUNT(*) > 1
       ) sub`;
        return safeQuery(query, args);
    }
    static async query191(schema, args) {
        const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE is_deleted = FALSE)::int AS active,
         COUNT(*) FILTER (WHERE expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND is_deleted = FALSE)::int AS expiring_soon,
         COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days' AND summary IS NULL AND is_deleted = FALSE)::int AS old_uncompacted
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query192(schema, args) {
        const query = `UPDATE "${schema}".agent_memories SET is_deleted = TRUE WHERE memory_id = ANY($1)`;
        return safeQuery(query, args);
    }
    static async query193(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
           SET content = $1, summary = $2, importance_score = 0.7
           WHERE memory_id = $3`;
        return safeQuery(query, args);
    }
    static async query194(schema, args) {
        const query = `SELECT memory_id, content, importance_score FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND namespace = $2 AND is_deleted = FALSE AND summary IS NULL
         ORDER BY created_at ASC LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query195(schema, args) {
        const query = `SELECT DISTINCT namespace FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE
         AND created_at < NOW() - make_interval(days => $2)
         AND summary IS NULL
       LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query196(schema, args) {
        const query = `UPDATE "${schema}".agent_memories SET is_deleted = TRUE WHERE memory_id = ANY($1)`;
        return safeQuery(query, args);
    }
    static async query197(schema, args) {
        const query = `SELECT namespace, content, COUNT(*)::int AS cnt, ARRAY_AGG(memory_id) AS ids
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND is_deleted = FALSE
       GROUP BY namespace, content
       HAVING COUNT(*) > 1
       LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query198(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
       SET is_deleted = TRUE
       WHERE tenant_id = $1 AND expires_at IS NOT NULL AND expires_at < NOW() AND is_deleted = FALSE
       RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query199(schema, args) {
        const query = `SELECT content FROM "${schema}".agent_memories
       WHERE memory_id = $1 AND is_deleted = FALSE`;
        return safeQuery(query, args);
    }
    static async query200(schema, args) {
        const query = `SELECT COUNT(*) as n FROM "${schema}".memory_access_log WHERE tenant_id = $1 AND action = 'commit' AND created_at > NOW() - INTERVAL '24 hours'`;
        return safeQuery(query, args);
    }
    static async query201(schema, args) {
        const query = `SELECT agent_id, COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE AND agent_id IS NOT NULL GROUP BY agent_id`;
        return safeQuery(query, args);
    }
    static async query202(schema, args) {
        const query = `SELECT memory_type, COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE GROUP BY memory_type`;
        return safeQuery(query, args);
    }
    static async query203(schema, args) {
        const query = `SELECT COUNT(*) as n FROM "${schema}".agent_memories WHERE tenant_id = $1 AND is_deleted = FALSE`;
        return safeQuery(query, args);
    }
    static async query204(schema, args) {
        const query = `SELECT memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
              content, summary, metadata, importance_score, created_at
       FROM "${schema}".agent_memories
       WHERE ${conditions.join(' AND ')}
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY importance_score DESC, created_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(opts.limit || 20)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query205(schema, args) {
        const query = `INSERT INTO "${schema}".memory_access_log
         (tenant_id, user_id, agent_id, namespace, action, memory_ids, result_count)
       VALUES ($1, $2, $3, $4, 'delete', $5, $6)`;
        return safeQuery(query, args);
    }
    static async query206(schema, args) {
        const query = `UPDATE "${schema}".agent_memories SET is_deleted = TRUE, updated_at = NOW()
       WHERE ${where} RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query207(schema, args) {
        const query = `INSERT INTO "${schema}".memory_access_log
       (tenant_id, user_id, agent_id, namespace, action, result_count)
     VALUES ($1, $2, $3, $4, 'commit', $5)`;
        return safeQuery(query, args);
    }
    static async query208(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
         SET access_count = access_count + 1, last_accessed_at = NOW()
         WHERE memory_id = ANY($1)`;
        return safeQuery(query, args);
    }
    static async query209(schema, args) {
        const query = `INSERT INTO "${schema}".memory_access_log
         (tenant_id, user_id, agent_id, namespace, action, query_text, result_count)
       VALUES ($1, $2, $3, $4, 'retrieve', $5, $6)`;
        return safeQuery(query, args);
    }
    static async query210(schema, args) {
        const query = `SELECT memory_id, tenant_id, user_id, agent_id, memory_type, namespace,
              content, summary, metadata, importance_score, created_at,
              1 - (embedding <=> $1::vector) AS similarity
       FROM "${schema}".agent_memories
       WHERE ${where}
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY embedding <=> $1::vector
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(topK)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query211(schema, args) {
        const query = `INSERT INTO "${schema}".agent_memories
         (tenant_id, user_id, agent_id, memory_type, namespace, content, summary,
          metadata, source_run_id, source_proposal_id, embedding,
          importance_score, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector, $12, $13)
       RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query212(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
         SET importance_score = GREATEST(importance_score, $1), updated_at = NOW()
         WHERE memory_id = $2`;
        return safeQuery(query, args);
    }
    static async query213(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
             SET is_deleted = TRUE, updated_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{consolidated_into}', $2::jsonb)
             WHERE memory_id = ANY($1)`;
        return safeQuery(query, args);
    }
    static async query214(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
             SET is_deleted = TRUE, updated_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{consolidated_into}', $2::jsonb)
             WHERE memory_id = ANY($1)`;
        return safeQuery(query, args);
    }
    static async query215(schema, args) {
        const query = `SELECT memory_id, content, importance_score, created_at
         FROM "${schema}".agent_memories
         WHERE tenant_id = $1 AND agent_id = $2 AND memory_type = $3
           AND is_deleted = FALSE AND importance_score < 0.7
         ORDER BY created_at ASC
         LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query216(schema, args) {
        const query = groupQuery;
        return safeQuery(query, args);
    }
    static async query217(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
         SET is_deleted = TRUE, updated_at = NOW()
         WHERE tenant_id = $1 AND is_deleted = FALSE AND memory_type = $2
           AND expires_at IS NULL AND created_at < NOW() - make_interval(days => $3)
         RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query218(schema, args) {
        const query = `UPDATE "${schema}".agent_memories
       SET is_deleted = TRUE, updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query219(schema, args) {
        const query = `SELECT memory_id, 1 - (embedding <=> $1::vector) AS similarity
       FROM "${schema}".agent_memories
       WHERE ${conditions.join(' AND ')}
       ORDER BY embedding <=> $1::vector
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query220(schema, args) {
        const query = `SELECT effective_permissions FROM "${schema}".users WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query221(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace LIKE $2 AND is_deleted = FALSE
       ORDER BY created_at DESC LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query222(schema, args) {
        const query = q;
        return safeQuery(query, args);
    }
    static async query223(schema, args) {
        const query = `SELECT memory_id, tenant_id, memory_type, namespace, content, metadata,
              importance_score, created_at
       FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND namespace = $2 AND is_deleted = FALSE
       ORDER BY importance_score DESC, created_at DESC
       LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query224(schema, args) {
        const query = `INSERT INTO "${schema}".agent_memories
         (tenant_id, user_id, agent_id, memory_type, namespace, content,
          metadata, importance_score, is_deleted)
       VALUES ($1, NULL, $2, 'task', $3, $4, $5, $6, FALSE)
       RETURNING memory_id`;
        return safeQuery(query, args);
    }
    static async query225(schema, args) {
        const query = `SELECT agent_id,
              DATE(executed_at) AS day,
              COUNT(*)::int AS runs,
              SUM(CASE WHEN success THEN 1 ELSE 0 END)::int AS successes,
              COALESCE(AVG(duration_ms), 0)::int AS avg_ms
       FROM agent_performance
       WHERE tenant_id = $1 AND executed_at >= $2
       GROUP BY agent_id, DATE(executed_at)
       ORDER BY agent_id, day`;
        return safeQuery(query, args);
    }
    static async query226(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_fleet_snapshots ORDER BY created_at DESC LIMIT $1`;
        return safeQuery(query, args);
    }
    static async query227(schema, args) {
        const query = `INSERT INTO "${schema}".agent_fleet_snapshots
         (fleet_score, fleet_status, active_agents, stale_agents,
          circuit_breaker_state, total_handoffs, correlations_found,
          backpressure_dropped, snapshot_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`;
        return safeQuery(query, args);
    }
    static async query228(schema, args) {
        const query = `
      CREATE TABLE IF NOT EXISTS "${schema}".agent_fleet_snapshots (
        snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fleet_score INT DEFAULT 0,
        fleet_status TEXT DEFAULT 'idle',
        active_agents INT DEFAULT 0,
        stale_agents INT DEFAULT 0,
        circuit_breaker_state TEXT DEFAULT 'CLOSED',
        total_handoffs INT DEFAULT 0,
        correlations_found INT DEFAULT 0,
        backpressure_dropped INT DEFAULT 0,
        snapshot_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
        return safeQuery(query, args);
    }
    static async query229(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".agent_correlations WHERE created_at >= $1`;
        return safeQuery(query, args);
    }
    static async query230(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".agent_discoveries WHERE created_at >= $1`;
        return safeQuery(query, args);
    }
    static async query231(schema, args) {
        const query = `SELECT from_agent, to_agent, COUNT(*)::int AS cnt
       FROM "${schema}".agent_handoffs
       WHERE created_at >= $1
       GROUP BY from_agent, to_agent
       ORDER BY cnt DESC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query232(schema, args) {
        const query = `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) FILTER (WHERE status = 'completed'), 0)::int AS avg_latency_ms
       FROM "${schema}".agent_handoffs
       WHERE created_at >= $1`;
        return safeQuery(query, args);
    }
    static async query233(schema, args) {
        const query = `SELECT tool_name AS type, COUNT(*)::int AS cnt
           FROM agent_performance
           WHERE tenant_id = $1 AND agent_id = $2 AND executed_at >= $3
           GROUP BY tool_name ORDER BY cnt DESC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query234(schema, args) {
        const query = `SELECT agent_id,
              COUNT(*)::int AS runs_total,
              COUNT(*) FILTER (WHERE executed_at >= $2)::int AS runs_24h,
              COUNT(*)::int AS actions_proposed,
              COALESCE(SUM(CASE WHEN success THEN 1 ELSE 0 END), 0)::int AS actions_executed,
              COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms,
              CASE WHEN COUNT(*) > 0
                THEN ROUND(SUM(CASE WHEN success THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric, 4)
                ELSE 0 END AS success_rate,
              MAX(executed_at) AS last_run_at
       FROM agent_performance
       WHERE tenant_id = $1
       GROUP BY agent_id
       ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query235(schema, args) {
        const query = `INSERT INTO "${schema}".ai_human_overrides 
     (agent_id, decision_id, workflow_execution_id, ai_decision, human_decision,
      override_reason, override_outcome, overridden_by, overridden_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query236(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query237(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_trust_scores 
     (agent_id, accuracy_score, fairness_score, explainability_score, human_override_rate,
      error_recovery_score, composite_trust_score, trust_level, context, scored_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query238(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_bias_detection 
     SET remediation_status = $1, remediated_by = $2, remediation_notes = $3,
         remediation_actions = $4, remediated_at = CASE WHEN $1 IN ('resolved', 'false_positive', 'accepted_risk') THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE detection_id = $5
     RETURNING detection_id`;
        return safeQuery(query, args);
    }
    static async query239(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query240(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_bias_detection 
     (agent_id, protected_attribute, attribute_value, bias_metric, metric_value, threshold,
      threshold_exceeded, violation_severity, sample_size, comparison_group, remediation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query241(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query242(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query243(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_performance_metrics 
     (agent_id, metric_type, metric_value, measurement_period_start, measurement_period_end,
      context, baseline_value, deviation_from_baseline, trend)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query244(schema, args) {
        const query = `SELECT compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     ORDER BY snapshot_date DESC
     LIMIT $1`;
        return safeQuery(query, args);
    }
    static async query245(schema, args) {
        const query = `SELECT snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date >= CURRENT_DATE - $1::int
     ORDER BY snapshot_date ASC`;
        return safeQuery(query, args);
    }
    static async query246(schema, args) {
        const query = `SELECT monthly_token_limit, monthly_cost_limit, tokens_used_month, cost_used_month
       FROM "${schema}".tenant_llm_budgets WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query247(schema, args) {
        const query = `SELECT COUNT(*)::int AS calls,
                  COALESCE(SUM(input_tokens),0)::int AS inp,
                  COALESCE(SUM(output_tokens),0)::int AS out,
                  COALESCE(SUM(cost_usd),0)::real AS cost
           FROM "${schema_name}".llm_usage_log
           WHERE agent_id = $1 AND created_at > NOW() - make_interval(days => $2)`;
        return safeQuery(query, args);
    }
    static async query248(schema, args) {
        const query = `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`;
        return safeQuery(query, args);
    }
    static async query249(schema, args) {
        const query = `SELECT COUNT(*)::int AS calls,
              COALESCE(SUM(input_tokens),0)::int AS inp,
              COALESCE(SUM(output_tokens),0)::int AS out,
              COALESCE(SUM(cost_usd),0)::real AS cost
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)`;
        return safeQuery(query, args);
    }
    static async query250(schema, args) {
        const query = `UPDATE "${schema}".tenant_llm_budgets
       SET tokens_used_month = tokens_used_month + $1,
           cost_used_month   = cost_used_month + $2,
           updated_at = NOW()
       WHERE tenant_id = $3`;
        return safeQuery(query, args);
    }
    static async query251(schema, args) {
        const query = `INSERT INTO "${schema}".llm_usage_log
         (tenant_id, agent_id, model, input_tokens, output_tokens, total_tokens,
          cost_usd, provider, latency_ms, cache_hit, endpoint_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'tracked',0,false,'cost-tracker')`;
        return safeQuery(query, args);
    }
    static async query252(schema, args) {
        const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
         COUNT(*) FILTER (WHERE severity = 'info')::int AS sev_info,
         COUNT(*) FILTER (WHERE severity = 'warning')::int AS sev_warning,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS sev_critical
       FROM "${schema}".ai_observations WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query253(schema, args) {
        const query = `UPDATE "${schema}".ai_observations
       SET status = 'dismissed', resolved_at = now(), resolved_by = $3
       WHERE observation_id = $1 AND tenant_id = $2 AND status IN ('active','acknowledged')
       RETURNING observation_id`;
        return safeQuery(query, args);
    }
    static async query254(schema, args) {
        const query = `UPDATE "${schema}".ai_observations
       SET status = 'resolved', resolved_at = now(), resolved_by = $3
       WHERE observation_id = $1 AND tenant_id = $2 AND status IN ('active','acknowledged')
       RETURNING observation_id`;
        return safeQuery(query, args);
    }
    static async query255(schema, args) {
        const query = `UPDATE "${schema}".ai_observations SET status = 'acknowledged'
       WHERE observation_id = $1 AND tenant_id = $2 AND status = 'active'
       RETURNING observation_id`;
        return safeQuery(query, args);
    }
    static async query256(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_observations
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query257(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_observations WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query258(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_observations WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query259(schema, args) {
        const query = `INSERT INTO "${schema}".ai_observations
         (tenant_id, agent_id, run_id, entity_type, entity_id,
          observation_type, title, description, severity, confidence, evidence_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query260(schema, args) {
        const query = `SELECT SUM(cost_usd)::real AS cost, SUM(tokens)::int AS tokens
       FROM "${schema}".llm_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".llm_cost_attribution
           WHERE llm_cost_attribution.run_id = llm_usage_log.run_id
         )`;
        return safeQuery(query, args);
    }
    static async query261(schema, args) {
        const query = `SELECT project_id, project_code,
              SUM(cost_usd)::real AS cost,
              SUM(tokens)::int AS tokens
       FROM "${schema}".llm_cost_attribution
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND project_id IS NOT NULL
       GROUP BY project_id, project_code`;
        return safeQuery(query, args);
    }
    static async query262(schema, args) {
        const query = `SELECT cost_center_id, cost_center_code,
              SUM(cost_usd)::real AS cost,
              SUM(tokens)::int AS tokens
       FROM "${schema}".llm_cost_attribution
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
         AND cost_center_id IS NOT NULL
       GROUP BY cost_center_id, cost_center_code`;
        return safeQuery(query, args);
    }
    static async query263(schema, args) {
        const query = `INSERT INTO "${schema}".projects
     (id, tenant_id, cost_center_id, name, code, description, budget_limit, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       cost_center_id = EXCLUDED.cost_center_id,
       name = EXCLUDED.name,
       code = EXCLUDED.code,
       description = EXCLUDED.description,
       budget_limit = EXCLUDED.budget_limit,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query264(schema, args) {
        const query = `INSERT INTO "${schema}".cost_centers
     (id, tenant_id, name, code, description, budget_limit, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       code = EXCLUDED.code,
       description = EXCLUDED.description,
       budget_limit = EXCLUDED.budget_limit,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query265(schema, args) {
        const query = `INSERT INTO "${schema}".llm_cost_attribution
       (tenant_id, user_id, agent_id, run_id, cost_center_id, project_id,
        cost_center_code, project_code, cost_usd, tokens, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`;
        return safeQuery(query, args);
    }
    static async query266(schema, args) {
        const query = `SELECT 
         operation_type,
         AVG(CASE WHEN operation_type = 'discovery' THEN total_tokens ELSE NULL END)::int AS avg_discovery_tokens,
         AVG(CASE WHEN operation_type = 'action' THEN total_tokens ELSE NULL END)::int AS avg_action_tokens,
         AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END)::real AS cache_hit_rate,
         COUNT(*)::int AS count,
         AVG(total_tokens)::int AS avg_tokens
       FROM "${schema}".token_efficiency_log
       WHERE ${conditions.join(' AND ')}
       GROUP BY operation_type`;
        return safeQuery(query, args);
    }
    static async query267(schema, args) {
        const query = `INSERT INTO "${schema}".token_efficiency_log
     (tenant_id, agent_id, run_id, discovery_id, action_id, operation_type,
      input_tokens, output_tokens, total_tokens, cache_hit, efficiency_score, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`;
        return safeQuery(query, args);
    }
    static async query268(schema, args) {
        const query = `SELECT tool_id,
              COUNT(*)::int AS calls,
              COUNT(CASE WHEN success THEN 1 END)::real / COUNT(*)::real AS success_rate
       FROM "${schema}".tool_usage_log
       WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
       GROUP BY tool_id
       ORDER BY calls DESC
       LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query269(schema, args) {
        const query = `SELECT error_message, COUNT(*)::int AS count
         FROM "${schema}".tool_usage_log
         WHERE tenant_id = $1 AND tool_id = $2 AND NOT success
           AND created_at > NOW() - make_interval(days => $3)
           AND error_message IS NOT NULL
         GROUP BY error_message`;
        return safeQuery(query, args);
    }
    static async query270(schema, args) {
        const query = `SELECT agent_id, tool_id, tool_version,
                COUNT(*)::int AS calls,
                COUNT(CASE WHEN success THEN 1 END)::int AS successes
         FROM "${schema}".tool_usage_log
         WHERE tenant_id = $1 AND tool_id = $2 AND created_at > NOW() - make_interval(days => $3)
         GROUP BY agent_id, tool_id, tool_version`;
        return safeQuery(query, args);
    }
    static async query271(schema, args) {
        const query = `SELECT 
         tool_id, tool_version,
         COUNT(*)::int AS total_calls,
         COUNT(CASE WHEN success THEN 1 END)::int AS success_count,
         COUNT(CASE WHEN NOT success THEN 1 END)::int AS failure_count,
         AVG(duration_ms)::int AS avg_duration,
         SUM(duration_ms)::int AS total_duration,
         MAX(created_at) AS last_used_at
       FROM "${schema}".tool_usage_log
       WHERE tenant_id = $${idx++} AND ${conditions.join(' AND ')}
       GROUP BY tool_id, tool_version
       ORDER BY total_calls DESC`;
        return safeQuery(query, args);
    }
    static async query272(schema, args) {
        const query = `INSERT INTO "${schema}".tool_usage_log
     (tenant_id, agent_id, tool_id, tool_version, run_id, success,
      duration_ms, error_message, input_size, output_size, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`;
        return safeQuery(query, args);
    }
    static async query273(schema, args) {
        const query = `SELECT
       COALESCE(SUM(cost_usd), 0)::real AS total_cost,
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())`;
        return safeQuery(query, args);
    }
    static async query274(schema, args) {
        const query = `SELECT
         DATE(created_at) AS day,
         COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
         COALESCE(SUM(cost_usd), 0)::real AS cost_usd,
         COUNT(*)::int AS calls
       FROM "${schema}".llm_usage_log
       WHERE created_at > NOW() - make_interval(days => $1)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`;
        return safeQuery(query, args);
    }
    static async query275(schema, args) {
        const query = `SELECT
       agent_id,
       COALESCE(SUM(total_tokens), 0)::bigint AS tokens_used,
       COALESCE(SUM(cost_usd), 0)::real AS cost_usd
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())
       AND agent_id IS NOT NULL
     GROUP BY agent_id
     ORDER BY tokens_used DESC`;
        return safeQuery(query, args);
    }
    static async query276(schema, args) {
        const query = `SELECT
       DATE(created_at) AS day,
       COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
       COALESCE(SUM(cost_usd), 0)::real AS cost
     FROM "${schema}".llm_usage_log
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY day ASC`;
        return safeQuery(query, args);
    }
    static async query277(schema, args) {
        const query = `SELECT
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
       COALESCE(SUM(cost_usd), 0)::real AS total_cost
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())`;
        return safeQuery(query, args);
    }
    static async query278(schema, args) {
        const query = `SELECT monthly_token_budget, monthly_cost_budget
       FROM "${schema}".tenant_ai_config LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query279(schema, args) {
        const query = `UPDATE "${schema}".controls SET status = $1, updated_at = NOW() WHERE control_id = $2`;
        return safeQuery(query, args);
    }
    static async query280(schema, args) {
        const query = `UPDATE "${schema}".incidents SET status = 'closed', resolution = $1, resolved_at = NOW(), updated_at = NOW()
           WHERE incident_id = $2`;
        return safeQuery(query, args);
    }
    static async query281(schema, args) {
        const query = `INSERT INTO "${schema}".findings (title, description, severity, status, source_type, source_id, created_at)
         VALUES ($1, $2, $3, 'open', $4, $5, NOW())`;
        return safeQuery(query, args);
    }
    static async query282(schema, args) {
        const query = `UPDATE "${schema}".risks SET risk_score = $1, ai_assessment = $2, updated_at = NOW()
           WHERE risk_id = $3`;
        return safeQuery(query, args);
    }
    static async query283(schema, args) {
        const query = `INSERT INTO "${schema}".controls (control_id, title, description, status, owner, created_at)
         VALUES ($1, $2, $3, 'draft', $4, NOW())`;
        return safeQuery(query, args);
    }
    static async query284(schema, args) {
        const query = `SELECT data_classification, title FROM "${schema}".ucf_controls WHERE control_id = $1`;
        return safeQuery(query, args);
    }
    static async query285(schema, args) {
        const query = `SELECT sensitivity_level, title FROM "${schema}".risks WHERE risk_id = $1`;
        return safeQuery(query, args);
    }
    static async query286(schema, args) {
        const query = `SELECT role FROM users WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query287(schema, args) {
        const query = `SELECT ura.user_id FROM "${schema}".user_role_assignments ura
     JOIN "${schema}".functional_roles fr ON fr.id = ura.functional_role_id
     WHERE fr.code = $1 AND ura.is_active = TRUE
     ORDER BY ura.created_at ASC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query288(schema, args) {
        const query = `UPDATE "${schema}".agent_context_assignments
       SET last_fired_at = NOW(), fire_count = fire_count + 1, updated_at = NOW()
       WHERE assignment_id = $1`;
        return safeQuery(query, args);
    }
    static async query289(schema, args) {
        const query = `INSERT INTO "${schema}".agent_context_assignments
         (tenant_id, agent_id, module_code, activation_condition, priority, playbook_config, trigger_events, schedule_cron)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, agent_id, module_code) DO UPDATE SET
         activation_condition = COALESCE($4, agent_context_assignments.activation_condition),
         priority = COALESCE($5, agent_context_assignments.priority),
         playbook_config = COALESCE($6, agent_context_assignments.playbook_config),
         trigger_events = COALESCE($7, agent_context_assignments.trigger_events),
         schedule_cron = $8,
         is_active = TRUE,
         updated_at = NOW()
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query290(schema, args) {
        const query = sql;
        return safeQuery(query, args);
    }
    static async query291(schema, args) {
        const query = `SELECT CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'accepted') / COUNT(*))
              END AS rate
       FROM "${schema}".attestation_records`;
        return safeQuery(query, args);
    }
    static async query292(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".attestation_campaigns ac WHERE ac.policy_id = p.id
         )`;
        return safeQuery(query, args);
    }
    static async query293(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".attestation_records
       WHERE status = 'pending' AND due_date < NOW()`;
        return safeQuery(query, args);
    }
    static async query294(schema, args) {
        const query = `SELECT campaign_id, title, status,
              COUNT(*) FILTER (WHERE ar.status = 'accepted') AS acked,
              COUNT(*) AS total
       FROM "${schema}".attestation_campaigns ac
       LEFT JOIN "${schema}".attestation_records ar ON ar.campaign_id = ac.campaign_id
       WHERE ac.status = 'active'
       GROUP BY ac.campaign_id, ac.title, ac.status`;
        return safeQuery(query, args);
    }
    static async query295(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policy_gaps
       WHERE resolved_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query296(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".policy_control_links pcl WHERE pcl.control_id = c.id
       )`;
        return safeQuery(query, args);
    }
    static async query297(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".policy_risk_links prl WHERE prl.policy_id = p.id
         )`;
        return safeQuery(query, args);
    }
    static async query298(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies p
       WHERE p.status = 'published'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".policy_control_links pcl WHERE pcl.policy_id = p.id
         )`;
        return safeQuery(query, args);
    }
    static async query299(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies WHERE status = 'published'`;
        return safeQuery(query, args);
    }
    static async query300(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND (owner IS NULL OR owner = '')`;
        return safeQuery(query, args);
    }
    static async query301(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND updated_at < NOW() - INTERVAL '12 months'`;
        return safeQuery(query, args);
    }
    static async query302(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND review_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'`;
        return safeQuery(query, args);
    }
    static async query303(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".policies
       WHERE status = 'published' AND review_date IS NOT NULL AND review_date < NOW()`;
        return safeQuery(query, args);
    }
    static async query304(schema, args) {
        const query = `SELECT COUNT(DISTINCT user_id) AS n FROM users WHERE tenant_id = $1 AND user_id NOT IN (SELECT DISTINCT user_id FROM "${schema}".training_assignments WHERE status = 'completed')`;
        return safeQuery(query, args);
    }
    static async query305(schema, args) {
        const query = `SELECT ROUND(AVG(CASE WHEN status = 'completed' THEN 100 ELSE 0 END))::int AS rate FROM "${schema}".training_assignments WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query306(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".training_assignments WHERE status = 'assigned' AND due_date < NOW() AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query307(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".training_programs WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query308(schema, args) {
        const query = `SELECT overall_score, assessment_date FROM "${schema}".bcm_maturity_assessments
      WHERE deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 2`;
        return safeQuery(query, args);
    }
    static async query309(schema, args) {
        const query = `SELECT ROUND(AVG(CASE WHEN er.passed = TRUE THEN 100 ELSE 0 END))::int AS rate,
                      COUNT(*)::int AS total
      FROM "${schema}".bcp_exercise_results er
      JOIN "${schema}".bcp_exercises ex ON ex.exercise_id = er.exercise_id
      WHERE ex.status = 'completed' AND ex.deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query310(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".bcm_recovery_strategies
      WHERE bia_id IS NULL AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query311(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".crisis_comm_plans
      WHERE status = 'active' AND deleted_at IS NULL
        AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '365 days')`;
        return safeQuery(query, args);
    }
    static async query312(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".bia_assessments
      WHERE status = 'approved' AND deleted_at IS NULL
        AND created_at < NOW() - INTERVAL '365 days'`;
        return safeQuery(query, args);
    }
    static async query313(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE last_exercise_at IS NULL AND status IN ('approved','active') AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query314(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE next_exercise_date IS NOT NULL AND next_exercise_date < NOW()
        AND status IN ('approved','active') AND deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query315(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".bcp_plans
      WHERE status IN ('approved','active') AND deleted_at IS NULL
        AND (next_review_date IS NOT NULL AND next_review_date < NOW()
             OR (next_review_date IS NULL AND created_at < NOW() - INTERVAL '180 days'))`;
        return safeQuery(query, args);
    }
    static async query316(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".vendor_findings vf
       WHERE vf.status = 'open'
         AND NOT EXISTS (SELECT 1 FROM "${schema}".findings f WHERE f.source_type = 'vendor_assessment' AND f.source_id = vf.vendor_id)`;
        return safeQuery(query, args);
    }
    static async query317(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".vendors v
       WHERE v.risk_rating IN ('high', 'critical') AND v.status = 'active'
         AND NOT EXISTS (SELECT 1 FROM "${schema}".risks r WHERE r.source_type = 'vendor' AND r.source_id = v.vendor_id AND r.status != 'closed')`;
        return safeQuery(query, args);
    }
    static async query318(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".vendor_findings WHERE status = 'open'`;
        return safeQuery(query, args);
    }
    static async query319(schema, args) {
        const query = `SELECT COUNT(*) AS n FROM "${schema}".vendor_sla_measurements WHERE is_breached = true AND period_end > NOW() - INTERVAL '30 days'`;
        return safeQuery(query, args);
    }
    static async query320(schema, args) {
        const query = `SELECT trigger_event, playbook_action, description_en, output_entity_type, priority
       FROM public.agent_playbook_assignments
       WHERE agent_code = $1 AND is_active = true ORDER BY priority`;
        return safeQuery(query, args);
    }
    static async query321(schema, args) {
        const query = `SELECT module_code, state, trial_expiry_at
       FROM public.module_operating_states
       WHERE tenant_id = $1 AND is_active = true AND module_code = ANY($2)`;
        return safeQuery(query, args);
    }
    static async query322(schema, args) {
        const query = `SELECT business_profile, regulatory_profile, framework_profile,
              module_profile, ownership_profile, persona_profile,
              pain_profile, automation_profile, agent_profile,
              complexity, context_version
       FROM public.tenant_governance_context
       WHERE tenant_id = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query323(schema, args) {
        const query = `SELECT org_type, legal_form, listing_status, org_size, employee_count,
              sector_ids, primary_sector_id, critical_infrastructure,
              data_classification_level, cloud_providers, uses_ai_ml,
              processes_payment_cards, has_ot_scada, has_ciso, has_dpo,
              grc_maturity_level, settings
       FROM tenants WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query324(schema, args) {
        const query = `SELECT COUNT(*)::int AS recent
       FROM "${schema}".agrc_event_log
       WHERE event_type = 'crosshub.cascade_triggered'
         AND created_at > NOW() - INTERVAL '24 hours'`;
        return safeQuery(query, args);
    }
    static async query325(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active) ::int AS active
       FROM "${schema}".agent_trigger_chains`;
        return safeQuery(query, args);
    }
    static async query326(schema, args) {
        const query = `SELECT id, source_agent_id, source_entity_type, source_task_type,
              target_agent_id, target_context, delay_seconds
       FROM "${schema}".agent_trigger_chains
       WHERE active = TRUE`;
        return safeQuery(query, args);
    }
    static async query327(schema, args) {
        const query = `DELETE FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1 AND created_at < NOW() - make_interval(days => $2)
       RETURNING cycle_memory_id`;
        return safeQuery(query, args);
    }
    static async query328(schema, args) {
        const query = `SELECT cycle_id,
              COUNT(DISTINCT agent_id)::int AS agent_count,
              COUNT(*)::int AS entry_count,
              MIN(created_at) AS started_at
       FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1
       GROUP BY cycle_id
       ORDER BY MIN(created_at) DESC
       LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query329(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_cycle_memory
       WHERE tenant_id = $1 AND agent_id = $2
       ORDER BY created_at DESC LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query330(schema, args) {
        const query = q;
        return safeQuery(query, args);
    }
    static async query331(schema, args) {
        const query = `INSERT INTO "${schema}".agent_cycle_memory
         (tenant_id, cycle_id, agent_id, memory_type, content, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING cycle_memory_id`;
        return safeQuery(query, args);
    }
    static async query332(schema, args) {
        const query = `SELECT agent_id,
                COUNT(*) as runs,
                SUM(actions_executed) as actions
         FROM "${schema}".agent_runs
         WHERE tenant_id = $1 AND agent_id IS NOT NULL
         GROUP BY agent_id ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query333(schema, args) {
        const query = `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'pending_approval') as pending
         FROM "${schema}".agent_proposals WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query334(schema, args) {
        const query = `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'running') as running,
           COUNT(*) FILTER (WHERE status = 'completed') as completed,
           COUNT(*) FILTER (WHERE status = 'failed') as failed,
           SUM(actions_executed) as total_actions
         FROM "${schema}".agent_runs WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query335(schema, args) {
        const query = `SELECT min_autonomy, requires_approval, max_auto_per_day
         FROM "${schema}".agent_autonomy_policies
         WHERE tenant_id = '_default' AND action_type = $1`;
        return safeQuery(query, args);
    }
    static async query336(schema, args) {
        const query = `SELECT min_autonomy, requires_approval, max_auto_per_day
       FROM "${schema}".agent_autonomy_policies
       WHERE tenant_id = $1 AND action_type = $2`;
        return safeQuery(query, args);
    }
    static async query337(schema, args) {
        const query = `SELECT sac.*, u.full_name, u.email, u.role
       FROM "${schema}".shadow_agent_config sac
       LEFT JOIN users u ON u.user_id = sac.user_id AND u.tenant_id = sac.tenant_id
       WHERE sac.tenant_id = $1 ${where}
       ORDER BY sac.updated_at DESC
       LIMIT ${Math.min(500, Math.max(1, parseInt(String(opts?.limit || 100)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query338(schema, args) {
        const query = `INSERT INTO "${schema}".shadow_agent_config
         (tenant_id, user_id, enabled, autonomy_level, allowed_agents,
          delegation_rules, preferences, max_actions_per_day, memory_namespace)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET
         enabled = COALESCE(EXCLUDED.enabled, shadow_agent_config.enabled),
         autonomy_level = COALESCE(EXCLUDED.autonomy_level, shadow_agent_config.autonomy_level),
         allowed_agents = COALESCE(EXCLUDED.allowed_agents, shadow_agent_config.allowed_agents),
         delegation_rules = COALESCE(EXCLUDED.delegation_rules, shadow_agent_config.delegation_rules),
         preferences = COALESCE(EXCLUDED.preferences, shadow_agent_config.preferences),
         max_actions_per_day = COALESCE(EXCLUDED.max_actions_per_day, shadow_agent_config.max_actions_per_day),
         updated_at = NOW()
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query339(schema, args) {
        const query = `SELECT * FROM "${schema}".shadow_agent_config WHERE tenant_id = $1 AND user_id = $2`;
        return safeQuery(query, args);
    }
    static async query340(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_events
       WHERE run_id = $1 ORDER BY created_at LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query341(schema, args) {
        const query = `INSERT INTO "${schema}".agent_events (run_id, tenant_id, agent_id, event_type, node_id, data_json)
     VALUES ($1, $2, $3, $4, $5, $6)`;
        return safeQuery(query, args);
    }
    static async query342(schema, args) {
        const query = `INSERT INTO "${schema}".agent_approvals (proposal_id, approver_user_id, decision, comment)
     VALUES ($1, $2, 'reject', $3)`;
        return safeQuery(query, args);
    }
    static async query343(schema, args) {
        const query = `UPDATE "${schema}".agent_proposals
     SET status = 'rejected', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'pending_approval'
     RETURNING proposal_id`;
        return safeQuery(query, args);
    }
    static async query344(schema, args) {
        const query = `INSERT INTO "${schema}".agent_approvals (proposal_id, approver_user_id, decision, comment)
     VALUES ($1, $2, 'approve', $3)`;
        return safeQuery(query, args);
    }
    static async query345(schema, args) {
        const query = `UPDATE "${schema}".agent_proposals
     SET status = 'approved', updated_at = NOW()
     WHERE proposal_id = $1 AND status = 'pending_approval'
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query346(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_proposals ${where} ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query347(schema, args) {
        const query = `INSERT INTO "${schema}".agent_proposals
         (run_id, node_id, agent_id, tenant_id, type, payload_json, reason,
          priority, required_approvers, auto_executable, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING proposal_id`;
        return safeQuery(query, args);
    }
    static async query348(schema, args) {
        const query = `SELECT node_id, step_type, lane, label, label_ar, status,
              owner_user_id, started_at, ended_at, sla_hours
       FROM "${schema}".agent_steps WHERE run_id = $1 ORDER BY created_at`;
        return safeQuery(query, args);
    }
    static async query349(schema, args) {
        const query = `INSERT INTO "${schema}".agent_steps
         (run_id, node_id, agent_id, step_type, lane, label, label_ar, status,
          owner_user_id, inputs_ref, outputs_ref, sla_hours,
          started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (run_id, node_id) DO UPDATE SET
         status = EXCLUDED.status, outputs_ref = EXCLUDED.outputs_ref,
         ended_at = CASE WHEN EXCLUDED.status IN ('done','failed','skipped') THEN NOW() ELSE agent_steps.ended_at END
       RETURNING step_id`;
        return safeQuery(query, args);
    }
    static async query350(schema, args) {
        const query = `SELECT run_id, status, platform_mode, autonomy_level, agent_id, summary,
              actions_proposed, actions_executed, actions_queued, duration_ms,
              created_at, updated_at
       FROM "${schema}".agent_runs ${where}
       ORDER BY created_at DESC LIMIT ${Math.min(500, Math.max(1, parseInt(String(limit)) || 50))}`;
        return safeQuery(query, args);
    }
    static async query351(schema, args) {
        const query = `SELECT run_id, status, platform_mode, autonomy_level, agent_id, summary,
              actions_proposed, actions_executed, actions_queued, duration_ms,
              created_at, updated_at
       FROM "${schema}".agent_runs WHERE run_id = $1`;
        return safeQuery(query, args);
    }
    static async query352(schema, args) {
        const query = `UPDATE "${schema}".agent_runs SET ${sets.join(', ')} WHERE run_id = $${idx}`;
        return safeQuery(query, args);
    }
    static async query353(schema, args) {
        const query = `INSERT INTO "${schema}".agent_runs
         (tenant_id, user_id, workflow_id, agent_id, autonomy_level, platform_mode, status, trace_id, inputs, parent_run_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'running', $7, $8, $9)
       RETURNING run_id`;
        return safeQuery(query, args);
    }
    static async query354(schema, args) {
        const query = `SELECT 1 FROM "${schema}".ai_agent_permissions
     WHERE agent_id = $1 AND action_code = $2 AND is_active = TRUE LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query355(schema, args) {
        const query = `SELECT agent_id FROM "${schema}".ai_agent_registry WHERE is_active = TRUE ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query356(schema, args) {
        const query = `SELECT status, COUNT(*) as cnt FROM "${schema}".ai_invocations ${where} GROUP BY status`;
        return safeQuery(query, args);
    }
    static async query357(schema, args) {
        const query = `SELECT COUNT(*) as total FROM "${schema}".ai_invocations ${where}`;
        return safeQuery(query, args);
    }
    static async query358(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_invocations WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query359(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_invocations WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query360(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_invocations WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query361(schema, args) {
        const query = `SELECT * FROM public.agent_process_governance_rules_global
       WHERE process_id = $1 AND is_active = true
       ORDER BY enforcement_level DESC
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query362(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_process_governance_rules
     WHERE tenant_id = $1
       AND process_id = $2
       AND is_active = true
       AND (agent_ids IS NULL OR $3 = ANY(agent_ids))
       AND (activation_modes IS NULL OR $4 = ANY(activation_modes))
     ORDER BY enforcement_level DESC, created_at DESC
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query363(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
       SET status = 'failed', error_message = $1, completed_at = NOW(), duration_ms = $2
       WHERE activity_id = $3`;
        return safeQuery(query, args);
    }
    static async query364(schema, args) {
        const query = `UPDATE "${schema}".personal_agent_assignments
       SET total_actions_executed = total_actions_executed + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`;
        return safeQuery(query, args);
    }
    static async query365(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
       SET status = 'completed', completed_at = NOW(), duration_ms = $1
       WHERE activity_id = $2`;
        return safeQuery(query, args);
    }
    static async query366(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
       SET status = 'executing', executed_at = NOW()
       WHERE activity_id = $1`;
        return safeQuery(query, args);
    }
    static async query367(schema, args) {
        const query = `UPDATE "${schema}".personal_agent_assignments
     SET last_activity_at = NOW(),
         total_actions_executed = total_actions_executed + 1,
         updated_at = NOW()
     WHERE assignment_id = $1`;
        return safeQuery(query, args);
    }
    static async query368(schema, args) {
        const query = `INSERT INTO "${schema}".agent_activity_log
     (activity_id, tenant_id, assignment_id, user_id, agent_id, activity_type, activity_category,
      entity_type, entity_id, action_title, action_description, action_payload, process_id, process_step,
      governance_rule_applied, policy_rule_applied, sla_deadline, sla_hours_overdue, triggered_by_sla,
      execution_mode, required_approval, risk_level, compliance_check_passed, compliance_check_details,
      status, auth_token_hash, auth_method, ip_address, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`;
        return safeQuery(query, args);
    }
    static async query369(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
       SET status = 'rejected',
           rejected_by = $1,
           rejected_at = NOW(),
           rejection_reason = $2,
           result = jsonb_build_object(
             'confirmation', jsonb_build_object(
               'approved', false,
               'rejectedBy', $1,
               'rejectedAt', NOW(),
               'reason', $2,
               'notes', $3,
               'riskAssessment', $4,
               'complianceNotes', $5
             )
           )
       WHERE activity_id = $6`;
        return safeQuery(query, args);
    }
    static async query370(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
         SET status = 'failed', error_message = $1, completed_at = NOW()
         WHERE activity_id = $2`;
        return safeQuery(query, args);
    }
    static async query371(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
         SET status = 'executing', executed_at = NOW()
         WHERE activity_id = $1`;
        return safeQuery(query, args);
    }
    static async query372(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
       SET status = 'approved',
           approved_by = $1,
           approved_at = NOW(),
           result = jsonb_build_object(
             'confirmation', jsonb_build_object(
               'approved', true,
               'confirmedBy', $1,
               'confirmedAt', NOW(),
               'reason', $2,
               'notes', $3,
               'riskAssessment', $4,
               'complianceNotes', $5,
               'overridePolicy', $6,
               'overrideReason', $7
             )
           )
       WHERE activity_id = $8`;
        return safeQuery(query, args);
    }
    static async query373(schema, args) {
        const query = `UPDATE "${schema}".personal_agent_assignments
       SET total_actions_rejected = total_actions_rejected + 1,
           updated_at = NOW()
       WHERE assignment_id = $1`;
        return safeQuery(query, args);
    }
    static async query374(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
     SET status = 'rejected', rejected_by = $1, rejected_at = NOW(), rejection_reason = $2
     WHERE activity_id = $3`;
        return safeQuery(query, args);
    }
    static async query375(schema, args) {
        const query = `UPDATE "${schema}".personal_agent_assignments
     SET total_actions_approved = total_actions_approved + 1,
         updated_at = NOW()
     WHERE assignment_id = $1`;
        return safeQuery(query, args);
    }
    static async query376(schema, args) {
        const query = `UPDATE "${schema}".agent_activity_log
     SET status = 'approved', approved_by = $1, approved_at = NOW()
     WHERE activity_id = $2`;
        return safeQuery(query, args);
    }
    static async query377(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_activity_log WHERE activity_id = $1`;
        return safeQuery(query, args);
    }
    static async query378(schema, args) {
        const query = `SELECT permission_code, allowed_roles FROM "${schema}".authorization_permissions`;
        return safeQuery(query, args);
    }
    static async query379(schema, args) {
        const query = `SELECT DISTINCT b.permission_code
       FROM "${schema}".enterprise_user_role_assignments eura
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = eura.module_code AND b.role_code = eura.functional_role_code AND b.is_active = true
       WHERE eura.user_id = $1 AND eura.is_active = true`;
        return safeQuery(query, args);
    }
    static async query380(schema, args) {
        const query = `SELECT DISTINCT b.permission_code
       FROM "${schema}".user_role_assignments ura
       JOIN "${schema}".module_role_definitions rd
         ON rd.role_code = ura.role_id AND rd.is_active = true
       JOIN "${schema}".module_role_permission_bindings b
         ON b.module_code = rd.module_code AND b.role_code = rd.role_code AND b.is_active = true
       WHERE ura.user_id = $1 AND ura.active = true`;
        return safeQuery(query, args);
    }
    static async query381(schema, args) {
        const query = `SELECT role FROM "${schema}".users WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query382(schema, args) {
        const query = `UPDATE "${schema}".personal_agent_assignments
     SET ${updateFields.join(', ')}
     WHERE tenant_id = $${paramIndex++} AND user_id = $${paramIndex++} AND agent_id = $${paramIndex++}`;
        return safeQuery(query, args);
    }
    static async query383(schema, args) {
        const query = `SELECT * FROM "${schema}".personal_agent_assignments
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query384(schema, args) {
        const query = `INSERT INTO "${schema}".personal_agent_assignments
     (assignment_id, tenant_id, user_id, agent_id, agent_name_en, agent_name_ar,
      inherited_roles, inherited_permissions, activation_mode, sla_based_activation,
      sla_threshold_hours, sla_priority_filter, company_policy_rules, process_governance_rules,
      allowed_action_types, blocked_action_types, requires_approval_for, auto_approve_below_risk,
      metadata, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`;
        return safeQuery(query, args);
    }
    static async query385(schema, args) {
        const query = `SELECT DISTINCT u.user_id, u.email, u.display_name
     FROM public.users u
     WHERE u.tenant_id = $1 AND u.is_active = true AND u.deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query386(schema, args) {
        const query = `SELECT
      DATE(created_at) as date,
      COUNT(*) as activities,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN triggered_by_sla = true THEN 1 END) as sla_breaches
     FROM "${schema}".agent_activity_log
     WHERE tenant_id = $1 AND created_at >= $2 ${userFilter}
     GROUP BY DATE(created_at)
     ORDER BY date ASC`;
        return safeQuery(query, args);
    }
    static async query387(schema, args) {
        const query = `SELECT aal.*,
            paa.agent_name_en, paa.agent_name_ar, paa.activation_mode,
            paa.inherited_roles, paa.inherited_permissions
     FROM "${schema}".agent_activity_log aal
     LEFT JOIN "${schema}".personal_agent_assignments paa ON aal.assignment_id = paa.assignment_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY aal.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        return safeQuery(query, args);
    }
    static async query388(schema, args) {
        const query = `SELECT COUNT(*) as total FROM "${schema}".agent_activity_log WHERE ${conditions.join(' AND ')}`;
        return safeQuery(query, args);
    }
    static async query389(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_activity_log
     WHERE tenant_id = $1 ${userId ? 'AND user_id = $2' : ''}
     ORDER BY created_at DESC
     LIMIT 20`;
        return safeQuery(query, args);
    }
    static async query390(schema, args) {
        const query = `WITH
    -- Assignment stats
    assignment_stats AS (
      SELECT
        COUNT(*) FILTER (WHERE is_active = true) as total_assignments,
        COUNT(*) FILTER (WHERE is_active = true AND is_enabled = true) as active_agents
      FROM "${schema}".personal_agent_assignments
      WHERE tenant_id = $1
    ),
    -- Activity stats
    activity_stats AS (
      SELECT
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE status = 'pending' AND required_approval = true) as pending_approvals,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_today,
        COUNT(*) FILTER (WHERE triggered_by_sla = true) as sla_breaches,
        AVG(duration_ms) as avg_execution_time,
        COUNT(*) FILTER (WHERE status = 'completed')::float / NULLIF(COUNT(*), 0) * 100 as success_rate,
        COUNT(*) FILTER (WHERE approved_by IS NOT NULL)::float / NULLIF(COUNT(*) FILTER (WHERE required_approval = true), 0) * 100 as approval_rate,
        COUNT(*) FILTER (WHERE triggered_by_sla = false OR (triggered_by_sla = true AND sla_hours_overdue <= 0))::float / NULLIF(COUNT(*), 0) * 100 as sla_compliance_rate
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
    ),
    -- Activities by type
    by_type AS (
      SELECT activity_type, COUNT(*) as count
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
      GROUP BY activity_type
    ),
    -- Activities by status
    by_status AS (
      SELECT status, COUNT(*) as count
      FROM "${schema}".agent_activity_log aal
      WHERE aal.tenant_id = $1 AND aal.created_at >= $2 AND aal.created_at <= $3 ${userFilter}
      GROUP BY status
    )
    SELECT
      (SELECT total_assignments FROM assignment_stats) as total_assignments,
      (SELECT active_agents FROM assignment_stats) as active_agents,
      (SELECT total_activities FROM activity_stats) as total_activities,
      (SELECT pending_approvals FROM activity_stats) as pending_approvals,
      (SELECT completed_today FROM activity_stats) as completed_today,
      (SELECT failed_today FROM activity_stats) as failed_today,
      (SELECT sla_breaches FROM activity_stats) as sla_breaches,
      (SELECT avg_execution_time FROM activity_stats) as avg_execution_time,
      (SELECT success_rate FROM activity_stats) as success_rate,
      (SELECT approval_rate FROM activity_stats) as approval_rate,
      (SELECT sla_compliance_rate FROM activity_stats) as sla_compliance_rate,
      (SELECT jsonb_object_agg(activity_type, count) FROM by_type) as activities_by_type,
      (SELECT jsonb_object_agg(status, count) FROM by_status) as activities_by_status`;
        return safeQuery(query, args);
    }
    static async query391(schema, args) {
        const query = `SELECT
        (SELECT COUNT(*) FROM "${schema}".personal_agent_assignments WHERE tenant_id = $1 AND is_active = true) as total_assignments,
        (SELECT COUNT(*) FROM "${schema}".personal_agent_assignments WHERE tenant_id = $1 AND is_active = true AND is_enabled = true) as active_agents,
        (SELECT COUNT(*) FROM "${schema}".agent_activity_log WHERE tenant_id = $1) as total_activities,
        (SELECT COUNT(*) FROM "${schema}".agent_activity_log WHERE tenant_id = $1 AND status = 'pending' AND required_approval = true) as pending_approvals`;
        return safeQuery(query, args);
    }
    static async query392(schema, args) {
        const query = `SELECT workflow_instance_id as entity_id, title, due_date as deadline, priority
       FROM "${schema}".workflow_instances
       WHERE tenant_id = $1
         AND status IN ('Pending', 'InProgress')
         AND due_date < $2
         AND ($3::VARCHAR[] IS NULL OR priority = ANY($3))
       LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query393(schema, args) {
        const query = `UPDATE "${schema}".agent_sla_activation_rules
             SET last_triggered_at = NOW(), trigger_count = trigger_count + 1
             WHERE rule_id = $1`;
        return safeQuery(query, args);
    }
    static async query394(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_sla_activation_rules
       WHERE tenant_id = $1 AND assignment_id = $2 AND is_active = true`;
        return safeQuery(query, args);
    }
    static async query395(schema, args) {
        const query = `SELECT * FROM "${schema}".personal_agent_assignments
     WHERE tenant_id = $1 AND user_id = $2
       AND is_active = true AND is_enabled = true
       AND sla_based_activation = true`;
        return safeQuery(query, args);
    }
    static async query396(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 ORDER BY created_at DESC LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query397(schema, args) {
        const query = `SELECT * FROM "${schema}".cockpit_signal WHERE tenant_id = $1 AND context_json->>'agentId' = $2 AND recorded_at > ($3::timestamptz - INTERVAL '1 hour') AND recorded_at < ($3::timestamptz + INTERVAL '1 hour') ORDER BY recorded_at ASC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query398(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE run_id = $1 AND tenant_id = $2 AND decision_id != $3 ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query399(schema, args) {
        const query = `SELECT decision_type, agent_id, COUNT(*)::int AS cnt
       FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND created_at > NOW() - ($2 || ' hours')::interval
       GROUP BY decision_type, agent_id`;
        return safeQuery(query, args);
    }
    static async query400(schema, args) {
        const query = `SELECT DATE(created_at) AS date, COUNT(*)::int AS count
       FROM "${schema}".decision_record
       WHERE tenant_id = $1 AND created_at > NOW() - ($2 || ' days')::interval
       GROUP BY DATE(created_at) ORDER BY date ASC`;
        return safeQuery(query, args);
    }
    static async query401(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE run_id = $1 AND tenant_id = $2 ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query402(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE decision_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query403(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".decision_record WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query404(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query405(schema, args) {
        const query = `INSERT INTO "${schema}".decision_record
         (tenant_id, run_id, agent_id, decision_type, entity_type, entity_id,
          confidence, explanation, outcome, input_summary, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query406(schema, args) {
        const query = `WITH metrics AS (
       SELECT 
         COUNT(*)::int AS total_decisions,
         COUNT(*) FILTER (WHERE explanation_content IS NOT NULL AND explanation_content != '{}'::jsonb)::int AS decisions_with_explanations,
         AVG(explanation_quality_score) AS avg_quality,
         COUNT(*) FILTER (WHERE explanation_quality_score < 0.7)::int AS below_threshold,
         COUNT(*) FILTER (WHERE explainability_required = TRUE)::int AS requiring_review,
         COUNT(*) FILTER (WHERE human_reviewed = TRUE)::int AS reviewed,
         COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant
       FROM "${schema}".ai_explainability_records
       WHERE agent_id = $1 AND created_at >= $2 AND created_at <= $3
     )
     SELECT 
       total_decisions,
       decisions_with_explanations,
       CASE WHEN total_decisions > 0 THEN (decisions_with_explanations::decimal / total_decisions * 100) ELSE 0 END AS explanation_coverage_rate,
       avg_quality,
       below_threshold,
       requiring_review,
       reviewed,
       CASE WHEN requiring_review > 0 THEN (reviewed::decimal / requiring_review * 100) ELSE 0 END AS review_coverage_rate,
       compliant,
       non_compliant,
       CASE WHEN total_decisions > 0 THEN (compliant::decimal / total_decisions * 100) ELSE 0 END AS compliance_rate
     FROM metrics`;
        return safeQuery(query, args);
    }
    static async query407(schema, args) {
        const query = `UPDATE "${schema}".ai_explainability_records
       SET explanation_content = explanation_content || $1::jsonb
       WHERE record_id = $2`;
        return safeQuery(query, args);
    }
    static async query408(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query409(schema, args) {
        const query = `INSERT INTO "${schema}".ai_counterfactual_analysis 
     (explainability_record_id, scenario_description, input_changes, expected_output_changes,
      output_difference, sensitivity_score, robustness_assessment, generated_for_user)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query410(schema, args) {
        const query = `UPDATE "${schema}".ai_explainability_records 
     SET human_reviewed = TRUE, reviewed_by = $1, reviewed_at = NOW(),
         review_feedback = $2, explanation_approved = $3
     WHERE record_id = $4
     RETURNING record_id`;
        return safeQuery(query, args);
    }
    static async query411(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query412(schema, args) {
        const query = `INSERT INTO "${schema}".ai_explainability_records 
     (session_id, agent_id, decision_type, decision_output, decision_confidence,
      explanation_method, explanation_content, explanation_quality_score, explanation_completeness,
      meets_quality_threshold, input_context, model_version_id, explainability_required, compliance_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query413(schema, args) {
        const query = `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'accepted')::int AS accepted,
         COUNT(*) FILTER (WHERE outcome->>'status' = 'rejected')::int AS rejected
       FROM "${schema}".decision_record WHERE tenant_id = $1 AND decision_type = 'recommendation'`;
        return safeQuery(query, args);
    }
    static async query414(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".decision_record WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query415(schema, args) {
        const query = `SELECT * FROM "${schema}".decision_record WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query416(schema, args) {
        const query = `UPDATE "${schema}".decision_record
       SET outcome = jsonb_set(jsonb_set(outcome, '{status}', '"rejected"'), '{rejectReason}', $3::jsonb)
       WHERE decision_id = $1 AND decision_type = 'recommendation'
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query417(schema, args) {
        const query = `UPDATE "${schema}".decision_record
       SET outcome = jsonb_set(outcome, '{status}', '"accepted"'),
           created_by = $2
       WHERE decision_id = $1 AND decision_type = 'recommendation'
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query418(schema, args) {
        const query = `INSERT INTO "${schema}".decision_record
         (tenant_id, run_id, agent_id, decision_type, entity_type, entity_id,
          confidence, explanation, outcome, input_summary, created_by)
       VALUES ($1,$2,$3,'recommendation',$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query419(schema, args) {
        const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name`;
        return safeQuery(query, args);
    }
    static async query420(schema, args) {
        const query = generatedSql;
        return safeQuery(query, args);
    }
    static async query421(schema, args) {
        const query = sql;
        return safeQuery(query, args);
    }
    static async query422(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query423(schema, args) {
        const query = `SELECT run_id, agent_id, total_steps, total_duration_ms, total_tokens, overall_confidence, started_at, completed_at
     FROM "${schema}".agent_reasoning_traces
     WHERE agent_id = $1
     ORDER BY created_at DESC
     LIMIT $2`;
        return safeQuery(query, args);
    }
    static async query424(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_reasoning_steps WHERE run_id = $1 ORDER BY step_index`;
        return safeQuery(query, args);
    }
    static async query425(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_reasoning_traces WHERE run_id = $1`;
        return safeQuery(query, args);
    }
    static async query426(schema, args) {
        const query = `INSERT INTO "${schema}".agent_reasoning_steps
       (run_id, step_index, node_id, reasoning, tools_used, input_summary, output_summary, confidence, duration_ms, tokens_used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (run_id, step_index) DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query427(schema, args) {
        const query = `INSERT INTO "${schema}".agent_reasoning_traces
     (run_id, agent_id, total_steps, total_duration_ms, total_tokens, overall_confidence, started_at, completed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (run_id) DO UPDATE SET
       total_steps = EXCLUDED.total_steps,
       total_duration_ms = EXCLUDED.total_duration_ms,
       total_tokens = EXCLUDED.total_tokens,
       overall_confidence = EXCLUDED.overall_confidence`;
        return safeQuery(query, args);
    }
    static async query428(schema, args) {
        const query = `SELECT target_type, target_id, link_strength, link_type
       FROM "${schema}".explainability_links
       WHERE tenant_id = $1 AND source_type = $2 AND source_id = $3
       ORDER BY link_strength DESC`;
        return safeQuery(query, args);
    }
    static async query429(schema, args) {
        const query = `INSERT INTO "${schema}".explainability_links
         (tenant_id, source_type, source_id, target_type, target_id, link_strength, link_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, source_type, source_id, target_type, target_id) DO UPDATE SET
         link_strength = EXCLUDED.link_strength,
         link_type = EXCLUDED.link_type`;
        return safeQuery(query, args);
    }
    static async query430(schema, args) {
        const query = `INSERT INTO "${schema}".reasoning_chain_summary
         (tenant_id, run_id, agent_id, decision_id, total_steps, step_types,
          total_duration_ms, total_tokens_input, total_tokens_output,
          final_confidence, final_reasoning, key_factors,
          reasoning_quality_score, completeness_score,
          first_step_id, last_step_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (run_id) DO UPDATE SET
         total_steps = EXCLUDED.total_steps,
         step_types = EXCLUDED.step_types,
         total_duration_ms = EXCLUDED.total_duration_ms,
         total_tokens_input = EXCLUDED.total_tokens_input,
         total_tokens_output = EXCLUDED.total_tokens_output,
         final_confidence = EXCLUDED.final_confidence,
         final_reasoning = EXCLUDED.final_reasoning,
         key_factors = EXCLUDED.key_factors,
         reasoning_quality_score = EXCLUDED.reasoning_quality_score,
         completeness_score = EXCLUDED.completeness_score,
         last_step_id = EXCLUDED.last_step_id,
         updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query431(schema, args) {
        const query = `SELECT * FROM "${schema}".reasoning_chain_summary
       WHERE run_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query432(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_reasoning_chain
       WHERE decision_id = $1 AND tenant_id = $2
       ORDER BY step_order ASC, started_at ASC`;
        return safeQuery(query, args);
    }
    static async query433(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_reasoning_chain
       WHERE run_id = $1 AND tenant_id = $2
       ORDER BY step_order ASC, started_at ASC`;
        return safeQuery(query, args);
    }
    static async query434(schema, args) {
        const query = `UPDATE "${schema}".agent_reasoning_chain
       SET completed_at = $1,
           duration_ms = $2,
           step_output = COALESCE($3::jsonb, step_output),
           error_message = COALESCE($4, error_message)
       WHERE step_id = $5 AND tenant_id = $6`;
        return safeQuery(query, args);
    }
    static async query435(schema, args) {
        const query = `SELECT started_at FROM "${schema}".agent_reasoning_chain WHERE step_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query436(schema, args) {
        const query = `INSERT INTO "${schema}".agent_reasoning_chain
         (tenant_id, run_id, agent_id, decision_id, step_type, step_order, node_name,
          step_input, step_output, reasoning_text, confidence,
          tool_name, tool_input, tool_output, tool_error,
          llm_prompt, llm_response, llm_tokens_input, llm_tokens_output, llm_latency_ms,
          guard_result, guard_reason, guard_metadata,
          state_before, state_after, state_changes,
          parent_step_id, related_step_ids,
          error_message, error_stack, retry_count,
          started_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query437(schema, args) {
        const query = `UPDATE "${schema}".agent_collaboration_metrics SET suggestions_accepted = suggestions_accepted + 1, snapshot_at = NOW()
       WHERE agent_user_id = $1`;
        return safeQuery(query, args);
    }
    static async query438(schema, args) {
        const query = `UPDATE "${schema}".agent_suggestions SET accepted = $1, resolved_at = NOW() WHERE suggestion_id = $2 RETURNING agent_user_id`;
        return safeQuery(query, args);
    }
    static async query439(schema, args) {
        const query = `UPDATE "${schema}".agent_collaboration_metrics SET suggestions_generated = suggestions_generated + 1, snapshot_at = NOW()
     WHERE agent_user_id = $1`;
        return safeQuery(query, args);
    }
    static async query440(schema, args) {
        const query = `INSERT INTO "${schema}".agent_suggestions
      (agent_user_id, target_task_id, target_user_id, suggestion_text, suggested_action, prefill_data)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING suggestion_id`;
        return safeQuery(query, args);
    }
    static async query441(schema, args) {
        const query = sql;
        return safeQuery(query, args);
    }
    static async query442(schema, args) {
        const query = `INSERT INTO "${schema}".agent_status_log (agent_user_id, from_status, to_status) VALUES ($1,$2,$3)`;
        return safeQuery(query, args);
    }
    static async query443(schema, args) {
        const query = `UPDATE "${schema}".unified_squad_members SET current_status = $1, last_activity_at = NOW(), updated_at = NOW() WHERE user_id = $2`;
        return safeQuery(query, args);
    }
    static async query444(schema, args) {
        const query = `SELECT current_status FROM "${schema}".unified_squad_members WHERE user_id = $1 AND is_agent = TRUE`;
        return safeQuery(query, args);
    }
    static async query445(schema, args) {
        const query = `INSERT INTO "${schema}".agent_collaboration_metrics (agent_user_id) VALUES ($1)`;
        return safeQuery(query, args);
    }
    static async query446(schema, args) {
        const query = `SELECT metric_id FROM "${schema}".agent_collaboration_metrics WHERE agent_user_id = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query447(schema, args) {
        const query = `SELECT new_status FROM "${schema}".ai_agent_status_log
       WHERE agent_user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query448(schema, args) {
        const query = `SELECT
         COUNT(*) FILTER (WHERE status IN ('completed', 'pending_review')) as total_completed,
         COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
         AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) * 1000) FILTER (WHERE reviewed_at IS NOT NULL) as avg_response_ms,
         MAX(created_at) as last_active
       FROM "${schema}".ai_step_executions
       WHERE agent_user_id = $1`;
        return safeQuery(query, args);
    }
    static async query449(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_status_log
     WHERE agent_user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`;
        return safeQuery(query, args);
    }
    static async query450(schema, args) {
        const query = `SELECT COUNT(*) as total FROM "${schema}".ai_agent_status_log WHERE agent_user_id = $1`;
        return safeQuery(query, args);
    }
    static async query451(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_status_log
      (agent_user_id, agent_id, previous_status, new_status, workflow_execution_id, step_id, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        return safeQuery(query, args);
    }
    static async query452(schema, args) {
        const query = `INSERT INTO "${schema}".teams (team_id, team_code, name_en, name_ar, description_en, description_ar, team_lead_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (team_id) DO UPDATE SET
           name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
           description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar
         WHERE (teams.name_en, teams.description_en) IS DISTINCT FROM (EXCLUDED.name_en, EXCLUDED.description_en)`;
        return safeQuery(query, args);
    }
    static async query453(schema, args) {
        const query = `SELECT user_id FROM users WHERE tenant_id = $1 AND role = 'owner' LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query454(schema, args) {
        const query = `SELECT team_id FROM "${schema}".teams WHERE team_id = $1`;
        return safeQuery(query, args);
    }
    static async query455(schema, args) {
        const query = `INSERT INTO users (user_id, email, password_hash, name, tenant_id, role, user_type, agent_id, onboarding_complete)
         VALUES ($1, $2, 'AI_AGENT_NO_PASSWORD', $3, $4, 'agent', 'ai_agent', $5, TRUE)`;
        return safeQuery(query, args);
    }
    static async query456(schema, args) {
        const query = `SELECT user_id FROM users WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query457(schema, args) {
        const query = `INSERT INTO "${schema}".team_members (team_id, user_id, role, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`;
        return safeQuery(query, args);
    }
    static async query458(schema, args) {
        const query = `INSERT INTO "${schema}".teams (team_code, name_en, team_type, active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (team_code) DO UPDATE SET name_en = EXCLUDED.name_en
     RETURNING team_id, team_code, name_en`;
        return safeQuery(query, args);
    }
    static async query459(schema, args) {
        const query = `UPDATE "${schema}".unified_squad_members SET current_status = $1, last_activity_at = NOW(), updated_at = NOW() WHERE user_id = $2`;
        return safeQuery(query, args);
    }
    static async query460(schema, args) {
        const query = `UPDATE "${schema}".pending_assignment_queue SET status = 'failed', retry_count = retry_count + 1 WHERE queue_id = $1`;
        return safeQuery(query, args);
    }
    static async query461(schema, args) {
        const query = `UPDATE "${schema}".pending_assignment_queue SET status = 'delivered', delivered_at = NOW() WHERE queue_id = $1`;
        return safeQuery(query, args);
    }
    static async query462(schema, args) {
        const query = `SELECT * FROM "${schema}".pending_assignment_queue WHERE instance_id = $1 AND status = 'queued' ORDER BY created_at`;
        return safeQuery(query, args);
    }
    static async query463(schema, args) {
        const query = `INSERT INTO "${schema}".pending_assignment_queue (instance_id, assignee_user_id, task_id, payload)
     VALUES ($1,$2,$3,$4)`;
        return safeQuery(query, args);
    }
    static async query464(schema, args) {
        const query = `UPDATE "${schema}".unified_squad_members SET last_activity_at = NOW() WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query465(schema, args) {
        const query = `UPDATE "${schema}".unified_squad_members SET task_queue = task_queue || $1::jsonb, updated_at = NOW() WHERE user_id = $2`;
        return safeQuery(query, args);
    }
    static async query466(schema, args) {
        const query = `SELECT * FROM "${schema}".unified_squad_members WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query467(schema, args) {
        const query = `SELECT member_id FROM "${schema}".unified_squad_members WHERE user_id = $1`;
        return safeQuery(query, args);
    }
    static async query468(schema, args) {
        const query = `SELECT * FROM "${schema}".unified_squad_members ${where} ORDER BY display_name_en`;
        return safeQuery(query, args);
    }
    static async query469(schema, args) {
        const query = `INSERT INTO "${schema}".unified_squad_members
      (user_id, display_name_en, display_name_ar, role, deployment_mode, is_agent,
       capabilities, specialization, delivery_channel, webhook_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (user_id) DO UPDATE SET
       display_name_en = EXCLUDED.display_name_en,
       display_name_ar = EXCLUDED.display_name_ar,
       role = EXCLUDED.role,
       deployment_mode = EXCLUDED.deployment_mode,
       capabilities = EXCLUDED.capabilities,
       specialization = EXCLUDED.specialization,
       delivery_channel = EXCLUDED.delivery_channel,
       webhook_url = EXCLUDED.webhook_url,
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query470(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_auto_remediation'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query471(schema, args) {
        const query = `SELECT b1.role_code, b1.permission_code AS perm1, b2.permission_code AS perm2, b1.module_code
       FROM "${schema}".module_role_permission_bindings b1
       JOIN "${schema}".module_role_permission_bindings b2
         ON b1.module_code = b2.module_code AND b1.role_code = b2.role_code
         AND b1.permission_code < b2.permission_code
       WHERE b1.is_active = true AND b2.is_active = true
         AND b1.permission_code LIKE '%.write' AND b2.permission_code LIKE '%.approve'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".module_sod_rules s
           WHERE s.module_code = b1.module_code AND s.is_active = true
             AND s.conflicting_actions::text LIKE '%' || split_part(b1.permission_code, '.', 3) || '%'
         )
       LIMIT 20`;
        return safeQuery(query, args);
    }
    static async query472(schema, args) {
        const query = `INSERT INTO "${schema}".action_items (module_code, title, description, status, priority, created_by)
             VALUES ($1, $2, $3, 'open', $4, 'ai-auto-remediation')
             ON CONFLICT DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query473(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'rbac_drift_result'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query474(schema, args) {
        const query = `INSERT INTO "${schema}".action_items (module_code, title, description, status, priority, created_by)
             VALUES ($1, $2, $3, 'open', 'medium', 'ai-auto-remediation')`;
        return safeQuery(query, args);
    }
    static async query475(schema, args) {
        const query = `SELECT b.module_code, b.role_code, b.permission_code
       FROM "${schema}".module_role_permission_bindings b
       WHERE b.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".role_usage_audit rua
           WHERE rua.permission_code = b.permission_code
             AND rua.result = 'allowed'
             AND rua.created_at > NOW() - make_interval(days => $1)
         )
       LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query476(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_auto_remediation', $1, 'info', 'platform')`;
        return safeQuery(query, args);
    }
    static async query477(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_approval_matrices
       WHERE module_code = 'platform' AND action_type = $1 AND is_active = true
       AND requires_approval = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query478(schema, args) {
        const query = `SELECT default_operation_mode FROM public.tenant_module_entitlements WHERE tenant_id = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query479(schema, args) {
        const query = `SELECT signal_code, signal_value, context_json, recorded_at
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND signal_code LIKE 'trigger.fired%' AND recorded_at > NOW() - ($2 || ' hours')::interval
       ORDER BY recorded_at DESC LIMIT 200`;
        return safeQuery(query, args);
    }
    static async query480(schema, args) {
        const query = `UPDATE "${schema}".event_trigger_binding SET ${setClauses.join(', ')} WHERE binding_id = $${idx++} AND tenant_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query481(schema, args) {
        const query = `SELECT * FROM "${schema}".event_trigger_binding WHERE binding_id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query482(schema, args) {
        const query = `UPDATE "${schema}".event_trigger_binding SET enabled = $3 WHERE binding_id = $1 AND tenant_id = $2 RETURNING binding_id`;
        return safeQuery(query, args);
    }
    static async query483(schema, args) {
        const query = `DELETE FROM "${schema}".event_trigger_binding WHERE binding_id = $1 AND tenant_id = $2 RETURNING binding_id`;
        return safeQuery(query, args);
    }
    static async query484(schema, args) {
        const query = `INSERT INTO "${schema}".event_trigger_binding
       (tenant_id, event_type, target_agent_id, action_type, condition_json, cooldown_seconds, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query485(schema, args) {
        const query = `SELECT * FROM "${schema}".event_trigger_binding WHERE tenant_id = $1 ORDER BY event_type`;
        return safeQuery(query, args);
    }
    static async query486(schema, args) {
        const query = `UPDATE "${schema}".event_trigger_binding SET last_triggered_at = NOW() WHERE binding_id = $1`;
        return safeQuery(query, args);
    }
    static async query487(schema, args) {
        const query = `SELECT * FROM "${schema}".event_trigger_binding
       WHERE tenant_id = $1 AND event_type = $2 AND enabled = TRUE`;
        return safeQuery(query, args);
    }
    static async query488(schema, args) {
        const query = `SELECT
         COUNT(*) FILTER (WHERE status != 'completed' AND status != 'approved')::int AS missing,
         COALESCE(
           ARRAY_AGG(DISTINCT task_title) FILTER (WHERE status != 'completed' AND status != 'approved'),
           ARRAY[]::text[]
         ) AS missing_titles
       FROM "${schema}".evidence_tasks
       WHERE control_id = $1`;
        return safeQuery(query, args);
    }
    static async query489(schema, args) {
        const query = `SELECT
       c.control_id,
       c.control_code,
       c.control_title,
       c.domain,
       c.domain_code,
       c.compliance_status,
       c.criticality_level,
       c.automation_possible,
       c.framework_code
     FROM "${schema}".controls c
     WHERE c.framework_code = $1
       AND c.status = 'active'
       AND (c.compliance_status IS NULL
            OR c.compliance_status != 'compliant')
     ORDER BY
       CASE c.criticality_level
         WHEN 'critical' THEN 1
         WHEN 'mandatory' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         ELSE 4
       END,
       c.domain_code,
       c.control_code`;
        return safeQuery(query, args);
    }
    static async query490(schema, args) {
        const query = `UPDATE "${schema}".task_route_rule SET ${setClauses.join(', ')} WHERE rule_id = $${idx++} AND tenant_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query491(schema, args) {
        const query = `UPDATE "${schema}".task_route_rule SET enabled = $3 WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`;
        return safeQuery(query, args);
    }
    static async query492(schema, args) {
        const query = `DELETE FROM "${schema}".task_route_rule WHERE rule_id = $1 AND tenant_id = $2 RETURNING rule_id`;
        return safeQuery(query, args);
    }
    static async query493(schema, args) {
        const query = `INSERT INTO "${schema}".task_route_rule
       (tenant_id, rule_name, entity_type, condition_json, target_agent_id, target_role, priority, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query494(schema, args) {
        const query = `SELECT * FROM "${schema}".task_route_rule WHERE tenant_id = $1 ORDER BY priority ASC`;
        return safeQuery(query, args);
    }
    static async query495(schema, args) {
        const query = `SELECT * FROM "${schema}".task_route_rule
       WHERE tenant_id = $1 AND enabled = TRUE
         AND (entity_type IS NULL OR entity_type = $2)
       ORDER BY priority ASC
       LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query496(schema, args) {
        const query = `INSERT INTO "${schema}".ai_trigger_config (tenant_id, enabled, risk_threshold, compliance_gap_threshold, incident_severity_threshold, module_triggers, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tenant_id) DO UPDATE SET
       enabled = COALESCE($2, ai_trigger_config.enabled),
       risk_threshold = COALESCE($3, ai_trigger_config.risk_threshold),
       compliance_gap_threshold = COALESCE($4, ai_trigger_config.compliance_gap_threshold),
       incident_severity_threshold = COALESCE($5, ai_trigger_config.incident_severity_threshold),
       module_triggers = COALESCE($6, ai_trigger_config.module_triggers),
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query497(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_trigger_config WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query498(schema, args) {
        const query = `SELECT status FROM "${schema}".ai_invocations WHERE id = $1`;
        return safeQuery(query, args);
    }
    static async query499(schema, args) {
        const query = `SELECT actor_id, action, before_state, after_state, created_at FROM "${schema}".audit_trail WHERE tenant_id = $1 AND entity_id = $2 AND action = 'transition' ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query500(schema, args) {
        const query = `INSERT INTO "${schema}".inbox_inbox (tenant_id, subject, body, entity_type, entity_id, action_required, priority) VALUES ($1, $2, $3, $4, $5, true, 'high')`;
        return safeQuery(query, args);
    }
    static async query501(schema, args) {
        const query = `INSERT INTO "${schema}".audit_trail (tenant_id, actor_id, module, action, entity_type, entity_id, before_state, after_state) VALUES ($1, $2, $3, 'transition', $4, $5, $6, $7)`;
        return safeQuery(query, args);
    }
    static async query502(schema, args) {
        const query = `UPDATE "${schema}".ai_invocations SET status = $1, updated_at = NOW() WHERE id = $2`;
        return safeQuery(query, args);
    }
    static async query503(schema, args) {
        const query = `INSERT INTO "${schema}".event_trigger_binding
             (tenant_id, event_type, target_agent_id, action_type,
              condition_json, enabled, cooldown_seconds)
           VALUES ($1, $2, $3, $4, '{}', TRUE, $5)`;
        return safeQuery(query, args);
    }
    static async query504(schema, args) {
        const query = `SELECT 1 FROM "${schema}".event_trigger_binding
         WHERE tenant_id = $1 AND event_type = $2 AND target_agent_id = $3
         LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query505(schema, args) {
        const query = `SELECT COUNT(*)::int AS count FROM "${schema}".copilot_proposed_actions
       WHERE user_id = $1 AND status = 'pending'`;
        return safeQuery(query, args);
    }
    static async query506(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'escalated', escalated_at = NOW(), escalation_target = $1, updated_at = NOW()
       WHERE action_id = $2 AND status = 'pending'`;
        return safeQuery(query, args);
    }
    static async query507(schema, args) {
        const query = `SELECT escalate_to_team_id FROM "${schema}".team_escalation_paths
           WHERE from_team_id = $1 AND escalation_level = 1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query508(schema, args) {
        const query = `SELECT team_id, team_name FROM "${schema}".teams WHERE team_code = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query509(schema, args) {
        const query = `SELECT * FROM "${schema}".copilot_proposed_actions
     WHERE status = 'pending'
       AND auto_execute_enabled = FALSE
       AND proposed_at < NOW() - INTERVAL '30 minutes'
       AND escalated_at IS NULL
     ORDER BY proposed_at ASC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query510(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'auto_executing', updated_at = NOW()
       WHERE action_id = $1 AND status = 'pending'
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query511(schema, args) {
        const query = `SELECT * FROM "${schema}".copilot_proposed_actions
     WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at <= NOW()
     ORDER BY auto_execute_at ASC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query512(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
     SET auto_execute_enabled = FALSE, auto_execute_at = NULL, updated_at = NOW()
     WHERE action_id = $1 AND status = 'pending'
     RETURNING action_id`;
        return safeQuery(query, args);
    }
    static async query513(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
     SET status = 'rejected', rejected_at = NOW(), rejected_by = $1, rejection_reason = $2,
         response_time_ms = EXTRACT(EPOCH FROM (NOW() - proposed_at))::integer * 1000,
         updated_at = NOW()
     WHERE action_id = $3 AND status = 'pending'
     RETURNING action_id`;
        return safeQuery(query, args);
    }
    static async query514(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
     SET status = 'executing', updated_at = NOW()
     WHERE action_id = $1 AND status = 'pending'
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query515(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
     SET status = $1, executed_at = NOW(), executed_by = $2, execution_method = $3,
         delegation_action_id = $4, post_validation = $5, response_time_ms = $6, updated_at = NOW()
     WHERE action_id = $7`;
        return safeQuery(query, args);
    }
    static async query516(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE action_id = $2`;
        return safeQuery(query, args);
    }
    static async query517(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions SET status = $1, updated_at = NOW() WHERE action_id = $2`;
        return safeQuery(query, args);
    }
    static async query518(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions
       SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE action_id = $2`;
        return safeQuery(query, args);
    }
    static async query519(schema, args) {
        const query = `UPDATE "${schema}".copilot_proposed_actions SET pre_validation = $1, updated_at = NOW() WHERE action_id = $2`;
        return safeQuery(query, args);
    }
    static async query520(schema, args) {
        const query = `SELECT pt.task_id, pt.team_id, pt.assigned_user_id, pt.sla_hours, t.team_name
       FROM "${schema}".process_tasks pt
       LEFT JOIN "${schema}".teams t ON t.team_id = pt.team_id
       WHERE pt.trigger_source LIKE 'copilot%' AND pt.created_at > NOW() - INTERVAL '10 seconds'
       ORDER BY pt.created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query521(schema, args) {
        const query = `SELECT scopes FROM "${schema}".delegation_grants WHERE grant_id = $1`;
        return safeQuery(query, args);
    }
    static async query522(schema, args) {
        const query = `SELECT task_id, team_id, assigned_user_id, sla_hours
         FROM "${schema}".process_tasks
         WHERE trigger_source LIKE 'copilot%' AND created_at > NOW() - INTERVAL '10 seconds'
         ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query523(schema, args) {
        const query = `SELECT action_type, agent_id FROM "${schema}".copilot_proposed_actions
       WHERE entity_type = $1 AND entity_id = $2
         AND action_type = ANY($3)
         AND status IN ('completed', 'auto_completed')
         AND executed_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query524(schema, args) {
        const query = `SELECT action_id, action_type, agent_id FROM "${schema}".copilot_proposed_actions
       WHERE entity_type = $1 AND entity_id = $2
         AND status IN ('executing', 'auto_executing')
         AND action_id != $3 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query525(schema, args) {
        const query = `SELECT 1 FROM "${schema}".copilot_proposed_actions
       WHERE action_type = $1 AND entity_type = $2 AND entity_id = $3
         AND status IN ('completed', 'auto_completed')
         AND executed_at > NOW() - INTERVAL '24 hours'
         AND action_id != $4 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query526(schema, args) {
        const query = `SELECT 1 FROM "${schema}"."${mapping.table}" WHERE "${mapping.pk}" = $1 LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query527(schema, args) {
        const query = `
    CREATE TABLE IF NOT EXISTS "${schema}".copilot_proposed_actions (
      action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      agent_id VARCHAR(10) NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      entity_type VARCHAR(50),
      entity_id VARCHAR(100),
      action_payload JSONB DEFAULT '{}',
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      auto_execute_at TIMESTAMPTZ,
      auto_execute_enabled BOOLEAN DEFAULT TRUE,
      pre_validation JSONB,
      post_validation JSONB,
      executed_at TIMESTAMPTZ,
      executed_by VARCHAR(64),
      execution_method VARCHAR(20),
      delegation_action_id UUID,
      rejected_at TIMESTAMPTZ,
      rejected_by VARCHAR(64),
      rejection_reason TEXT,
      failure_reason TEXT,
      escalated_at TIMESTAMPTZ,
      escalation_target VARCHAR(64),
      proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      response_time_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cpa_pending ON "${schema}".copilot_proposed_actions (user_id, status)
      WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_cpa_auto_exec ON "${schema}".copilot_proposed_actions (auto_execute_at)
      WHERE status = 'pending' AND auto_execute_enabled = TRUE AND auto_execute_at IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_cpa_session ON "${schema}".copilot_proposed_actions (session_id);
  `;
        return safeQuery(query, args);
    }
    static async query528(schema, args) {
        const query = `DELETE FROM "${schema}".ai_agent_registry WHERE agent_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query529(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_registry
     WHERE asset_id = $1 AND is_active = TRUE
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query530(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_agent_registry ${where}`;
        return safeQuery(query, args);
    }
    static async query531(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_registry ${where} ORDER BY asset_id, version_number DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query532(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_registry
       (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
        capabilities, approval_status, deployment_status, is_active, rollback_from_version_id,
        diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'inactive', FALSE, $7, $8, $9, $10, $11)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query533(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry
     SET deployment_status = 'retired',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE agent_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query534(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry
     SET is_active = FALSE, deployment_status = 'suspended',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE agent_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query535(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry
     SET approval_status = 'rejected',
         notes = COALESCE($1, notes),
         updated_by = $2, updated_at = NOW()
     WHERE agent_version_id = $3
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query536(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry
     SET approval_status = 'approved',
         approved_by = $1, approved_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE agent_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query537(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry
     SET approval_status = 'pending_approval',
         submitted_by = $1, submitted_at = NOW(),
         updated_by = $1, updated_at = NOW()
     WHERE agent_version_id = $2
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query538(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_registry SET ${sets.join(', ')} WHERE agent_version_id = $${idx} RETURNING *`;
        return safeQuery(query, args);
    }
    static async query539(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_registry
       (asset_id, version_number, agent_config, linked_prompt_asset_id, linked_model_asset_id,
        capabilities, approval_status, deployment_status, diff_summary, change_summary, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', 'inactive', $7, $8, $9, $10)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query540(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_registry
     WHERE asset_id = $1 AND version_number < $2
     ORDER BY version_number DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query541(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_registry WHERE agent_version_id = $1`;
        return safeQuery(query, args);
    }
    static async query542(schema, args) {
        const query = `SELECT user_id, consent_granted, max_actions_per_day, actions_today, actions_today_reset
       FROM "${schema}".shadow_agent_config
       WHERE tenant_id = $1 AND enabled = TRUE AND $2 = ANY(allowed_agents) LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query543(schema, args) {
        const query = `SELECT task_id, title, task_type, priority, due_date
         FROM "${schema}".process_tasks
         WHERE status NOT IN ('completed', 'cancelled', 'auto_closed')
         ORDER BY
           CASE priority
             WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4
           END,
           due_date ASC NULLS LAST
         LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query544(schema, args) {
        const query = `SELECT user_id, memory_namespace, consent_granted, max_actions_per_day,
                actions_today, actions_today_reset
         FROM "${schema}".shadow_agent_config
         WHERE tenant_id = $1 AND enabled = TRUE AND $2 = ANY(allowed_agents) LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query545(schema, args) {
        const query = `UPDATE "${schema}".ai_agent_configs
       SET operating_state = $1, trial_expires_at = $2, updated_at = NOW()
       WHERE tenant_id = $3 AND agent_id = $4`;
        return safeQuery(query, args);
    }
    static async query546(schema, args) {
        const query = `INSERT INTO "${schema}".ai_agent_configs
       (tenant_id, agent_id, display_name, description_en, model, temperature, max_tokens,
        system_prompt_key, tools_enabled, max_actions_per_run, enabled, operating_state,
        trial_expires_at, priority, cb_failure_threshold, cb_success_threshold,
        cb_timeout_ms, cb_window_ms, cron_expression, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
         display_name = COALESCE(EXCLUDED.display_name, ai_agent_configs.display_name),
         description_en = COALESCE(EXCLUDED.description_en, ai_agent_configs.description_en),
         model = COALESCE(EXCLUDED.model, ai_agent_configs.model),
         temperature = COALESCE(EXCLUDED.temperature, ai_agent_configs.temperature),
         max_tokens = COALESCE(EXCLUDED.max_tokens, ai_agent_configs.max_tokens),
         system_prompt_key = COALESCE(EXCLUDED.system_prompt_key, ai_agent_configs.system_prompt_key),
         tools_enabled = COALESCE(EXCLUDED.tools_enabled, ai_agent_configs.tools_enabled),
         max_actions_per_run = COALESCE(EXCLUDED.max_actions_per_run, ai_agent_configs.max_actions_per_run),
         enabled = COALESCE(EXCLUDED.enabled, ai_agent_configs.enabled),
         operating_state = COALESCE(EXCLUDED.operating_state, ai_agent_configs.operating_state),
         trial_expires_at = EXCLUDED.trial_expires_at,
         priority = COALESCE(EXCLUDED.priority, ai_agent_configs.priority),
         cb_failure_threshold = COALESCE(EXCLUDED.cb_failure_threshold, ai_agent_configs.cb_failure_threshold),
         cb_success_threshold = COALESCE(EXCLUDED.cb_success_threshold, ai_agent_configs.cb_success_threshold),
         cb_timeout_ms = COALESCE(EXCLUDED.cb_timeout_ms, ai_agent_configs.cb_timeout_ms),
         cb_window_ms = COALESCE(EXCLUDED.cb_window_ms, ai_agent_configs.cb_window_ms),
         cron_expression = EXCLUDED.cron_expression,
         updated_at = NOW()
       RETURNING config_id`;
        return safeQuery(query, args);
    }
    static async query547(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_configs
       WHERE tenant_id = $1 AND enabled = TRUE AND operating_state IN ('on', 'trial')
       ORDER BY priority ASC, agent_id`;
        return safeQuery(query, args);
    }
    static async query548(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_agent_configs WHERE tenant_id = $1 AND agent_id = $2`;
        return safeQuery(query, args);
    }
    static async query549(schema, args) {
        const query = `SELECT COUNT(*)::int AS stuck FROM "${schema}".agent_runs r LEFT JOIN "${schema}".agent_runtime_config c ON c.tenant_id = r.tenant_id AND c.agent_id = r.agent_id WHERE r.tenant_id = $1 AND r.status = 'running' AND EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 > COALESCE(c.stuck_threshold_ms, 300000)`;
        return safeQuery(query, args);
    }
    static async query550(schema, args) {
        const query = `SELECT COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_count, AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) * 1000) AS avg_ms FROM "${schema}".agent_runs WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`;
        return safeQuery(query, args);
    }
    static async query551(schema, args) {
        const query = `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE enabled = TRUE)::int AS enabled_count, COUNT(*) FILTER (WHERE enabled = FALSE)::int AS disabled_count FROM "${schema}".agent_runtime_config WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query552(schema, args) {
        const query = `INSERT INTO "${schema}".agent_runtime_config (tenant_id, agent_id, enabled, updated_by, updated_at)
       VALUES ($1, $2, FALSE, $3, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET enabled = FALSE, escalation_on_failure = $4, updated_by = $3, updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query553(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_runtime_config WHERE tenant_id = $1 ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query554(schema, args) {
        const query = `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'completed') AS succeeded,
         COUNT(*) FILTER (WHERE status = 'failed') AS failed,
         AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at)) * 1000) AS avg_ms,
         MAX(created_at) AS last_run
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND agent_id = $2 AND created_at > NOW() - ($3 || ' hours')::interval`;
        return safeQuery(query, args);
    }
    static async query555(schema, args) {
        const query = `UPDATE "${schema}".agent_runs SET status = 'cancelled', completed_at = NOW()
       WHERE run_id = $1 AND tenant_id = $2 AND status = 'running' RETURNING run_id`;
        return safeQuery(query, args);
    }
    static async query556(schema, args) {
        const query = `SELECT r.run_id, r.agent_id, r.created_at AS started_at,
              EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 AS duration_ms,
              COALESCE(c.stuck_threshold_ms, 300000) AS threshold_ms
       FROM "${schema}".agent_runs r
       LEFT JOIN "${schema}".agent_runtime_config c ON c.tenant_id = r.tenant_id AND c.agent_id = r.agent_id
       WHERE r.tenant_id = $1 AND r.status = 'running'
         AND EXTRACT(EPOCH FROM (NOW() - r.created_at)) * 1000 > COALESCE(c.stuck_threshold_ms, 300000)`;
        return safeQuery(query, args);
    }
    static async query557(schema, args) {
        const query = `INSERT INTO "${schema}".agent_runtime_config
         (tenant_id, agent_id, enabled, max_retries, retry_delay_ms, cooldown_seconds, escalation_on_failure, stuck_threshold_ms, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET
         enabled = COALESCE($3, agent_runtime_config.enabled),
         max_retries = COALESCE($4, agent_runtime_config.max_retries),
         retry_delay_ms = COALESCE($5, agent_runtime_config.retry_delay_ms),
         cooldown_seconds = COALESCE($6, agent_runtime_config.cooldown_seconds),
         escalation_on_failure = COALESCE($7, agent_runtime_config.escalation_on_failure),
         stuck_threshold_ms = COALESCE($8, agent_runtime_config.stuck_threshold_ms),
         updated_by = $9, updated_at = NOW()
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query558(schema, args) {
        const query = `INSERT INTO "${schema}".agent_runtime_config (tenant_id, agent_id, enabled, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (tenant_id, agent_id) DO UPDATE SET enabled = $3, updated_by = $4, updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query559(schema, args) {
        const query = `SELECT MAX(completed_at) AS last_completed
       FROM "${schema}".agent_runs
       WHERE tenant_id = $1 AND agent_id = $2 AND status IN ('completed','failed')`;
        return safeQuery(query, args);
    }
    static async query560(schema, args) {
        const query = `SELECT * FROM "${schema}".agent_runtime_config WHERE tenant_id = $1 AND agent_id = $2`;
        return safeQuery(query, args);
    }
    static async query561(schema, args) {
        const query = `SELECT approval_id, approver_id, step_id, sla_deadline
       FROM "${schema}".approvals
       WHERE status = 'pending' AND sla_deadline IS NOT NULL AND sla_deadline < NOW()
       ORDER BY sla_deadline ASC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query562(schema, args) {
        const query = `SELECT compliance_score FROM "${schema}".kpi_snapshots
       ORDER BY snapshot_date DESC LIMIT 7`;
        return safeQuery(query, args);
    }
    static async query563(schema, args) {
        const query = `SELECT connector_id, source_system_type, failure_count, last_success_at
       FROM "${schema}".connector_configs
       WHERE failure_count > 2 OR (last_success_at IS NOT NULL AND last_success_at < NOW() - INTERVAL '24 hours')`;
        return safeQuery(query, args);
    }
    static async query564(schema, args) {
        const query = `SELECT assessment_id, title, updated_at FROM "${schema}".assessments
       WHERE status = 'in_progress' ORDER BY updated_at ASC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query565(schema, args) {
        const query = `SELECT risk_id, title, risk_score FROM "${schema}".risks
       WHERE risk_score >= 20 AND status != 'mitigated'
       ORDER BY risk_score DESC LIMIT 5`;
        return safeQuery(query, args);
    }
    static async query566(schema, args) {
        const query = `SELECT task_id, title, due_date FROM "${schema}".remediation_tasks
       WHERE status NOT IN ('completed', 'done') AND due_date < $1
       ORDER BY due_date ASC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query567(schema, args) {
        const query = `SELECT evidence_id, title, expiry_date FROM "${schema}".evidence
       WHERE expiry_date IS NOT NULL AND expiry_date <= $1 AND expiry_date >= $2
       ORDER BY expiry_date ASC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query568(schema, args) {
        const query = `SELECT control_id, title, status, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE mapped_registry_nodes && $1`;
        return safeQuery(query, args);
    }
    static async query569(schema, args) {
        const query = `SELECT node_id, code, title_en, title_ar, priority
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order`;
        return safeQuery(query, args);
    }
    static async query570(schema, args) {
        const query = `SELECT * FROM instruments WHERE instrument_id = $1`;
        return safeQuery(query, args);
    }
    static async query571(schema, args) {
        const query = `SELECT * FROM "${schema}".incidents WHERE incident_id = $1`;
        return safeQuery(query, args);
    }
    static async query572(schema, args) {
        const query = `SELECT control_id, title, status, test_status, last_tested_at, evidence_ids, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks)
     ORDER BY control_id`;
        return safeQuery(query, args);
    }
    static async query573(schema, args) {
        const query = `SELECT name_en, name_ar FROM instruments WHERE instrument_id = $1`;
        return safeQuery(query, args);
    }
    static async query574(schema, args) {
        const query = `SELECT org_name, industry FROM tenants WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query575(schema, args) {
        const query = `SELECT control_id, title, status, test_status, mapped_registry_nodes
     FROM "${schema}".controls
     WHERE $1 = ANY(frameworks) OR mapped_registry_nodes && $2`;
        return safeQuery(query, args);
    }
    static async query576(schema, args) {
        const query = `SELECT node_id, code, title_en, title_ar, priority, evidence_types
     FROM instrument_structure
     WHERE instrument_id = $1 AND level >= 4
     ORDER BY sort_order, code`;
        return safeQuery(query, args);
    }
    static async query577(schema, args) {
        const query = `SELECT * FROM "${schema}".risks WHERE risk_id = $1`;
        return safeQuery(query, args);
    }
    static async query578(schema, args) {
        const query = `SELECT success_metric, min_sample_size FROM "${schema}".agent_ab_tests
     WHERE id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query579(schema, args) {
        const query = `SELECT variant,
            COUNT(*)::int AS total_runs,
            COUNT(CASE WHEN success THEN 1 END)::int AS success_count,
            COUNT(CASE WHEN NOT success THEN 1 END)::int AS failure_count,
            AVG(latency_ms)::int AS avg_latency,
            SUM(cost_usd)::real AS total_cost,
            AVG(user_satisfaction_score)::real AS avg_satisfaction
     FROM "${schema}".ab_test_results
     WHERE test_id = $1 AND tenant_id = $2
     GROUP BY variant`;
        return safeQuery(query, args);
    }
    static async query580(schema, args) {
        const query = `SELECT success_metric FROM "${schema}".agent_ab_tests
     WHERE id = $1 AND tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query581(schema, args) {
        const query = `INSERT INTO "${schema}".ab_test_results
     (test_id, tenant_id, variant, success, latency_ms, cost_usd,
      user_satisfaction_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`;
        return safeQuery(query, args);
    }
    static async query582(schema, args) {
        const query = `INSERT INTO "${schema}".ab_test_assignments
     (test_id, tenant_id, user_id, session_id, variant, assigned_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`;
        return safeQuery(query, args);
    }
    static async query583(schema, args) {
        const query = `SELECT split_ratio FROM "${schema}".agent_ab_tests
     WHERE id = $1 AND tenant_id = $2 AND status = 'active'`;
        return safeQuery(query, args);
    }
    static async query584(schema, args) {
        const query = `SELECT variant FROM "${schema}".ab_test_assignments
     WHERE test_id = $1 AND tenant_id = $2
       AND (($3 IS NOT NULL AND user_id = $3) OR ($4 IS NOT NULL AND session_id = $4))
     LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query585(schema, args) {
        const query = `INSERT INTO "${schema}".agent_ab_tests
     (id, name, agent_id, variant_a_json, variant_b_json, split_ratio,
      status, start_date, end_date, min_sample_size, success_metric, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       agent_id = EXCLUDED.agent_id,
       variant_a_json = EXCLUDED.variant_a_json,
       variant_b_json = EXCLUDED.variant_b_json,
       split_ratio = EXCLUDED.split_ratio,
       status = EXCLUDED.status,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       min_sample_size = EXCLUDED.min_sample_size,
       success_metric = EXCLUDED.success_metric,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query586(schema, args) {
        const query = `SELECT
         f.agent_id,
         AVG(f.rating)::real AS avg_user_rating,
         AVG(e.score)::real AS avg_eval_score,
         COUNT(DISTINCT f.feedback_id)::int AS feedback_count
       FROM "${schema}".agent_user_feedback f
       LEFT JOIN "${schema}".agent_eval_scores e
         ON f.agent_id = e.agent_id AND f.run_id = e.run_id
       WHERE f.tenant_id = $1
         AND f.created_at > NOW() - make_interval(days => $2)
       GROUP BY f.agent_id
       ORDER BY f.agent_id`;
        return safeQuery(query, args);
    }
    static async query587(schema, args) {
        const query = distQ;
        return safeQuery(query, args);
    }
    static async query588(schema, args) {
        const query = q;
        return safeQuery(query, args);
    }
    static async query589(schema, args) {
        const query = `INSERT INTO "${schema}".agent_user_feedback
         (tenant_id, user_id, agent_id, run_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query590(schema, args) {
        const query = `INSERT INTO "${schema}".notifications
           (tenant_id, type, title, message, severity, created_at)
         VALUES ($1, 'ai_eval_slo_breach', 'AI Quality SLO Breach Detected',
                 $2, 'warning', NOW())`;
        return safeQuery(query, args);
    }
    static async query591(schema, args) {
        const query = q;
        return safeQuery(query, args);
    }
    static async query592(schema, args) {
        const query = `SELECT inputs_ref, outputs_ref FROM "${schema}".agent_steps
         WHERE run_id = $1 AND status = 'done' LIMIT 3`;
        return safeQuery(query, args);
    }
    static async query593(schema, args) {
        const query = `SELECT run_id, agent_id, summary FROM "${schema}".agent_runs
       WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT $1`;
        return safeQuery(query, args);
    }
    static async query594(schema, args) {
        const query = `INSERT INTO "${schema}".agent_eval_scores
         (tenant_id, agent_id, run_id, eval_type, score, judge_model,
          sample_input, sample_output, reasoning)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query595(schema, args) {
        const query = `SELECT 
        DATE_TRUNC('day', started_at) as date,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks
       FROM "${schema}".agent_tasks
       WHERE started_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', started_at)
       ORDER BY date ASC`;
        return safeQuery(query, args);
    }
    static async query596(schema, args) {
        const query = `SELECT DISTINCT agent_id FROM "${schema}".agent_tasks WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query597(schema, args) {
        const query = `SELECT MAX(started_at) as last_activity FROM "${schema}".agent_tasks WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query598(schema, args) {
        const query = `SELECT error, started_at FROM "${schema}".agent_tasks
       WHERE agent_id = $1 AND status = 'failed' AND started_at > NOW() - INTERVAL '7 days'
       ORDER BY started_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query599(schema, args) {
        const query = `SELECT DISTINCT agent_id FROM "${schema}".agent_tasks WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query600(schema, args) {
        const query = `SELECT MAX(created_at) as last_event FROM "${schema}".agent_learning_events WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query601(schema, args) {
        const query = `SELECT COUNT(*) as count FROM "${schema}".agent_lessons_learned WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query602(schema, args) {
        const query = `SELECT pattern, event_type, COUNT(*) as count
       FROM "${schema}".agent_learning_events
       WHERE agent_id = $1 AND pattern IS NOT NULL
       GROUP BY pattern, event_type`;
        return safeQuery(query, args);
    }
    static async query603(schema, args) {
        const query = `SELECT skill_level, created_at
           FROM "${schema}".agent_learning_events
           WHERE agent_id = $1 AND skill_name = $2 AND skill_level IS NOT NULL
           AND created_at >= NOW() - INTERVAL '30 days'
           ORDER BY created_at ASC`;
        return safeQuery(query, args);
    }
    static async query604(schema, args) {
        const query = `SELECT skill_name, MAX(skill_level) as max_level, COUNT(*) as experience_points,
              MAX(created_at) as last_improved_at
       FROM "${schema}".agent_learning_events
       WHERE agent_id = $1 AND skill_name IS NOT NULL
       GROUP BY skill_name`;
        return safeQuery(query, args);
    }
    static async query605(schema, args) {
        const query = `SELECT 
        DATE_TRUNC($1, started_at) as period_start,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed' OR status = 'verified') as completed_tasks,
        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_tasks,
        AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration_ms
       FROM "${schema}".agent_tasks
       WHERE agent_id = $2 AND started_at > NOW() - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC($1, started_at)
       ORDER BY period_start ASC`;
        return safeQuery(query, args);
    }
    static async query606(schema, args) {
        const query = `INSERT INTO "${schema}".agent_learning_events (
        tenant_id, agent_id, event_type, metric, value, pattern, skill_name, skill_level, context, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`;
        return safeQuery(query, args);
    }
    static async query607(schema, args) {
        const query = `SELECT lesson_id, tenant_id, agent_id, category, title, description, context,
              outcome, impact, applicable_scenarios, confidence, learned_at,
              verified, applied_count, last_applied_at
       FROM "${schema}".agent_lessons_learned
       WHERE agent_id = $1 AND ($2 = ANY(applicable_scenarios) OR applicable_scenarios = '{}')
       ORDER BY verified DESC, confidence DESC, applied_count DESC
       LIMIT $3`;
        return safeQuery(query, args);
    }
    static async query608(schema, args) {
        const query = `UPDATE "${schema}".agent_lessons_learned SET verified = true WHERE lesson_id = $1`;
        return safeQuery(query, args);
    }
    static async query609(schema, args) {
        const query = `SELECT applied_count FROM "${schema}".agent_lessons_learned WHERE lesson_id = $1`;
        return safeQuery(query, args);
    }
    static async query610(schema, args) {
        const query = `UPDATE "${schema}".agent_lessons_learned
       SET applied_count = applied_count + 1, last_applied_at = NOW()
       WHERE lesson_id = $1`;
        return safeQuery(query, args);
    }
    static async query611(schema, args) {
        const query = `INSERT INTO "${schema}".agent_lesson_applications (
        application_id, lesson_id, agent_id, run_id, scenario, outcome, notes, applied_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`;
        return safeQuery(query, args);
    }
    static async query612(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query613(schema, args) {
        const query = `INSERT INTO "${schema}".agent_lessons_learned (
        lesson_id, tenant_id, agent_id, category, title, description, context,
        outcome, impact, applicable_scenarios, confidence, learned_at, verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), false)`;
        return safeQuery(query, args);
    }
    static async query614(schema, args) {
        const query = `SELECT org_name, industry, org_size, regions FROM tenants WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query615(schema, args) {
        const query = `UPDATE users SET onboarding_complete=TRUE, updated_at=NOW() WHERE user_id=$1`;
        return safeQuery(query, args);
    }
    static async query616(schema, args) {
        const query = `INSERT INTO "${schema}".controls (control_id, title, description, frameworks, automatable)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (control_id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, frameworks = EXCLUDED.frameworks
         WHERE (controls.title, controls.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`;
        return safeQuery(query, args);
    }
    static async query617(schema, args) {
        const query = `INSERT INTO "${schema}".policies (policy_id, title, content, frameworks, owner)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (policy_id) DO UPDATE SET
           title = EXCLUDED.title, content = EXCLUDED.content, frameworks = EXCLUDED.frameworks
         WHERE (policies.title, policies.content) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.content)`;
        return safeQuery(query, args);
    }
    static async query618(schema, args) {
        const query = `INSERT INTO "${schema}".risks (risk_id, title, description, category, likelihood, impact)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (risk_id) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description, category = EXCLUDED.category,
           likelihood = EXCLUDED.likelihood, impact = EXCLUDED.impact
         WHERE (risks.title, risks.description) IS DISTINCT FROM (EXCLUDED.title, EXCLUDED.description)`;
        return safeQuery(query, args);
    }
    static async query619(schema, args) {
        const query = `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, total_controls)
         VALUES ($1,$2,$3,'security',$4)
         ON CONFLICT (framework_id) DO UPDATE SET
           name = EXCLUDED.name, description = EXCLUDED.description, total_controls = EXCLUDED.total_controls
         WHERE (frameworks.name, frameworks.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`;
        return safeQuery(query, args);
    }
    static async query620(schema, args) {
        const query = `INSERT INTO "${schema}".frameworks (framework_id, name, description, category, total_controls)
             VALUES ($1, $2, $3, 'security', 0)
             ON CONFLICT (framework_id) DO UPDATE SET
               name = EXCLUDED.name, description = EXCLUDED.description
             WHERE (frameworks.name, frameworks.description) IS DISTINCT FROM (EXCLUDED.name, EXCLUDED.description)`;
        return safeQuery(query, args);
    }
    static async query621(schema, args) {
        const query = `UPDATE tenants SET active_frameworks = $1 WHERE tenant_id = $2`;
        return safeQuery(query, args);
    }
    static async query622(schema, args) {
        const query = `UPDATE tenants SET org_name=$1, industry=$2, org_size=$3, regions=$4, status='active', updated_at=NOW() WHERE tenant_id=$5`;
        return safeQuery(query, args);
    }
    static async query623(schema, args) {
        const query = `SELECT tenant_id FROM tenants WHERE deleted_at IS NULL AND status = 'active'`;
        return safeQuery(query, args);
    }
    static async query624(schema, args) {
        const query = `SELECT content, metadata FROM "${schema}".agent_memories
       WHERE tenant_id = $1 AND agent_id = $2 AND memory_type = 'tool'
         AND is_deleted = FALSE AND metadata->>'type' = 'self_reflection'
       ORDER BY created_at DESC LIMIT 3`;
        return safeQuery(query, args);
    }
    static async query625(schema, args) {
        const query = `SELECT eval_type, score, reasoning FROM "${schema}".agent_eval_scores
       WHERE agent_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 15`;
        return safeQuery(query, args);
    }
    static async query626(schema, args) {
        const query = `SELECT run_id, status, summary, actions_proposed, actions_executed, duration_ms, created_at
       FROM "${schema}".agent_runs
       WHERE agent_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at DESC LIMIT 10`;
        return safeQuery(query, args);
    }
    static async query627(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".integration_logs
         WHERE status = 'error'
           AND created_at > NOW() - INTERVAL '24 hours'`;
        return safeQuery(query, args);
    }
    static async query628(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".report_schedules
       WHERE enabled = TRUE
         AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '7 days')`;
        return safeQuery(query, args);
    }
    static async query629(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".vendor_sla_measurements
         WHERE is_breached = TRUE
           AND period_end > NOW() - INTERVAL '30 days'`;
        return safeQuery(query, args);
    }
    static async query630(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".vendors
       WHERE contract_end_date IS NOT NULL
         AND contract_end_date <= NOW() + INTERVAL '60 days'
         AND contract_end_date > NOW()
         AND status = 'active'`;
        return safeQuery(query, args);
    }
    static async query631(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".policies
       WHERE status = 'pending_approval'
         AND created_at < NOW() - INTERVAL '7 days'`;
        return safeQuery(query, args);
    }
    static async query632(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".policies
       WHERE review_date IS NOT NULL
         AND review_date <= NOW() + INTERVAL '30 days'
         AND status = 'approved'`;
        return safeQuery(query, args);
    }
    static async query633(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".risks
       WHERE risk_score IS NULL AND status != 'closed'`;
        return safeQuery(query, args);
    }
    static async query634(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".compliance_gaps
       WHERE status = 'open' AND due_date < NOW()`;
        return safeQuery(query, args);
    }
    static async query635(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence e
         WHERE e.linked_entity_id = c.id AND e.status != 'archived'
       )`;
        return safeQuery(query, args);
    }
    static async query636(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence e
         WHERE e.linked_entity_id = c.id
       )`;
        return safeQuery(query, args);
    }
    static async query637(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls
       WHERE mapped_frameworks IS NULL OR mapped_frameworks = '[]'::jsonb`;
        return safeQuery(query, args);
    }
    static async query638(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".access_reviews
         WHERE last_reviewed_at < NOW() - INTERVAL '90 days'
           OR last_reviewed_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query639(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM users
       WHERE tenant_id = $1
         AND (mfa_enabled = FALSE OR mfa_enabled IS NULL)
         AND role != 'viewer'`;
        return safeQuery(query, args);
    }
    static async query640(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM "${schema}".frameworks WHERE deleted_at IS NULL`;
        return safeQuery(query, args);
    }
    static async query641(schema, args) {
        const query = `SELECT COUNT(*)::int AS n FROM tenants
       WHERE tenant_id = $1
         AND (org_type IS NULL OR primary_sector_id IS NULL OR grc_maturity_level IS NULL)`;
        return safeQuery(query, args);
    }
    static async query642(schema, args) {
        const query = `SELECT agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures
       FROM "${schema}".agent_circuit_breaker
       ORDER BY agent_id`;
        return safeQuery(query, args);
    }
    static async query643(schema, args) {
        const query = `INSERT INTO "${schema}".agent_circuit_breaker
     (agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (agent_id) DO UPDATE SET
       state = EXCLUDED.state,
       failure_count = EXCLUDED.failure_count,
       success_count = EXCLUDED.success_count,
       last_failure_at = EXCLUDED.last_failure_at,
       last_success_at = EXCLUDED.last_success_at,
       opened_at = EXCLUDED.opened_at,
       total_calls = EXCLUDED.total_calls,
       total_failures = EXCLUDED.total_failures,
       updated_at = NOW()`;
        return safeQuery(query, args);
    }
    static async query644(schema, args) {
        const query = `SELECT agent_id, state, failure_count, success_count, last_failure_at, last_success_at, opened_at, total_calls, total_failures
       FROM "${schema}".agent_circuit_breaker
       WHERE agent_id = $1`;
        return safeQuery(query, args);
    }
    static async query645(schema, args) {
        const query = `SELECT alert_type, COUNT(*)::int AS cnt
         FROM "${schema}".ai_alerts WHERE tenant_id = $1
         GROUP BY alert_type`;
        return safeQuery(query, args);
    }
    static async query646(schema, args) {
        const query = `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
           COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating,
           COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
           COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
           COUNT(*) FILTER (WHERE severity = 'info')::int AS sev_info,
           COUNT(*) FILTER (WHERE severity = 'warning')::int AS sev_warning,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS sev_critical
         FROM "${schema}".ai_alerts WHERE tenant_id = $1`;
        return safeQuery(query, args);
    }
    static async query647(schema, args) {
        const query = `UPDATE "${schema}".ai_alerts
       SET status = 'dismissed', resolved_by = $3, resolved_at = now()
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id`;
        return safeQuery(query, args);
    }
    static async query648(schema, args) {
        const query = `UPDATE "${schema}".ai_alerts
       SET escalation_level = escalation_level + 1, status = 'investigating'
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id, escalation_level`;
        return safeQuery(query, args);
    }
    static async query649(schema, args) {
        const query = `UPDATE "${schema}".ai_alerts
       SET status = 'resolved', resolved_by = $3, resolved_at = now(), auto_resolved = $4
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id`;
        return safeQuery(query, args);
    }
    static async query650(schema, args) {
        const query = `UPDATE "${schema}".ai_alerts
       SET status = 'acknowledged', acknowledged_by = $3, acknowledged_at = now()
       WHERE alert_id = $1 AND tenant_id = $2 AND status = 'open'
       RETURNING alert_id`;
        return safeQuery(query, args);
    }
    static async query651(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_alerts
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query652(schema, args) {
        const query = `SELECT COUNT(*)::int AS total FROM "${schema}".ai_alerts WHERE ${where}`;
        return safeQuery(query, args);
    }
    static async query653(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_alerts WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
        return safeQuery(query, args);
    }
    static async query654(schema, args) {
        const query = `INSERT INTO "${schema}".ai_alerts
         (tenant_id, source_type, source_id, entity_type, entity_id,
          alert_type, title, description, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`;
        return safeQuery(query, args);
    }
    static async query655(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'ai_audit_anomaly_report'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query656(schema, args) {
        const query = `SELECT user_id, permission_code, COUNT(*) AS cnt
       FROM "${schema}".role_usage_audit
       WHERE result = 'allowed'
         AND created_at > NOW() - make_interval(hours => $1)
         AND permission_code LIKE '%:delete'
       GROUP BY user_id, permission_code
       HAVING COUNT(*) > 10
       ORDER BY cnt DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query657(schema, args) {
        const query = `SELECT user_id, COUNT(DISTINCT permission_code) AS new_perms
       FROM "${schema}".role_usage_audit
       WHERE result = 'allowed'
         AND created_at > NOW() - make_interval(hours => $1)
         AND permission_code NOT IN (
           SELECT DISTINCT permission_code FROM "${schema}".role_usage_audit
           WHERE result = 'allowed'
             AND created_at BETWEEN NOW() - make_interval(hours => $2) AND NOW() - make_interval(hours => $1)
             AND user_id = role_usage_audit.user_id
         )
       GROUP BY user_id
       HAVING COUNT(DISTINCT permission_code) > 5
       ORDER BY new_perms DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query658(schema, args) {
        const query = `SELECT user_id, COUNT(*) AS denied_count
       FROM "${schema}".role_usage_audit
       WHERE result = 'denied' AND created_at > NOW() - make_interval(hours => $1)
       GROUP BY user_id
       HAVING COUNT(*) > 20
       ORDER BY denied_count DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query659(schema, args) {
        const query = `SELECT user_id, COUNT(*) AS cnt
       FROM "${schema}".role_usage_audit
       WHERE created_at > NOW() - make_interval(hours => $1)
         AND EXTRACT(HOUR FROM created_at) NOT BETWEEN 6 AND 22
       GROUP BY user_id
       HAVING COUNT(*) > 10
       ORDER BY cnt DESC LIMIT 50`;
        return safeQuery(query, args);
    }
    static async query660(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('ai_audit_anomaly_report', $1, $2, 'platform')`;
        return safeQuery(query, args);
    }
    static async query661(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query662(schema, args) {
        const query = `WITH control_counts AS (
       SELECT 
         COUNT(*)::int AS total_controls,
         COUNT(*) FILTER (WHERE compliance_status != 'not_applicable')::int AS applicable_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'compliant')::int AS compliant_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'partial')::int AS partial_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'non_compliant')::int AS non_compliant_controls,
         COUNT(*) FILTER (WHERE compliance_status = 'not_assessed')::int AS not_assessed_controls,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'critical')::int AS critical_gaps,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'high')::int AS high_priority_gaps,
         COUNT(*) FILTER (WHERE gap_identified = TRUE AND violation_severity = 'medium')::int AS medium_priority_gaps,
         COUNT(*) FILTER (WHERE remediation_required = TRUE AND remediation_status = 'in_progress')::int AS remediation_in_progress,
         COUNT(*) FILTER (WHERE remediation_required = TRUE AND remediation_status = 'completed')::int AS remediation_completed
       FROM "${schema}".ai_compliance_framework_mapping
       WHERE system_id = $1 AND framework_code = $2
     )
     SELECT 
       total_controls,
       applicable_controls,
       compliant_controls,
       partial_controls,
       non_compliant_controls,
       not_assessed_controls,
       CASE WHEN applicable_controls > 0 THEN (compliant_controls::decimal / applicable_controls * 100) ELSE 0 END AS compliance_percentage,
       CASE WHEN total_controls > 0 THEN (applicable_controls::decimal / total_controls * 100) ELSE 0 END AS coverage_percentage,
       critical_gaps,
       high_priority_gaps,
       medium_priority_gaps,
       remediation_in_progress,
       remediation_completed
     FROM control_counts`;
        return safeQuery(query, args);
    }
    static async query663(schema, args) {
        const query = `INSERT INTO "${schema}".ai_framework_risk_classifications 
     (system_id, model_version_id, framework_code, risk_category, classification_answers,
      requirements_applicable, classified_by, classified_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query664(schema, args) {
        const query = `UPDATE "${schema}".ai_compliance_framework_mapping 
     SET compliance_status = $1, assessor_id = $2, compliance_notes = $3,
         evidence_ids = $4, gap_identified = $5, gap_description = $6,
         last_assessed_at = NOW(), next_assessment_due = CURRENT_DATE + INTERVAL '1 year',
         updated_at = NOW()
     WHERE mapping_id = $7
     RETURNING mapping_id`;
        return safeQuery(query, args);
    }
    static async query665(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query666(schema, args) {
        const query = `INSERT INTO "${schema}".ai_compliance_framework_mapping 
     (system_id, model_version_id, framework_code, framework_version, control_code,
      control_title, control_description, compliance_status, evidence_ids, assessor_id, last_assessed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (system_id, framework_code, control_code) 
     DO UPDATE SET 
       compliance_status = EXCLUDED.compliance_status,
       evidence_ids = EXCLUDED.evidence_ids,
       assessor_id = EXCLUDED.assessor_id,
       last_assessed_at = NOW(),
       updated_at = NOW()
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query667(schema, args) {
        const query = `INSERT INTO public.control_cross_mappings
        (source_control_code, target_control_code, mapping_type, confidence)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`;
        return safeQuery(query, args);
    }
    static async query668(schema, args) {
        const query = `SELECT source_control_code, target_control_code
     FROM public.control_cross_mappings
     WHERE source_control_code LIKE $1 || '%'
       AND target_control_code LIKE $2 || '%'`;
        return safeQuery(query, args);
    }
    static async query669(schema, args) {
        const query = `SELECT rc.control_code, rc.control_title_en, rc.control_description_en,
            rc.criticality_level, cd.domain_name_en
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = $1
     ORDER BY rc.control_code`;
        return safeQuery(query, args);
    }
    static async query670(schema, args) {
        const query = `SELECT rc.control_code, rc.control_title_en, rc.control_description_en,
            rc.criticality_level, cd.domain_name_en
     FROM public.regulatory_controls rc
     JOIN public.control_domains cd ON cd.id = rc.domain_id
     WHERE cd.framework_code = $1
     ORDER BY rc.control_code`;
        return safeQuery(query, args);
    }
    static async query671(schema, args) {
        const query = `SELECT * FROM "${schema}".ai_dpia_risk_factors 
     WHERE dpia_id = $1 
     ORDER BY severity DESC, created_at ASC`;
        return safeQuery(query, args);
    }
    static async query672(schema, args) {
        const query = `SELECT dpia_id, system_id, assessment_status, next_review_date, 
            s.system_name
     FROM "${schema}".ai_dpia_assessments d
     LEFT JOIN "${schema}".ai_system_registry s ON d.system_id = s.id
     WHERE (assessment_status = 'in_review' OR 
            (next_review_date IS NOT NULL AND next_review_date <= CURRENT_DATE + INTERVAL '30 days'))
     ORDER BY next_review_date ASC NULLS LAST, created_at DESC`;
        return safeQuery(query, args);
    }
    static async query673(schema, args) {
        const query = query;
        return safeQuery(query, args);
    }
    static async query674(schema, args) {
        const query = `UPDATE "${schema}".ai_dpia_assessments 
     SET assessment_status = $1, reviewer_id = $2, reviewer_role = $3, 
         approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
         approval_notes = $4, updated_at = NOW()
     WHERE dpia_id = $5 AND assessment_status = 'in_review'
     RETURNING dpia_id`;
        return safeQuery(query, args);
    }
    static async query675(schema, args) {
        const query = `UPDATE "${schema}".ai_dpia_assessments 
     SET assessment_status = 'in_review', updated_at = NOW()
     WHERE dpia_id = $1 AND assessment_status = 'draft'
     RETURNING dpia_id`;
        return safeQuery(query, args);
    }
    static async query676(schema, args) {
        const query = `INSERT INTO "${schema}".ai_dpia_risk_factors 
     (dpia_id, factor_type, factor_description, likelihood, impact, severity, mitigation_applied)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query677(schema, args) {
        const query = `INSERT INTO "${schema}".ai_dpia_assessments 
     (system_id, assessment_status, data_types_processed, processing_purpose, legal_basis,
      data_subjects_affected, data_subject_count_estimate, data_retention_period_days,
      cross_border_transfers, transfer_destinations, automated_decision_making, profiling_enabled,
      ai_model_used, privacy_risk_score, risk_analysis, mitigation_measures, residual_risk_level,
      pdpl_compliance_checks, pdpl_compliant, next_review_date, review_frequency, created_by)
     VALUES ($1, 'draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 
             CURRENT_DATE + INTERVAL '1 year', 'annual', $19)
     RETURNING *`;
        return safeQuery(query, args);
    }
    static async query678(schema, args) {
        const query = `SELECT MAX(created_at) AS last_run FROM "${schema}".agrc_event_log WHERE event_type = 'rbac_drift_result'`;
        return safeQuery(query, args);
    }
    static async query679(schema, args) {
        const query = `SELECT table_name, MAX(created_at) AS last_change
       FROM "${schema}".rbac_config_audit
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY table_name`;
        return safeQuery(query, args);
    }
    static async query680(schema, args) {
        const query = `SELECT module_code, path, method FROM "${schema}".route_catalog WHERE is_active = true AND (required_permissions IS NULL OR required_permissions = '[]'::jsonb)`;
        return safeQuery(query, args);
    }
    static async query681(schema, args) {
        const query = `SELECT module_code FROM "${schema}".module_activation_rules WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query682(schema, args) {
        const query = `SELECT DISTINCT module_code FROM "${schema}".module_sod_rules WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query683(schema, args) {
        const query = `SELECT DISTINCT module_code FROM "${schema}".module_actions WHERE is_active = true AND sod_sensitive = true`;
        return safeQuery(query, args);
    }
    static async query684(schema, args) {
        const query = `SELECT dashboard_code FROM "${schema}".dashboard_layouts WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query685(schema, args) {
        const query = `SELECT module_code, metadata FROM "${schema}".module_activation_rules WHERE is_active = true AND metadata->>'dashboardPresets' IS NOT NULL`;
        return safeQuery(query, args);
    }
    static async query686(schema, args) {
        const query = `SELECT DISTINCT module_code FROM "${schema}".module_role_definitions WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query687(schema, args) {
        const query = `SELECT permission_code, module_code FROM "${schema}".module_permissions WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query688(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'rbac_drift_result'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query689(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('rbac_drift_result', $1, $2, 'platform')`;
        return safeQuery(query, args);
    }
    static async query690(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('rbac_drift_report', $1, $2, 'platform')`;
        return safeQuery(query, args);
    }
    static async query691(schema, args) {
        const query = `SELECT payload, created_at FROM "${schema}".agrc_event_log
       WHERE event_type = 'security_posture_result'
         AND created_at > NOW() - make_interval(days => $1)
       ORDER BY created_at ASC
       LIMIT 100`;
        return safeQuery(query, args);
    }
    static async query692(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_ownership_rules WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query693(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_approval_matrices WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query694(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_sod_rules WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query695(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_actions WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query696(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_permissions WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query697(schema, args) {
        const query = `SELECT 1 FROM "${schema}".module_role_definitions WHERE module_code = $1 AND is_active = true LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query698(schema, args) {
        const query = `SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_approval_matrices WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query699(schema, args) {
        const query = `SELECT COUNT(*) as cnt FROM "${schema}".agrc_event_log WHERE created_at > NOW() - INTERVAL '7 days'`;
        return safeQuery(query, args);
    }
    static async query700(schema, args) {
        const query = `SELECT COUNT(*) as cnt FROM "${schema}".rbac_config_audit WHERE created_at > NOW() - INTERVAL '7 days'`;
        return safeQuery(query, args);
    }
    static async query701(schema, args) {
        const query = `SELECT COUNT(*) as cnt FROM "${schema}".module_sod_rules WHERE is_active = true AND enforcement_mode = 'block'`;
        return safeQuery(query, args);
    }
    static async query702(schema, args) {
        const query = `SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_sod_rules WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query703(schema, args) {
        const query = `SELECT COUNT(*) as cnt FROM "${schema}".module_role_permission_bindings WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query704(schema, args) {
        const query = `SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_permissions WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query705(schema, args) {
        const query = `SELECT COUNT(DISTINCT module_code) as cnt FROM "${schema}".module_role_definitions WHERE is_active = true`;
        return safeQuery(query, args);
    }
    static async query706(schema, args) {
        const query = `SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'security_posture_result'
       ORDER BY created_at DESC LIMIT 1`;
        return safeQuery(query, args);
    }
    static async query707(schema, args) {
        const query = `INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('security_posture_result', $1, 'info', 'platform')`;
        return safeQuery(query, args);
    }
}
//# sourceMappingURL=auto-extracted.repo.js.map
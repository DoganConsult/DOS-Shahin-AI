// ============================================
// AI Post-Market Monitoring Service — Phase 5, Step 5.2
// EU AI Act Art. 72-73, ISO 42001 Cl. 9, NIST AI RMF
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

// 1. createMonitoringPlan
export async function createMonitoringPlan(
  tenantId: string,
  plan: Record<string, unknown>,
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_monitoring_plans
       (system_id, plan_type, monitoring_frequency, metrics_tracked,
        threshold_config, alert_recipients, review_schedule, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      plan.system_id, plan.plan_type ?? 'continuous',
      plan.monitoring_frequency ?? null, plan.metrics_tracked ?? [],
      JSON.stringify(plan.threshold_config ?? {}), plan.alert_recipients ?? [],
      plan.review_schedule ?? null, 'active',
    ],
  );
  return { id: rows[0].id };
}

// 2. recordMetric — auto-check breach
export async function recordMetric(
  tenantId: string,
  metric: Record<string, unknown>,
): Promise<{ id: string; is_breach: boolean }> {
  const schema = tenantSchema(tenantId);
  const isBreach = metric.threshold_value != null && metric.metric_value < metric.threshold_value;

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_performance_metrics
       (system_id, plan_id, metric_name, metric_value, threshold_value,
        is_breach, measurement_period_start, measurement_period_end,
        data_points, confidence_interval, trend)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id`,
    [
      metric.system_id, metric.plan_id ?? null, metric.metric_name,
      metric.metric_value, metric.threshold_value ?? null,
      isBreach, metric.measurement_period_start, metric.measurement_period_end,
      metric.data_points ?? null, metric.confidence_interval ?? null,
      metric.trend ?? 'any',
    ],
  );

  if (isBreach) {
    await swallow(EC.EVENT_BUS, eventBus.publish({

      eventType: 'ai.metric.breach' as any, tenantId, sourceService: 'ai-post-market', severity: 'warning',
      payload: {
        system_id: metric.system_id,
        metric_name: metric.metric_name,
        value: metric.metric_value,
        threshold: metric.threshold_value,
      },
    }), { tenantId, operation: 'eventBus:ai.metric.breach' });
  }

  return { id: rows[0].id, is_breach: isBreach };
}

// 3. checkThresholds
export async function checkThresholds(
  tenantId: string,
  systemId: string,
): Promise<{ breaches: Record<string, unknown>[]; total_metrics: number }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT m.*, p.threshold_config
     FROM "${schema}".ai_performance_metrics m
     LEFT JOIN "${schema}".ai_monitoring_plans p ON m.plan_id = p.id
     WHERE m.system_id = $1 AND m.is_breach = TRUE
     ORDER BY m.created_at DESC LIMIT 50`,
    [systemId],
  );

  const { rows: total } = await safeQuery(
    `SELECT count(*) as cnt FROM "${schema}".ai_performance_metrics WHERE system_id = $1`,
    [systemId],
  );

  return { breaches: rows, total_metrics: parseInt(total[0]?.cnt ?? '0') };
}

// 4. reportSeriousIncident — auto-compute deadline (72h safety / 15d other)
export async function reportSeriousIncident(
  tenantId: string,
  incident: Record<string, unknown>,
): Promise<{ id: string; report_deadline: string }> {
  const schema = tenantSchema(tenantId);
  const isSafety = incident.incident_type === 'safety';
  const deadlineInterval = isSafety ? "interval '72 hours'" : "interval '15 days'";
  const authorityRequired = ['high', 'critical'].includes((incident as any).severity);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_serious_incidents
       (system_id, incident_type, severity, description,
        affected_persons_count, harm_type, harm_description,
        root_cause, immediate_actions,
        authority_report_required, authority_name,
        report_deadline, corrective_action_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
             now() + ${deadlineInterval}, $12)
     RETURNING id, report_deadline`,
    [
      incident.system_id, incident.incident_type, incident.severity,
      incident.description, incident.affected_persons_count ?? null,
      incident.harm_type ?? null, incident.harm_description ?? null,
      incident.root_cause ?? null, incident.immediate_actions ?? null,
      authorityRequired, incident.authority_name ?? null,
      incident.corrective_action_ids ?? [],
    ],
  );

  await swallow(EC.EVENT_BUS, eventBus.publish({

    eventType: 'ai.serious_incident.reported' as any, tenantId, sourceService: 'ai-post-market', severity: 'critical',
    payload: { incident_id: rows[0].id, severity: incident.severity, type: incident.incident_type },
  }), { tenantId, operation: 'eventBus:ai.serious_incident.reported' });

  return { id: rows[0].id, report_deadline: rows[0].report_deadline };
}

// 5. generatePeriodicReport — bilingual
export async function generatePeriodicReport(
  tenantId: string,
  systemId: string,
  period: 'monthly' | 'quarterly' | 'annual' = 'monthly',
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const intervalMap = { monthly: '1 month', quarterly: '3 months', annual: '1 year' };
  const interval = intervalMap[period];

  const [system, metrics, incidents, complaints] = await Promise.all([
    safeQuery(`SELECT name_en, name_ar FROM "${schema}".ai_system_registry WHERE id = $1`, [systemId]),
    safeQuery(
      `SELECT metric_name, avg(metric_value) as avg_val, count(*) as cnt,
              sum(CASE WHEN is_breach THEN 1 ELSE 0 END) as breaches
       FROM "${schema}".ai_performance_metrics
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY metric_name`,
      [systemId],
    ),
    safeQuery(
      `SELECT count(*) as cnt, severity
       FROM "${schema}".ai_serious_incidents
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY severity`,
      [systemId],
    ),
    safeQuery(
      `SELECT count(*) as cnt, status
       FROM "${schema}".ai_user_complaints
       WHERE system_id = $1 AND created_at >= now() - interval '${interval}'
       GROUP BY status`,
      [systemId],
    ),
  ]);

  return {
    report_period: period,
    system_name_en: system.rows[0]?.name_en ?? 'Unknown',
    system_name_ar: system.rows[0]?.name_ar ?? '',
    title_en: `${period.charAt(0).toUpperCase() + period.slice(1)} Post-Market Monitoring Report`,
    title_ar: `تقرير مراقبة ما بعد السوق ${period === 'monthly' ? 'الشهري' : period === 'quarterly' ? 'الربعي' : 'السنوي'}`,
    metrics_summary: metrics.rows,
    incidents_summary: incidents.rows,
    complaints_summary: complaints.rows,
    generated_at: new Date().toISOString(),
  };
}

// 6. listMonitoringPlans
export async function listMonitoringPlans(
  tenantId: string,
  systemId?: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const where = systemId ? 'WHERE system_id = $1' : '';
  const params = systemId ? [systemId] : [];
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_monitoring_plans ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows;
}

// 7. getMonitoringPlanById
export async function getMonitoringPlanById(
  tenantId: string,
  planId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_monitoring_plans WHERE id = $1`,
    [planId],
  );
  return rows[0] ?? null;
}

// 8. listMetrics
export async function listMetrics(
  tenantId: string,
  filters?: { system_id?: string; is_breach?: boolean },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.system_id) { conditions.push(`system_id = $${idx++}`); params.push(filters.system_id); }
  if (filters?.is_breach !== undefined) { conditions.push(`is_breach = $${idx++}`); params.push(filters.is_breach); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_performance_metrics ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows;
}

// 9. listSeriousIncidents
export async function listSeriousIncidents(
  tenantId: string,
  filters?: { system_id?: string; severity?: string; report_status?: string },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.system_id) { conditions.push(`system_id = $${idx++}`); params.push(filters.system_id); }
  if (filters?.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
  if (filters?.report_status) { conditions.push(`report_status = $${idx++}`); params.push(filters.report_status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_serious_incidents ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows;
}

// 10. getSeriousIncidentById
export async function getSeriousIncidentById(
  tenantId: string,
  incidentId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_serious_incidents WHERE id = $1`,
    [incidentId],
  );
  return rows[0] ?? null;
}

// 11. listUserComplaints
export async function listUserComplaints(
  tenantId: string,
  filters?: { system_id?: string; status?: string },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.system_id) { conditions.push(`system_id = $${idx++}`); params.push(filters.system_id); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_user_complaints ${where} ORDER BY created_at DESC LIMIT 100`,
    params,
  );
  return rows;
}

// 12. handleUserComplaint
export async function handleUserComplaint(
  tenantId: string,
  complaint: Record<string, unknown>,
): Promise<{ id: string; escalated: boolean }> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_user_complaints
       (system_id, complainant_type, complaint_category, description, status)
     VALUES ($1,$2,$3,$4,'open')
     RETURNING id`,
    [
      complaint.system_id, complaint.complainant_type ?? 'end_user',
      complaint.complaint_category, complaint.description,
    ],
  );

  // Auto-escalate critical complaints to incidents
  let escalated = false;
  if (complaint.severity === 'critical') {
    await safeQuery(
      `UPDATE "${schema}".ai_user_complaints
       SET escalated_to_incident = TRUE, status = 'escalated'
       WHERE id = $1`,
      [rows[0].id],
    );
    escalated = true;
  }

  return { id: rows[0].id, escalated };
}

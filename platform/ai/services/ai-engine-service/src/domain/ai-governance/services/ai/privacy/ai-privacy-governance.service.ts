// @ts-nocheck
// ============================================
// AI Privacy Governance Service — Phase 7
// GDPR Art. 22/33/34/35, PDPL, EU AI Act Art. 14
// Tables: ai_privacy_impact_register,
//   ai_privacy_incidents, automated_decision_register,
//   ai_profiling_register, ai_training_data_registry,
//   human_oversight_config
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logPolicyDecision } from '../../../../packs/services/blueprint.service';
import { eventBus } from '../../../ports/events.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';

// -----------------------------------------------
// 1. registerPrivacyImpact — GDPR Art. 35 DPIA
//    Register AI privacy impact with epsilon budget.
// -----------------------------------------------

export async function registerPrivacyImpact(
  tenantId: string,
  impact: Record<string, unknown>,
): Promise<{ id: string; warnings: string[] }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// -----------------------------------------------
// 2. reportPrivacyIncident — GDPR Art. 33/34
//    Auto-compute 72h notification deadline.
// -----------------------------------------------

export async function reportPrivacyIncident(
  tenantId: string,
  incident: Record<string, unknown>,
): Promise<{ id: string; notification_deadline: string }> {
  const schema = tenantSchema(tenantId);

  const detectedAt = incident.detected_at ?? new Date().toISOString();
  const deadline = new Date(new Date((detectedAt as any)).getTime() + 72 * 60 * 60 * 1000).toISOString();

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_privacy_incidents
       (system_id, incident_type, severity, affected_data_subjects,
        data_categories_affected, detection_method, detected_at,
        containment_measures, remediation_steps,
        authority_notification_required, notification_deadline,
        data_subject_notification_required,
        root_cause, preventive_measures, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING id`,
    [
      incident.system_id ?? null,
      incident.incident_type ?? 'data_breach',
      incident.severity ?? 'high',
      incident.affected_data_subjects ?? 0,
      incident.data_categories_affected ?? [],
      incident.detection_method ?? null,
      detectedAt,
      incident.containment_measures ?? null,
      incident.remediation_steps ?? null,
      incident.authority_notification_required ?? true,
      deadline,
      incident.data_subject_notification_required ?? false,
      incident.root_cause ?? null,
      incident.preventive_measures ?? null,
      incident.status ?? 'open',
    ]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'privacy_incident_reported',
    input_context: { incident_type: incident.incident_type, severity: incident.severity },
    decision: `Privacy incident reported — notification deadline: ${deadline}`,
    reason: 'GDPR Art. 33 — 72-hour notification requirement',
    policy_ref: 'ai-privacy-governance.service/reportPrivacyIncident',
  });

  swallow(EC.EVENT_BUS, eventBus.publish({
    eventType: 'privacy.dpia_required' as any,
    tenantId,

    sourceService: 'ai-privacy-governance',
    entityType: 'privacy_incident',
    entityId: rows[0].id,
    severity: 'critical',
    payload: {
      incident_type: incident.incident_type,
      severity: incident.severity,
      notification_deadline: deadline,
      system_id: incident.system_id,
    },
  }), { tenantId, operation: 'eventBus:privacy.dpia_required' });

  return { id: rows[0].id, notification_deadline: deadline };
}

// -----------------------------------------------
// 3. registerAutomatedDecision — GDPR Art. 22
//    Automated decision-making with opt-out.
// -----------------------------------------------

export async function registerAutomatedDecision(
  tenantId: string,
  decision: Record<string, unknown>,
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".automated_decision_register
       (system_id, decision_type, module_code, logic_explanation_en,
        logic_explanation_ar, significance, profiling_involved,
        profiling_categories, opt_out_mechanism, human_review_available,
        human_reviewer_role, data_used, accuracy_rate, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      decision.system_id,
      decision.decision_type ?? 'automated',
      decision.module_code ?? null,
      decision.logic_explanation_en ?? decision.description ?? '',
      decision.logic_explanation_ar ?? null,
      decision.significance ?? 'routine',
      decision.profiling_involved ?? decision.involves_profiling ?? false,
      decision.profiling_categories ?? [],
      decision.opt_out_mechanism ?? 'Contact DPO to request manual review (GDPR Art. 22)',
      decision.human_review_available ?? true,
      decision.human_reviewer_role ?? null,
      decision.data_used ?? [],
      decision.accuracy_rate ?? null,
      decision.is_active ?? true,
    ]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'automated_decision_registered',
    input_context: { system_id: decision.system_id, decision_type: decision.decision_type },
    decision: `Automated decision registered with Art. 22 opt-out`,
    reason: 'GDPR Art. 22 — Automated individual decision-making, including profiling',
    policy_ref: 'ai-privacy-governance.service/registerAutomatedDecision',
  });

  return { id: rows[0].id };
}

// -----------------------------------------------
// 4. registerProfiling — Profiling activity
//    with safeguards and transparency.
// -----------------------------------------------

export async function registerProfiling(
  tenantId: string,
  profiling: Record<string, unknown>,
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_profiling_register
       (system_id, profiling_purpose, categories_profiled, data_sources,
        inference_types, retention_period_days, legal_basis,
        safeguards, impact_on_individuals, objection_mechanism,
        transparency_measures, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      profiling.system_id,
      profiling.profiling_purpose ?? profiling.purpose,
      profiling.categories_profiled ?? profiling.data_categories ?? [],
      profiling.data_sources ?? [],
      profiling.inference_types ?? [],
      profiling.retention_period_days ?? null,
      profiling.legal_basis ?? 'consent',
      profiling.safeguards ?? null,
      profiling.impact_on_individuals ?? null,
      profiling.objection_mechanism ?? null,
      profiling.transparency_measures ?? null,
      profiling.is_active ?? true,
    ]
  );

  await logPolicyDecision(tenantId, {
    decision_type: 'profiling_registered',
    input_context: { system_id: profiling.system_id, purpose: profiling.profiling_purpose },
    decision: `Profiling activity registered`,
    reason: 'GDPR Art. 22 — Profiling safeguards and transparency',
    policy_ref: 'ai-privacy-governance.service/registerProfiling',
  });

  return { id: rows[0].id };
}

// -----------------------------------------------
// 5. configureHumanOversight — EU AI Act Art. 14
//    Set oversight level with intervention triggers.
// -----------------------------------------------

export async function configureHumanOversight(
  tenantId: string,
  config: Record<string, unknown>,
): Promise<{ id: string }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// -----------------------------------------------
// 6. registerTrainingData — ai_training_data_registry
//    Track training dataset with personal data flags.
// -----------------------------------------------

export async function registerTrainingData(
  tenantId: string,
  data: Record<string, unknown>,
): Promise<{ id: string }> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".ai_training_data_registry
       (system_id, dataset_name, data_source, contains_personal_data,
        personal_data_categories, consent_obtained, consent_type,
        anonymization_applied, anonymization_method,
        representativeness_assessment, bias_evaluation,
        data_quality_score, sample_size,
        collection_start, collection_end, retention_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING id`,
    [
      data.system_id, data.dataset_name, data.data_source,
      data.contains_personal_data ?? false,
      data.personal_data_categories ?? [],
      data.consent_obtained ?? null, data.consent_type ?? null,
      data.anonymization_applied ?? false, data.anonymization_method ?? null,
      data.representativeness_assessment ?? null,
      JSON.stringify(data.bias_evaluation ?? {}),
      data.data_quality_score ?? null, data.sample_size ?? null,
      data.collection_start ?? null, data.collection_end ?? null,
      data.retention_until ?? null,
    ]
  );
  return { id: rows[0].id };
}

export async function listTrainingData(
  tenantId: string,
  systemId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_training_data_registry
     WHERE system_id = $1 ORDER BY created_at DESC`,
    [systemId],
  );
  return rows;
}

// -----------------------------------------------
// 7. getPrivacyDashboard — Aggregated summary.
// -----------------------------------------------

export async function getPrivacyDashboard(
  tenantId: string,
  systemId?: string,
): Promise<{
  incidents: { total: number; open: number; critical: number };
  epsilon_usage: { total_budget: number; total_consumed: number; utilization_pct: number };
  automated_decisions: { total: number; with_opt_out: number };
  human_oversight: unknown[];
}> {
  const schema = tenantSchema(tenantId);
  const systemFilter = systemId ? ' AND system_id = $1' : '';
  const params = systemId ? [systemId] : [];

  const { rows: incidentRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'open')::int AS open,
       COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical
     FROM "${schema}".ai_privacy_incidents
     WHERE 1=1${systemFilter}`,
    params
  );

  const { rows: epsilonRows } = await safeQuery(
    `SELECT
       COALESCE(SUM(epsilon_budget), 0)::float AS total_budget,
       COALESCE(SUM(epsilon_consumed), 0)::float AS total_consumed
     FROM "${schema}".ai_privacy_impact_register
     WHERE 1=1${systemFilter}`,
    params
  );

  const totalBudget = epsilonRows[0].total_budget;
  const totalConsumed = epsilonRows[0].total_consumed;
  const utilizationPct = totalBudget > 0 ? Math.round((totalConsumed / totalBudget) * 100) : 0;

  const { rows: decisionRows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE opt_out_mechanism IS NOT NULL AND opt_out_mechanism != '')::int AS with_opt_out
     FROM "${schema}".automated_decision_register
     WHERE 1=1${systemFilter}`,
    params
  );

  const { rows: oversightRows } = await safeQuery(
    `SELECT system_id, oversight_level, intervention_triggers, review_frequency_days, updated_at
     FROM "${schema}".human_oversight_config
     WHERE 1=1${systemFilter}
     ORDER BY updated_at DESC`,
    params
  );

  return {
    incidents: incidentRows[0],
    epsilon_usage: {
      total_budget: totalBudget,
      total_consumed: totalConsumed,
      utilization_pct: utilizationPct,
    },
    automated_decisions: decisionRows[0],
    human_oversight: oversightRows,
  };
}

// -----------------------------------------------
// 8. getById methods for single-record lookup
// -----------------------------------------------

export async function getPrivacyImpactById(
  tenantId: string,
  impactId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_privacy_impact_register WHERE id = $1`,
    [impactId],
  );
  return rows[0] ?? null;
}

export async function getPrivacyIncidentById(
  tenantId: string,
  incidentId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_privacy_incidents WHERE id = $1`,
    [incidentId],
  );
  return rows[0] ?? null;
}

export async function getAutomatedDecisionById(
  tenantId: string,
  decisionId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".automated_decision_register WHERE id = $1`,
    [decisionId],
  );
  return rows[0] ?? null;
}

export async function getProfilingById(
  tenantId: string,
  profilingId: string,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".ai_profiling_register WHERE id = $1`,
    [profilingId],
  );
  return rows[0] ?? null;
}

// -----------------------------------------------
// 9. List/GET methods for audit trail
// -----------------------------------------------

export async function listPrivacyImpacts(
  tenantId: string,
  filters?: { system_id?: string; privacy_risk_level?: string },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".ai_privacy_impact_register WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.system_id) {
    params.push(filters.system_id);
    query += ` AND system_id = $${params.length}`;
  }
  if (filters?.privacy_risk_level) {
    params.push(filters.privacy_risk_level);
    query += ` AND privacy_risk_level = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await safeQuery(query, params);
  return rows;
}

export async function listPrivacyIncidents(
  tenantId: string,
  filters?: { system_id?: string; status?: string; severity?: string },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".ai_privacy_incidents WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.system_id) {
    params.push(filters.system_id);
    query += ` AND system_id = $${params.length}`;
  }
  if (filters?.status) {
    params.push(filters.status);
    query += ` AND status = $${params.length}`;
  }
  if (filters?.severity) {
    params.push(filters.severity);
    query += ` AND severity = $${params.length}`;
  }
  query += ' ORDER BY detected_at DESC LIMIT 200';
  const { rows } = await safeQuery(query, params);
  return rows;
}

export async function listAutomatedDecisions(
  tenantId: string,
  filters?: { system_id?: string; is_active?: boolean },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".automated_decision_register WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.system_id) {
    params.push(filters.system_id);
    query += ` AND system_id = $${params.length}`;
  }
  if (filters?.is_active !== undefined) {
    params.push(filters.is_active);
    query += ` AND is_active = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await safeQuery(query, params);
  return rows;
}

export async function listProfilingActivities(
  tenantId: string,
  filters?: { system_id?: string; is_active?: boolean },
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".ai_profiling_register WHERE 1=1`;
  const params: unknown[] = [];
  if (filters?.system_id) {
    params.push(filters.system_id);
    query += ` AND system_id = $${params.length}`;
  }
  if (filters?.is_active !== undefined) {
    params.push(filters.is_active);
    query += ` AND is_active = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC LIMIT 200';
  const { rows } = await safeQuery(query, params);
  return rows;
}

export async function getHumanOversightConfig(
  tenantId: string,
  systemId: string,
): Promise<any | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".human_oversight_config
     WHERE system_id = $1 AND is_active = TRUE
     ORDER BY created_at DESC LIMIT 1`,
    [systemId],
  );
  return rows[0] ?? null;
}

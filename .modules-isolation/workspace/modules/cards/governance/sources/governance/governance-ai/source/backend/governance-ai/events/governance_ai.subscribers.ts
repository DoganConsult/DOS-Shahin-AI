
import { subscribe } from '../ports/events.port';
import { logger } from '../ports/logger.port';
import { safeQuery, tenantSchema, emptyResult } from '../ports/database.port';
import { swallowDefault, EC, catchHandler } from '@dos/platform-core/resilience';

/**
 * Register cross-module event subscribers for Governance AI.
 * Each handler creates a governance signal when a relevant event is detected,
 * enabling the 3-stage pipeline (Signal → Interpretation → Escalation) to
 * process events from other modules asynchronously.
 *
 * Regulatory: NCA ECC 2-3-4 (risk assessment), ISO 42001 (AI governance).
 */
export function registerGovernanceAiSubscribers(): void {
  // ── Workflow status changes (governance-ai lifecycle awareness) ──────────
  (subscribe as any)({
    eventType: 'workflow.status_changed',
    subscriberId: 'governance_ai.workflow_status',
    handler: async (payload: any) => {
      if (payload.moduleCode !== 'governance-ai') return;
      logger.info(`[governance-ai] Workflow status changed: ${payload.entityId}`);
    },
  });

  // ── Risk score changes → create signal if score breaches threshold ──────
  (subscribe as any)({
    eventType: 'risk.score_changed',
    subscriberId: 'governance_ai.risk_score',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        const newScore = data.newScore ?? data.score;
        const threshold = Number(data.threshold ?? 80);
        if (typeof newScore === 'number' && newScore >= threshold) {
          await createEventSignal(tenantId, {
            signal_type: 'kri_breach',
            source_module: 'risk',
            source_entity_type: 'risk',
            source_entity_id: payload.entityId || '',
            severity: newScore >= 90 ? 'critical' : 'high',
            confidence_score: 0.90,
            board_attention_flag: newScore >= 90,
            recommended_action_type: 'governance_action',
            recommended_escalation_level: newScore >= 90 ? 2 : 1,
            payload_json: { newScore, threshold, eventType: 'risk.score_changed' },
          });
          logger.info(`[governance-ai] Risk score signal created for risk ${payload.entityId} (score: ${newScore})`);
        }
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process risk.score_changed event`, { error: String(err) });
      }
    },
  });

  // ── Compliance posture changes → create signal if posture degrades ──────
  (subscribe as any)({
    eventType: 'compliance.posture_changed',
    subscriberId: 'governance_ai.compliance_posture',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        const direction = data.direction || data.trend;
        if (direction === 'degrading' || direction === 'declined') {
          await createEventSignal(tenantId, {
            signal_type: 'governance_score_decline',
            source_module: 'compliance',
            source_entity_type: 'compliance_posture',
            source_entity_id: payload.entityId || tenantId,
            severity: 'high',
            confidence_score: 0.85,
            board_attention_flag: false,
            recommended_action_type: 'governance_action',
            recommended_escalation_level: 1,
            payload_json: { direction, eventType: 'compliance.posture_changed', ...data },
          });
          logger.info(`[governance-ai] Compliance posture degradation signal created`);
        }
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process compliance.posture_changed event`, { error: String(err) });
      }
    },
  });

  // ── Control effectiveness failures → create failed_control signal ───────
  (subscribe as any)({
    eventType: 'controls.effectiveness_failed',
    subscriberId: 'governance_ai.control_effectiveness',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'failed_control',
          source_module: 'controls',
          source_entity_type: 'control',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.95,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 0,
          payload_json: { eventType: 'controls.effectiveness_failed', ...(payload.data || {}) },
        });
        logger.info(`[governance-ai] Control failure signal created for ${payload.entityId}`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process controls.effectiveness_failed event`, { error: String(err) });
      }
    },
  });

  // ── Incident classified → create incident signal if severity warrants ───
  (subscribe as any)({
    eventType: 'incident.classified',
    subscriberId: 'governance_ai.incident_classified',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        const severity = data.severity || data.classification;
        if (severity === 'critical' || severity === 'high') {
          await createEventSignal(tenantId, {
            signal_type: 'incident_over_sla',
            source_module: 'incidents',
            source_entity_type: 'incident',
            source_entity_id: payload.entityId || '',
            severity: severity === 'critical' ? 'critical' : 'high',
            confidence_score: 0.90,
            board_attention_flag: severity === 'critical',
            recommended_action_type: 'governance_action',
            recommended_escalation_level: severity === 'critical' ? 2 : 1,
            payload_json: { severity, eventType: 'incident.classified', ...data },
          });
          logger.info(`[governance-ai] Incident signal created for ${payload.entityId} (severity: ${severity})`);
        }
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process incident.classified event`, { error: String(err) });
      }
    },
  });

  // ── Audit finding created → create repeated_audit_finding signal ────────
  (subscribe as any)({
    eventType: 'audit.finding_created',
    subscriberId: 'governance_ai.audit_finding',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'repeated_audit_finding',
          source_module: 'audit',
          source_entity_type: 'audit_finding',
          source_entity_id: payload.entityId || '',
          severity: data.risk_level === 'critical' ? 'critical' : 'high',
          confidence_score: 0.85,
          board_attention_flag: data.risk_level === 'critical',
          recommended_action_type: 'capa_followup',
          recommended_escalation_level: data.risk_level === 'critical' ? 2 : 1,
          payload_json: { eventType: 'audit.finding_created', ...data },
        });
        logger.info(`[governance-ai] Audit finding signal created for ${payload.entityId}`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process audit.finding_created event`, { error: String(err) });
      }
    },
  });

  // ── Exception approved → track for expiry monitoring ────────────────────
  (subscribe as any)({
    eventType: 'exception.approved',
    subscriberId: 'governance_ai.exception_approved',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      logger.info(`[governance-ai] Exception approved: ${payload.entityId} — will monitor for expiry`);
    },
  });

  // ── Exception expired → create expired_exception signal ─────────────────
  (subscribe as any)({
    eventType: 'exception.expired',
    subscriberId: 'governance_ai.exception_expired',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'expired_exception',
          source_module: 'exceptions',
          source_entity_type: 'exception',
          source_entity_id: payload.entityId || '',
          severity: data.risk_level === 'critical' ? 'critical' : 'high',
          confidence_score: 0.95,
          board_attention_flag: data.risk_level === 'critical',
          recommended_action_type: 'exception_review',
          recommended_escalation_level: data.risk_level === 'critical' ? 2 : 1,
          payload_json: { eventType: 'exception.expired', ...data },
        });
        logger.info(`[governance-ai] Expired exception signal created for ${payload.entityId}`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process exception.expired event`, { error: String(err) });
      }
    },
  });

  // ── Risk appetite breached → high-priority governance signal ────────────
  (subscribe as any)({
    eventType: 'risk.appetite_breached',
    subscriberId: 'governance_ai.risk_appetite_breached',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'kri_breach',
          source_module: 'risk',
          source_entity_type: 'risk_appetite',
          source_entity_id: payload.entityId || '',
          severity: 'critical',
          confidence_score: 0.95,
          board_attention_flag: true,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 2,
          payload_json: { eventType: 'risk.appetite_breached', ...(payload.data || {}) },
        });
        logger.info(`[governance-ai] Risk appetite breach signal created for ${payload.entityId}`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process risk.appetite_breached`, { error: String(err) });
      }
    },
  });

  // ── Risk KRI threshold breached → signal ────────────────────────────────
  (subscribe as any)({
    eventType: 'risk.kri_threshold_breached',
    subscriberId: 'governance_ai.kri_breached',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'kri_breach',
          source_module: 'risk',
          source_entity_type: 'kri',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.90,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'risk.kri_threshold_breached', ...data },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process risk.kri_threshold_breached`, { error: String(err) });
      }
    },
  });

  // ── Controls test overdue → stale control signal ────────────────────────
  (subscribe as any)({
    eventType: 'controls.test_overdue',
    subscriberId: 'governance_ai.controls_test_overdue',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'overdue_control_test',
          source_module: 'controls',
          source_entity_type: 'control',
          source_entity_id: payload.entityId || '',
          severity: 'medium',
          confidence_score: 0.95,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 0,
          payload_json: { eventType: 'controls.test_overdue', ...(payload.data || {}) },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process controls.test_overdue`, { error: String(err) });
      }
    },
  });

  // ── Controls deficiency detected → signal ───────────────────────────────
  (subscribe as any)({
    eventType: 'controls.deficiency_detected',
    subscriberId: 'governance_ai.controls_deficiency',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'failed_control',
          source_module: 'controls',
          source_entity_type: 'control',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.90,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'controls.deficiency_detected', ...(payload.data || {}) },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process controls.deficiency_detected`, { error: String(err) });
      }
    },
  });

  // ── Workflow SLA breached → escalation signal ───────────────────────────
  (subscribe as any)({
    eventType: 'workflow.sla_breached',
    subscriberId: 'governance_ai.workflow_sla_breached',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'delayed_decision',
          source_module: 'workflow',
          source_entity_type: 'workflow_task',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.90,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'workflow.sla_breached', ...data },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process workflow.sla_breached`, { error: String(err) });
      }
    },
  });

  // ── Compliance gap detected → signal ────────────────────────────────────
  (subscribe as any)({
    eventType: 'compliance.gap_detected',
    subscriberId: 'governance_ai.compliance_gap',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'governance_score_decline',
          source_module: 'compliance',
          source_entity_type: 'compliance_gap',
          source_entity_id: payload.entityId || '',
          severity: data.severity === 'critical' ? 'critical' : 'medium',
          confidence_score: 0.85,
          board_attention_flag: data.severity === 'critical',
          recommended_action_type: 'governance_action',
          recommended_escalation_level: data.severity === 'critical' ? 2 : 0,
          payload_json: { eventType: 'compliance.gap_detected', ...data },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process compliance.gap_detected`, { error: String(err) });
      }
    },
  });

  // ── Incident escalated → mirror as governance escalation ────────────────
  (subscribe as any)({
    eventType: 'incident.escalated',
    subscriberId: 'governance_ai.incident_escalated',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.data || payload.payload || {};
        await createEventSignal(tenantId, {
          signal_type: 'incident_over_sla',
          source_module: 'incidents',
          source_entity_type: 'incident',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.90,
          board_attention_flag: true,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 2,
          payload_json: { eventType: 'incident.escalated', ...data },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process incident.escalated`, { error: String(err) });
      }
    },
  });

  // ── AI Governance monitoring alert → AI risk signal ─────────────────────
  (subscribe as any)({
    eventType: 'ai_governance.monitoring_alert',
    subscriberId: 'governance_ai.ai_monitoring_alert',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'critical_vulnerability_ungoverned',
          source_module: 'ai_governance',
          source_entity_type: 'ai_model',
          source_entity_id: payload.entityId || '',
          severity: 'high',
          confidence_score: 0.85,
          board_attention_flag: false,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'ai_governance.monitoring_alert', ...(payload.data || {}) },
        });
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process ai_governance.monitoring_alert`, { error: String(err) });
      }
    },
  });

  // ── Navigation events → Governance-AI (bidirectional) ─────────────────────
  // Navigation structure changes are a governance signal when they affect
  // role visibility or module access (potential access control drift)

  (subscribe as any)({
    eventType: 'navigation.binding.changed',
    subscriberId: 'governance_ai.nav_binding_changed',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.payload || payload.data || {};
        await createEventSignal(tenantId, {
          signal_type: 'access_drift',
          source_module: 'navigation',
          source_entity_type: 'role_binding',
          source_entity_id: (data as Record<string, unknown>).entityId as string || 'unknown',
          severity: 'low',
          confidence_score: 0.70,
          board_attention_flag: false,
          recommended_action_type: 'review',
          recommended_escalation_level: 0,
          payload_json: { eventType: 'navigation.binding.changed', ...(data as Record<string, unknown>) },
        });
        logger.info(`[governance-ai] Navigation binding change signal created`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process navigation.binding.changed`, { error: String(err) });
      }
    },
  });

  (subscribe as any)({
    eventType: 'module.enabled',
    subscriberId: 'governance_ai.module_enabled',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.payload || payload.data || {};
        const moduleCode = (data as Record<string, unknown>).moduleCode as string ?? 'unknown';
        await createEventSignal(tenantId, {
          signal_type: 'module_activation',
          source_module: 'platform',
          source_entity_type: 'module',
          source_entity_id: moduleCode,
          severity: 'info',
          confidence_score: 1.0,
          board_attention_flag: false,
          recommended_action_type: 'acknowledge',
          recommended_escalation_level: 0,
          payload_json: { eventType: 'module.enabled', moduleCode },
        });
        logger.info(`[governance-ai] Module activation signal created: ${moduleCode}`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process module.enabled`, { error: String(err) });
      }
    },
  });

  (subscribe as any)({
    eventType: 'module.disabled',
    subscriberId: 'governance_ai.module_disabled',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.payload || payload.data || {};
        const moduleCode = (data as Record<string, unknown>).moduleCode as string ?? 'unknown';
        await createEventSignal(tenantId, {
          signal_type: 'module_deactivation',
          source_module: 'platform',
          source_entity_type: 'module',
          source_entity_id: moduleCode,
          severity: 'medium',
          confidence_score: 1.0,
          board_attention_flag: true,
          recommended_action_type: 'governance_action',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'module.disabled', moduleCode },
        });
        logger.info(`[governance-ai] Module deactivation signal created: ${moduleCode} (board attention flagged)`);
      } catch (err) {
        logger.warn(`[governance-ai] Failed to process module.disabled`, { error: String(err) });
      }
    },
  });

  // ── Team events → governance signals ──────────────────────────────────
  (subscribe as any)({
    eventType: 'team.archived',
    subscriberId: 'governance_ai.team_archived',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'team_dissolved',
          source_module: 'team',
          source_entity_type: 'team',
          source_entity_id: payload.entityId || '',
          severity: 'medium',
          confidence_score: 0.95,
          board_attention_flag: false,
          recommended_action_type: 'governance_review',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'team.archived', ...(payload.payload || {}) },
        });
      } catch (err) {
        logger.warn('[governance-ai] Failed to process team.archived', { error: String(err) });
      }
    },
  });

  (subscribe as any)({
    eventType: 'team.capacity_changed',
    subscriberId: 'governance_ai.team_capacity',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.payload || {};
        const utilization = (data as Record<string, unknown>).utilization as number ?? (data as Record<string, unknown>).utilizationPct as number;
        if (typeof utilization === 'number' && utilization > 90) {
          await createEventSignal(tenantId, {
            signal_type: 'team_capacity_overload',
            source_module: 'team',
            source_entity_type: 'team',
            source_entity_id: payload.entityId || '',
            severity: utilization > 95 ? 'high' : 'medium',
            confidence_score: 0.85,
            board_attention_flag: utilization > 95,
            recommended_action_type: 'resource_review',
            recommended_escalation_level: 1,
            payload_json: { eventType: 'team.capacity_changed', utilization },
          });
        }
      } catch (err) {
        logger.warn('[governance-ai] Failed to process team.capacity_changed', { error: String(err) });
      }
    },
  });

  // ── Journey events → governance signals ────────────────────────────────
  (subscribe as any)({
    eventType: 'journey.maturity_level_changed',
    subscriberId: 'governance_ai.journey_maturity',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        const data = payload.payload || {};
        const newLevel = (data as Record<string, unknown>).newLevel as number ?? (data as Record<string, unknown>).overallMaturity as number;
        if (typeof newLevel === 'number' && newLevel < 2) {
          await createEventSignal(tenantId, {
            signal_type: 'maturity_regression',
            source_module: 'journey',
            source_entity_type: 'journey_roadmap',
            source_entity_id: payload.entityId || '',
            severity: newLevel < 1 ? 'high' : 'medium',
            confidence_score: 0.80,
            board_attention_flag: newLevel < 1,
            recommended_action_type: 'governance_action',
            recommended_escalation_level: 1,
            payload_json: { eventType: 'journey.maturity_level_changed', newLevel },
          });
        }
      } catch (err) {
        logger.warn('[governance-ai] Failed to process journey.maturity_level_changed', { error: String(err) });
      }
    },
  });

  (subscribe as any)({
    eventType: 'journey.milestone_overdue',
    subscriberId: 'governance_ai.journey_milestone_overdue',
    handler: async (payload: any) => {
      const tenantId = payload.tenantId;
      if (!tenantId) return;
      try {
        await createEventSignal(tenantId, {
          signal_type: 'milestone_overdue',
          source_module: 'journey',
          source_entity_type: 'journey_milestone',
          source_entity_id: payload.entityId || '',
          severity: 'medium',
          confidence_score: 0.90,
          board_attention_flag: false,
          recommended_action_type: 'governance_review',
          recommended_escalation_level: 1,
          payload_json: { eventType: 'journey.milestone_overdue', ...(payload.payload || {}) },
        });
      } catch (err) {
        logger.warn('[governance-ai] Failed to process journey.milestone_overdue', { error: String(err) });
      }
    },
  });
}

// ── Helper: Create governance signal from event ───────────────────────────

interface EventSignalData {
  signal_type: string;
  source_module: string;
  source_entity_type: string;
  source_entity_id: string;
  severity: string;
  confidence_score: number;
  board_attention_flag: boolean;
  recommended_action_type: string;
  recommended_escalation_level: number;
  payload_json: Record<string, unknown>;
}

async function createEventSignal(tenantId: string, data: EventSignalData): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Dedup: skip if same signal type + entity exists within 24h
  const dup = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT id FROM "${schema}".governance_signals
    WHERE signal_type = $1 AND source_entity_id = $2
      AND status NOT IN ('resolved', 'archived')
      AND detected_at > NOW() - INTERVAL '24 hours'
    LIMIT 1
  `, [data.signal_type, data.source_entity_id]), { operation: 'dedup check' });
  if (dup.rows.length > 0) return;

  await safeQuery(`
    INSERT INTO "${schema}".governance_signals
      (tenant_id, signal_type, source_module, source_entity_type, source_entity_id,
       severity, confidence_score, board_attention_flag,
       recommended_action_type, recommended_escalation_level,
       payload_json)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [
    tenantId, data.signal_type, data.source_module, data.source_entity_type,
    data.source_entity_id, data.severity, data.confidence_score,
    data.board_attention_flag, data.recommended_action_type,
    data.recommended_escalation_level, JSON.stringify(data.payload_json),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));
}

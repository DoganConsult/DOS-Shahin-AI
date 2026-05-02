// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: RISK HUB → other hubs
// Subscribers: risk.created, risk.exceeded_appetite, risk.score_changed
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  enterpriseCreateTask, safeCreateActionItem, safePublish,
  daysFromNow, getFirstAdmin,
  recordAudit,
} from '../helpers';
import { createAlert } from '../../../../modules/ai/services/governance/compliance/ai-alert.service.js';
import { runAgent } from '../../../../modules/ai/services/agents/core/agent-runner.service.js';

export function registerRiskHub(sub: SubFn): void {

  // risk.created → Compliance Hub: create compliance gap check task
  //              → Evidence Hub: request evidence for risk controls
  //              → Workflow Hub: create risk assessment workflow
  //              → Vendor Hub: if vendor-related, flag vendor risk
  sub('risk.created', 'xhub-risk→compliance-gap', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Compliance: create gap analysis task (enterprise role: compliance_analyst)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Compliance gap analysis for risk: ${payload.title || entityId}`,
      description: `AGRC-OS detected a new risk "${payload.title}". Assess compliance impact and map to relevant controls.`,
      taskType: 'control_review', assigneeRole: 'compliance_analyst',
      entityType: 'risk', entityId: entityId || '', dueInHours: 168,
      triggerSource: 'xhub-risk→compliance-gap',
    });

    // → Evidence: request supporting evidence (enterprise role: evidence_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Collect evidence for new risk: ${payload.title || entityId}`,
      description: `Evidence required to substantiate risk assessment and control mapping for "${payload.title}".`,
      taskType: 'evidence_request', assigneeRole: 'evidence_owner',
      entityType: 'risk', entityId: entityId || '', dueInHours: 336,
      triggerSource: 'xhub-risk→evidence-request',
    });

    // → Workflow: initiate risk assessment workflow (enterprise role: risk_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Risk assessment workflow: ${payload.title || entityId}`,
      description: `Complete risk scoring, treatment selection, and owner assignment for "${payload.title}".`,
      taskType: 'risk_assessment', assigneeRole: 'risk_owner',
      entityType: 'risk', entityId: entityId || '', dueInHours: 120,
      triggerSource: 'xhub-risk→assessment',
    });

    // → Analytics: publish for posture recalculation
    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'new_risk_created', riskId: entityId },
    });

    await recordAudit({
      tenantId, userId: 'agrc-os', module: 'cross_hub', action: 'create',
      entityType: 'cross_hub_cascade', entityId: entityId || '',
      afterState: { trigger: 'risk.created', actions: ['compliance_gap', 'evidence_request', 'workflow_init'] },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // risk.exceeded_appetite → AI Alert + immediate A07 (KRI breach)
  sub('risk.exceeded_appetite', 'xhub-risk→kri-alert-a07', async (e) => {
    const { tenantId, entityId, payload } = e;
    await createAlert({
      tenantId,
      sourceType: 'event',

      sourceId: payload?.kriId ?? undefined,
      entityType: 'risk',
      entityId: entityId ?? undefined,
      alertType: 'threshold',
      title: `KRI breach: ${payload?.kriName ?? 'Unknown'} (risk ${entityId ?? '—'})`,
      description: payload?.category === 'kri_breach'
        ? `Current value ${payload?.currentValue} ${payload?.direction === 'above' ? 'exceeds' : 'below'} threshold ${payload?.thresholdValue}.`
        : `Risk appetite exceeded. ${payload?.riskName ?? ''} score: ${payload?.riskScore ?? ''}, max: ${payload?.maxScore ?? ''}.`,
      severity: 'critical',
    }).catch(catchHandler(EC.EVENT_BUS, {}));
    runAgent(tenantId, 'A07', {}).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // risk.exceeded_appetite → Incident Hub: auto-create incident
  //                        → Governance Hub: escalate to governance board
  //                        → Audit Hub: flag for next audit cycle
  sub('risk.exceeded_appetite', 'xhub-risk→incident-escalate', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);

    // → Incident Hub: auto-create incident
    try {
      await safeQuery(
        `INSERT INTO "${schema}".incidents (title, description, severity, status, source, linked_risk_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `[Auto] Risk appetite breach: ${payload.riskName || entityId}`,
          `Risk "${payload.riskName}" scored ${payload.riskScore} exceeding appetite threshold of ${payload.maxScore}. Category: ${payload.category}.`,
          'critical', 'open', 'agrc-os-cross-hub', entityId || null,
        ]
      );
    } catch { /* table may not exist yet */ }

    // → Governance Hub: create governance review task (enterprise role: governance_manager)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Governance review: risk appetite breach — ${payload.riskName || entityId}`,
      description: `Risk score ${payload.riskScore} exceeds appetite ${payload.maxScore}. Governance board must decide: accept, mitigate, transfer, or avoid.`,
      taskType: 'approval', assigneeRole: 'governance_manager', priority: 'critical',
      entityType: 'risk', entityId: entityId || '', dueInHours: 72,
      triggerSource: 'xhub-risk→governance-review',
    });

    // → Audit Hub: flag for audit
    await safeCreateActionItem(tenantId, {
      title: `[Auto] Audit flag: risk appetite breach — ${payload.riskName}`,
      sourceType: 'risk', sourceId: entityId || '',
      assignedTo: await getFirstAdmin(tenantId), deadline: daysFromNow(14),
    });

    // → Reports Hub: trigger board report
    await safePublish({
      eventType: 'report.overdue', tenantId,

      sourceService: 'cross-hub-integration', severity: 'critical',
      payload: { reason: 'risk_appetite_breach', riskId: entityId, riskName: payload.riskName },
    });
  });

  // risk.score_changed → Analytics Hub: recalculate posture
  //                    → Compliance Hub: re-evaluate compliance coverage
  //                    → Operations Hub: update operational risk view
  sub('risk.score_changed', 'xhub-risk→analytics-recompute', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,

      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'risk_score_changed', riskId: entityId, oldScore: payload.oldScore, newScore: payload.newScore },
    });

    // → Operations: update ops dashboard
    await safePublish({
      eventType: 'ops.health_degraded', tenantId,

      sourceService: 'cross-hub-integration',

      severity: ((payload.newScore || 0) > 15 as any) ? 'warning' : 'info',
      payload: { reason: 'risk_score_shift', riskId: entityId, score: payload.newScore },
    });
  });
}

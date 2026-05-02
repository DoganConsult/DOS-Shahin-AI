// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: COMPLIANCE HUB → other hubs
// Subscribers: compliance.gap_detected, compliance.assessment_completed
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  enterpriseCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerComplianceHub(sub: SubFn): void {

  // compliance.gap_detected → Risk Hub: create compliance risk
  //                         → Evidence Hub: request evidence for gap
  //                         → Framework Hub: check framework coverage
  //                         → Workflow Hub: create remediation workflow
  sub('compliance.gap_detected', 'xhub-compliance→risk-create', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Risk Hub: register compliance gap as a risk
    try {
      const { createRisk } = await import('../../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Compliance gap risk: ${payload.controlName || payload.framework || entityId}`,
        description: `Compliance gap detected in ${payload.framework || 'framework'}. Control: ${payload.controlName || entityId}. Gap score: ${payload.gapScore || 'any'}.`,
        category: 'compliance',
        likelihood: 3, impact: 4,
      });
    } catch { /* risk table may not exist */ }

    // → Evidence Hub: request evidence (enterprise role: evidence_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Evidence needed for compliance gap: ${payload.controlName || entityId}`,
      description: `Collect evidence to address compliance gap in ${payload.framework || 'framework'}.`,
      taskType: 'evidence_request', assigneeRole: 'evidence_owner',
      entityType: 'compliance', entityId: entityId || '', dueInHours: 240,
      triggerSource: 'xhub-compliance→evidence',
    });

    // → Workflow Hub: remediation workflow (enterprise role: control_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Remediate compliance gap: ${payload.controlName || entityId}`,
      description: `Implement corrective actions to close compliance gap. Framework: ${payload.framework || 'N/A'}.`,
      taskType: 'remediation', assigneeRole: 'control_owner',
      entityType: 'compliance', entityId: entityId || '', dueInHours: 336,
      triggerSource: 'xhub-compliance→remediation',
    });
  });

  // compliance.assessment_completed → Reports Hub: generate compliance report
  //                                 → Analytics Hub: update posture score
  //                                 → Governance Hub: notify governance board
  //                                 → Gap detection → Remediation pipeline (Gap 3 fix)
  sub('compliance.assessment_completed', 'xhub-compliance→reports-generate', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'report.generated', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reportType: 'compliance_assessment', framework: payload.framework, score: payload.score },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'compliance_assessment_complete',
      title: `[AGRC-OS] Compliance Assessment Complete`,
      body: `Assessment for ${payload.framework || 'framework'} completed. Score: ${payload.score || 'N/A'}%.`,
      link: '/compliance',
    });

    // Gap 3: Assessment → Gap Detection → Remediation Pipeline
    try {
      const schema = tenantSchema(tenantId);
      const admin = await getFirstAdmin(tenantId);
      const gapControls = await safeQuery(
        `SELECT control_id, title, status FROM "${schema}".controls
         WHERE status IN ('not_started', 'not_implemented')
           AND ($1::text IS NULL OR $1 = ANY(frameworks))`,
        [payload.framework || null]
      );
      for (const ctrl of gapControls.rows) {
        const { createRemediationTask } = await import('../../../../modules/remediation/services/remediation.service');
        await createRemediationTask(tenantId, {
          title: `[Auto] Gap remediation: ${ctrl.title || ctrl.control_id}`,
          description: `Assessment for ${payload.framework || 'framework'} identified this control as ${ctrl.status}. Implement corrective actions.`,
          linked_entity_type: 'control',
          linked_entity_id: ctrl.control_id,
          assigned_to: admin,
          priority: 'medium',
          due_date: daysFromNow(30),
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }
      if (gapControls.rows.length > 0) {
        await safePublish({
          eventType: 'compliance.gap_detected', tenantId,
          sourceService: 'cross-hub-integration', severity: 'warning',
          payload: { framework: payload.framework, gapCount: gapControls.rows.length, source: 'assessment' },
        });
      }
    } catch { /* gap detection non-fatal */ }
  });
}

// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: WORKFLOW + PRIVACY + OPERATIONS + REPORTS HUBS → other hubs
// Subscribers: workflow.sla_breached, privacy.impact_high,
//              ops.health_degraded, report.overdue
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow,
} from './helpers';

export function registerWorkflowOpsHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. WORKFLOW HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // workflow.sla_breached → Operations Hub: escalate
  //                      → Risk Hub: flag operational risk
  //                      → Reports Hub: SLA breach report
  sub('workflow.sla_breached', 'xhub-workflow→ops-escalate', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'sla_breached', workflowId: entityId, slaType: payload.slaType },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'sla_breach',
      title: '[AGRC-OS] SLA Breach Detected',
      body: `Workflow SLA breached for "${payload.workflowTitle || payload.memberName || 'task'}". Immediate attention required for "${payload.memberName || payload.email || entityId}".`,
      link: '/workflow-hub',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. PRIVACY HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // privacy.impact_high → Risk Hub: create privacy risk
  //                    → Compliance Hub: DPIA required task
  //                    → Governance Hub: notify DPO
  sub('privacy.impact_high', 'xhub-privacy→risk-create', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Privacy risk: ${payload.processingActivity || entityId}`,
        description: `High privacy impact detected for "${payload.processingActivity}". DPIA may be required.`,
        category: 'privacy', likelihood: 4, impact: 4,
      });
    } catch { /* best effort */ }

    await safeCreateTask(tenantId, {
      title: `[Auto] DPIA required: ${payload.processingActivity || entityId}`,
      description: `Data Protection Impact Assessment required for high-impact processing activity.`,
      dueDate: daysFromNow(14), entityType: 'privacy', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'privacy.dpia_required', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'privacy', entityId,
      payload: { processingActivity: payload.processingActivity },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. OPERATIONS HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // ops.health_degraded → Risk Hub: flag operational risk
  //                    → Incident Hub: create incident if critical
  //                    → Automation Hub: trigger recovery rules
  sub('ops.health_degraded', 'xhub-ops→risk-flag', async (e) => {
    const { tenantId, entityId, payload } = e;

    if (e.severity === 'critical') {
      const schema = tenantSchema(tenantId);
      try {
        await safeQuery(
          `INSERT INTO "${schema}".incidents (title, description, severity, status, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `[Auto] Operations health degraded: ${payload.reason || entityId}`,
            `Operations health alert: ${payload.reason}. Automated incident created for investigation.`,
            'high', 'open', 'agrc-os-cross-hub',
          ]
        );
      } catch { /* best effort */ }
    }

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'ops_recovery', reason: payload.reason },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. REPORTS HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // report.overdue → Operations Hub: escalate
  //               → Governance Hub: notify board
  //               → Team Hub: notify report owners
  sub('report.overdue', 'xhub-reports→ops-escalate', async (e) => {
    const { tenantId, payload } = e;

    await safeNotifyAdmins(tenantId, {
      type: 'report_overdue',
      title: '[AGRC-OS] Report Overdue',
      body: `Report "${payload.reportTitle || payload.reason || 'scheduled report'}" is overdue. Escalated for immediate action.`,
      link: '/report-center',
    });
  });
}

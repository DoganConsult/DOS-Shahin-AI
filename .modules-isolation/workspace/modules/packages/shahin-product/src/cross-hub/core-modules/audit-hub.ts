// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: AUDIT HUB → other hubs
// Subscribers: audit.finding_created, audit.completed, audit.remediation_due
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  enterpriseCreateTask, safeCreateTask, safeCreateActionItem,
  safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerAuditHub(sub: SubFn): void {

  // audit.finding_created → Risk Hub: register finding as risk
  //                       → Compliance Hub: update compliance status
  //                       → Workflow Hub: create remediation workflow
  //                       → Evidence Hub: request remediation evidence
  //                       → Remediation Hub: auto-create remediation_task (Gap 2 fix)
  sub('audit.finding_created', 'xhub-audit→risk-register', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    // → Risk Hub: register as risk
    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Audit finding risk: ${payload.findingTitle || entityId}`,
        description: `Audit finding "${payload.findingTitle}" requires risk assessment and remediation tracking.`,
        category: 'compliance',
        likelihood: payload.severity === 'critical' ? 4 : 3,
        impact: payload.severity === 'critical' ? 5 : 3,
      });
    } catch { /* risk table may not exist */ }

    // → Remediation Hub: auto-create remediation_task in tenant schema (Gap 2)
    try {
      const { createRemediationTask } = await import('../../../modules/remediation/services/remediation.service');
      const severity = payload.severity || 'medium';
      const priorityMap: Record<string, string> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
      const dueDaysMap: Record<string, number> = { critical: 7, high: 14, medium: 21, low: 30 };
      await createRemediationTask(tenantId, {
        title: `[Auto] Remediate finding: ${payload.findingTitle || entityId}`,
        description: `Auto-created from audit finding. Severity: ${severity}. Address finding and provide evidence of remediation.`,
        linked_entity_type: 'finding',
        linked_entity_id: entityId || '',
        assigned_to: admin,
        priority: priorityMap[severity] || 'medium',
        due_date: daysFromNow(dueDaysMap[severity] || 21),
      });
    } catch { /* remediation_tasks table may not exist */ }

    // → Workflow Hub: remediation task (enterprise role: auditee_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Remediate audit finding: ${payload.findingTitle || entityId}`,
      description: `Address audit finding and provide evidence of remediation.`,
      taskType: 'audit_response', assigneeRole: 'auditee_owner',
      entityType: 'audit_finding', entityId: entityId || '', dueInHours: 504,
      triggerSource: 'xhub-audit→remediation',
    });

    // → Evidence Hub: request remediation evidence (enterprise role: evidence_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Evidence for audit remediation: ${payload.findingTitle || entityId}`,
      description: `Collect and attach evidence that audit finding has been remediated.`,
      taskType: 'evidence_request', assigneeRole: 'evidence_owner',
      entityType: 'audit_finding', entityId: entityId || '', dueInHours: 672,
      triggerSource: 'xhub-audit→evidence',
    });

    // → Finding: link remediation back to finding record
    try {
      const schema = tenantSchema(tenantId);
      await safeQuery(
        `UPDATE "${schema}".findings SET status = 'remediation_planned' WHERE finding_id = $1 AND status = 'open'`,
        [entityId]
      );
    } catch { /* best effort */ }
  });

  // audit.completed → Reports Hub: generate audit report
  //                 → Governance Hub: notify board
  //                 → Compliance Hub: update compliance posture
  sub('audit.completed', 'xhub-audit→reports-generate', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'report.generated', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reportType: 'audit_completion', auditId: e.entityId, findings: payload.findingsCount },
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'audit_completed', auditId: e.entityId },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'audit_completed',
      title: '[AGRC-OS] Audit Completed',
      body: `Audit cycle completed with ${payload.findingsCount || 0} findings. Review report in Reports Hub.`,
      link: '/audit',
    });
  });

  // audit.remediation_due → Workflow Hub: create urgent task
  //                       → Operations Hub: alert operations
  sub('audit.remediation_due', 'xhub-audit→workflow-urgent', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[URGENT] Audit remediation overdue: ${payload.findingTitle || entityId}`,
      description: `Audit remediation deadline approaching. Immediate action required.`,
      dueDate: daysFromNow(3), entityType: 'audit_finding', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'audit_remediation_overdue', findingId: entityId },
    });
  });
}

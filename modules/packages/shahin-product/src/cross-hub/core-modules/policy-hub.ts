// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: POLICY / GOVERNANCE HUB → other hubs
// Subscribers: policy.approved, policy.violated, policy.expired
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeCreateActionItem, safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerPolicyHub(sub: SubFn): void {

  // policy.approved → Framework Hub: update framework mappings
  //                 → Compliance Hub: create control implementation tasks
  //                 → Team Hub: notify affected teams
  sub('policy.approved', 'xhub-policy→framework-map', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Map policy to framework controls: ${payload.policyTitle || entityId}`,
      description: `Newly approved policy "${payload.policyTitle}" needs framework-to-control mapping.`,
      dueDate: daysFromNow(7), entityType: 'policy', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Implement controls for policy: ${payload.policyTitle || entityId}`,
      description: `Design and implement controls required by "${payload.policyTitle}".`,
      dueDate: daysFromNow(30), entityType: 'policy', entityId: entityId || '',
    });

    await safeNotifyAdmins(tenantId, {
      type: 'policy_approved',
      title: '[AGRC-OS] Policy Approved — Action Required',
      body: `Policy "${payload.policyTitle}" approved. Control implementation and framework mapping tasks created.`,
      link: '/policies',
    });
  });

  // policy.violated → Incident Hub: create incident
  //                 → Risk Hub: update risk score
  //                 → Audit Hub: flag for audit
  sub('policy.violated', 'xhub-policy→incident-create', async (e) => {
    const { tenantId, entityId, payload } = e;
    const schema = tenantSchema(tenantId);

    // → Incident Hub: create incident for policy violation
    try {
      await safeQuery(
        `INSERT INTO "${schema}".incidents (title, description, severity, status, source, linked_risk_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `[Auto] Policy violation: ${payload.policyTitle || entityId}`,
          `Policy "${payload.policyTitle}" violated. Rule: ${payload.ruleId || 'N/A'}. Action: ${payload.action?.type || 'alert'}.`,
          e.severity === 'critical' ? 'critical' : 'high',
          'open', 'agrc-os-cross-hub', null,
        ]
      );
    } catch { /* incidents table may not exist */ }

    // → Audit Hub: flag
    await safeCreateActionItem(tenantId, {
      title: `[Auto] Audit flag: policy violation — ${payload.policyTitle || entityId}`,
      sourceType: 'policy', sourceId: entityId || '',
      assignedTo: await getFirstAdmin(tenantId), deadline: daysFromNow(14),
    });
  });

  // policy.expired → Governance Hub: create renewal task
  //               → Compliance Hub: flag compliance gap
  //               → Risk Hub: flag governance risk
  sub('policy.expired', 'xhub-policy→governance-renew', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[URGENT] Policy expired: ${payload.policyTitle || entityId}`,
      description: `Policy "${payload.policyTitle}" has expired. Renew or retire immediately.`,
      dueDate: daysFromNow(7), entityType: 'policy', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'policy', entityId,
      payload: { reason: 'policy_expired', policyTitle: payload.policyTitle },
    });
  });
}

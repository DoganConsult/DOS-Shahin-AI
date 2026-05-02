// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: TRAINING + CERTIFICATION + INCIDENT-BCP + VENDOR SLA/DD/OFFBOARDING HUBS
// Subscribers: training.campaign_launched, training.compliance_gap,
//   incident.escalated, vendor.sla_breached, bcp.exercise_completed,
//   vendor.dd_completed, training.certification_expiring,
//   incident.near_miss_reported, incident.pir_signed_off,
//   vendor.offboarding_initiated, bcp.crisis_comm_activated
// ============================================

import {
  type SubFn,
  safeCreateTask, safeNotifyAdmins,
  daysFromNow,
} from './helpers';

export function registerTrainingCertificationHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 27. TRAINING — cross-hub on campaign launch → notify compliance
  // ═══════════════════════════════════════════════════════════════════════════

  sub('training.campaign_launched', 'xhub-training→compliance-notify', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'training_campaign_launched',
        title: `Training campaign launched: ${payload.title || 'Untitled'}`,
        body: `A new training campaign has been launched. Review compliance impact.`,
        link: '/training/campaigns',
      });
    } catch { /* best effort */ }
  });

  sub('training.compliance_gap', 'xhub-training→risk-alert', async (e) => {
    const { tenantId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'training_compliance_gap',
        title: `[Training] ${payload.overdueCount || 0} overdue assignments detected`,
        body: `Training compliance gap detected. ${payload.overdueCount || 0} assignments are overdue.`,
        link: '/training/compliance',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 28. INCIDENT → BCP cross-link (major incident triggers BCP awareness)
  // ═══════════════════════════════════════════════════════════════════════════

  sub('incident.escalated', 'xhub-incident→bcp-awareness', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'incident_escalated_bcp',
        title: `Major incident escalated — BCP review may be needed`,
        body: `Incident ${payload.title || entityId} has been escalated. Consider activating relevant BCP plans.`,
        link: '/bcp/activation',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 29. VENDOR SLA BREACH → Incident auto-creation awareness
  // ═══════════════════════════════════════════════════════════════════════════

  sub('vendor.sla_breached', 'xhub-vendor-sla→incident-awareness', async (e) => {
    const { tenantId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'vendor_sla_breach',
        title: `Vendor SLA breach: ${payload.metric || 'Unknown metric'}`,
        body: `Vendor ${payload.vendorId || 'any'} has breached SLA. Consider raising an incident.`,
        link: '/incidents/register',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 30. BCP EXERCISE COMPLETED → maturity update + notification
  // ═══════════════════════════════════════════════════════════════════════════

  sub('bcp.exercise_completed', 'xhub-bcp-exercise→maturity-update', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'bcp_exercise_completed',
        title: `BCP exercise completed: ${payload.title || entityId}`,
        body: `Exercise result: ${payload.result || 'any'}. Review findings and update maturity assessment.`,
        link: '/bcp/maturity',
      });
      await safeCreateTask(tenantId, {
        title: `[Auto] Review BCP exercise findings: ${payload.title || entityId}`,
        description: `Exercise completed. Analyze gaps and update recovery strategies.`,
        dueDate: daysFromNow(14),
        entityType: 'bcp_exercise',
        entityId: entityId || '',
      });

      // LEADING: Auto-schedule the NEXT exercise based on results
      try {
        const { autoScheduleNextExercise } = await import('../../../modules/bcp/services/bcm-advanced.service');
        const next = await autoScheduleNextExercise(tenantId, entityId || '');
        if (next.nextExerciseId) {
          await safeNotifyAdmins(tenantId, {
            type: 'bcp_exercise_auto_scheduled',
            title: `Next exercise auto-scheduled: ${next.exerciseType}`,
            body: `${next.reason}. Scheduled for ${next.scheduledDate}.`,
            link: '/bcp/exercises',
          });
        }
      } catch { /* auto-schedule is best-effort */ }
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 31. VENDOR DD COMPLETED → status update + notification
  // ═══════════════════════════════════════════════════════════════════════════

  sub('vendor.dd_completed', 'xhub-vendor-dd→status-notify', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'vendor_dd_completed',
        title: `Vendor due diligence completed: ${payload.vendorName || entityId}`,
        body: `Due diligence assessment finished with status: ${payload.status || 'pending_review'}. Proceed with vendor activation decision.`,
        link: '/vendor-risk/due-diligence',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 32. TRAINING CERTIFICATION EXPIRING → notification + task
  // ═══════════════════════════════════════════════════════════════════════════

  sub('training.certification_expiring', 'xhub-training-cert→renewal-task', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeCreateTask(tenantId, {
        title: `[Auto] Renew expiring certification: ${payload.certName || entityId}`,
        description: `Certification for ${payload.userName || 'user'} expires ${payload.expiresAt || 'soon'}. Schedule renewal.`,
        assignedTo: payload.userId,
        dueDate: daysFromNow(14),
        entityType: 'training_certification',
        entityId: entityId || '',
      });
      await safeNotifyAdmins(tenantId, {
        type: 'training_cert_expiring',
        title: `Certification expiring: ${payload.certName || entityId}`,
        body: `${payload.userName || 'A user'}'s certification expires ${payload.expiresAt || 'soon'}.`,
        link: '/training/certifications',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 33. INCIDENT NEAR-MISS REPORTED → risk awareness notification
  // ═══════════════════════════════════════════════════════════════════════════

  sub('incident.near_miss_reported', 'xhub-near-miss→risk-awareness', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      if (payload.severity === 'high' || payload.severity === 'critical') {
        await safeNotifyAdmins(tenantId, {
          type: 'near_miss_high_severity',
          title: `High-severity near-miss: ${payload.title || entityId}`,
          body: `A ${payload.severity} near-miss was reported. Review for potential risk register update.`,
          link: '/incidents/near-miss',
        });
      }
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 34. INCIDENT PIR SIGNED OFF → lessons learned + knowledge task
  // ═══════════════════════════════════════════════════════════════════════════

  sub('incident.pir_signed_off', 'xhub-pir→lessons-learned', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeCreateTask(tenantId, {
        title: `[Auto] Publish lessons learned from PIR: ${payload.title || entityId}`,
        description: `PIR signed off. Extract findings and distribute to relevant teams.`,
        dueDate: daysFromNow(7),
        entityType: 'incident_pir',
        entityId: entityId || '',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 35. VENDOR OFFBOARDING INITIATED → access revocation task
  // ═══════════════════════════════════════════════════════════════════════════

  sub('vendor.offboarding_initiated', 'xhub-vendor-offboard→access-revoke', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeCreateTask(tenantId, {
        title: `[Auto] Revoke vendor access: ${payload.vendorName || entityId}`,
        description: `Vendor offboarding initiated. Revoke all system access, VPN credentials, and shared accounts.`,
        dueDate: daysFromNow(3),
        entityType: 'vendor',
        entityId: entityId || '',
      });
      await safeNotifyAdmins(tenantId, {
        type: 'vendor_offboarding',
        title: `Vendor offboarding started: ${payload.vendorName || entityId}`,
        body: `Vendor is being offboarded. Review data handling and access revocation checklist.`,
        link: '/vendor-risk/offboarding',
      });
    } catch { /* best effort */ }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 36. BCP CRISIS COMM ACTIVATED → notify all stakeholders
  // ═══════════════════════════════════════════════════════════════════════════

  sub('bcp.crisis_comm_activated', 'xhub-crisis-comm→stakeholder-alert', async (e) => {
    const { tenantId, entityId, payload } = e;
    try {
      await safeNotifyAdmins(tenantId, {
        type: 'crisis_comm_activated',
        title: `CRISIS COMMUNICATION ACTIVATED: ${payload.title || entityId}`,
        body: `Crisis communication plan has been activated. Check notification tree and respond.`,
        link: '/bcp/crisis-comm',
      });
    } catch { /* best effort */ }
  });
}

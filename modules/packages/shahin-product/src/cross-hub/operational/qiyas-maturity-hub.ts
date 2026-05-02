// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: QIYAS / MATURITY HUB → other hubs (+ reverse flow)
// Subscribers: qiyas.assessment_finalized, qiyas.gap_critical,
//   qiyas.recommendation_accepted, qiyas.maturity_threshold_crossed,
//   qiyas.certification_ready, qiyas.evidence_quality_scored,
//   compliance.posture_changed (→qiyas), risk.score_changed (→qiyas),
//   audit.finding.issued (→qiyas), training.assignment_completed (→qiyas),
//   governance.health_score_changed (→qiyas), evidence.approved (→qiyas)
// ============================================

import {
  type SubFn,
  enterpriseCreateTask,
  safeCreateActionItem,
  safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerQiyasMaturityHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // QIYAS / MATURITY HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  sub('qiyas.assessment_finalized', 'xhub-qiyas→maturity-dashboard', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'qiyas-cross-hub', severity: 'info',
      payload: { reason: 'qiyas_assessment_finalized', assessmentId: entityId },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'qiyas_assessment_finalized',
      title: `Qiyas Assessment Finalized: ${payload.modelName || 'Maturity Assessment'}`,
      body: `Overall score: ${payload.overallScore || 'N/A'}%, maturity level: ${payload.maturityLevel || 'N/A'}`,
      link: `/qiyas/assessments/${entityId}`,
    });
  });

  sub('qiyas.gap_critical', 'xhub-qiyas→remediation', async (e) => {
    const { tenantId, entityId, payload } = e;

    await enterpriseCreateTask(tenantId, {
      title: `[URGENT] Critical maturity gap: ${payload.domainName || payload.gapDescription || entityId}`,
      description: `Qiyas assessment identified a critical maturity gap in domain "${payload.domainName}". Current score: ${payload.currentScore}, target: ${payload.targetScore}. Immediate remediation required.`,
      taskType: 'remediation', assigneeRole: 'compliance_analyst',
      priority: 'high',
      entityType: 'qiyas_gap', entityId: entityId || '',
      dueInHours: 168,
      triggerSource: 'xhub-qiyas→remediation',
    });
  });

  sub('qiyas.recommendation_accepted', 'xhub-qiyas→action-items', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateActionItem(tenantId, {
      title: `Implement maturity recommendation: ${payload.recommendationTitle || entityId}`,
      description: payload.recommendationDescription || 'Accepted Qiyas maturity improvement recommendation.',
      sourceType: 'qiyas_recommendation',
      sourceId: entityId || '',
      assignedTo: payload.assignedTo || await getFirstAdmin(tenantId),
      deadline: daysFromNow(payload.dueInDays || 30),
    });
  });

  sub('qiyas.maturity_threshold_crossed', 'xhub-qiyas→risk-flag', async (e) => {
    const { tenantId, entityId, payload } = e;

    if (payload.direction === 'below') {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Maturity regression: ${payload.domainName} dropped below threshold`,
        description: `Domain "${payload.domainName}" score dropped from ${payload.previousScore} to ${payload.currentScore} (threshold: ${payload.threshold}). Review and remediate.`,
        taskType: 'risk_assessment', assigneeRole: 'risk_owner',
        priority: 'high',
        entityType: 'qiyas_maturity', entityId: entityId || '',
        dueInHours: 120,
        triggerSource: 'xhub-qiyas→risk-flag',
      });
    }

    await safeNotifyAdmins(tenantId, {
      type: 'qiyas_maturity_threshold',
      title: `Maturity Threshold ${payload.direction === 'above' ? 'Met' : 'Breached'}: ${payload.domainName}`,
      body: `Score: ${payload.currentScore} (threshold: ${payload.threshold})`,
      link: `/qiyas/assessments/${entityId}`,
    });
  });

  sub('qiyas.certification_ready', 'xhub-qiyas→certification-notify', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeNotifyAdmins(tenantId, {
      type: 'qiyas_certification_ready',
      title: `Certification Readiness Achieved: ${payload.certificationName || 'Assessment'}`,
      body: `All gaps closed. Readiness score: ${payload.readinessScore || 100}%. Ready for external audit.`,
      link: `/qiyas/assessments/${entityId}`,
    });

    await safePublish({
      eventType: 'audit.schedule.triggered', tenantId,
      sourceService: 'qiyas-cross-hub', severity: 'info',
      payload: { reason: 'certification_ready', assessmentId: entityId, certificationName: payload.certificationName },
    });
  });

  sub('qiyas.evidence_quality_scored', 'xhub-qiyas→evidence-quality', async (e) => {
    const { tenantId, entityId, payload } = e;

    if (payload.qualityScore < 50) {
      await enterpriseCreateTask(tenantId, {
        title: `[Auto] Low evidence quality for: ${payload.evidenceTitle || entityId}`,
        description: `Evidence quality score is ${payload.qualityScore}%. Review and improve evidence to meet maturity requirements.`,
        taskType: 'evidence_request', assigneeRole: 'evidence_owner',
        entityType: 'evidence', entityId: entityId || '',
        dueInHours: 168,
        triggerSource: 'xhub-qiyas→evidence-quality',
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER HUBS → QIYAS (reverse flow: GRC changes → maturity recalculation)
  // ═══════════════════════════════════════════════════════════════════════════

  sub('compliance.posture_changed', 'xhub-compliance→qiyas-recalc', async (e) => {
    const { tenantId, payload } = e;
    await safePublish({
      eventType: 'qiyas.indicator_score_updated', tenantId,
      sourceService: 'compliance-to-qiyas', severity: 'info',
      payload: { domain: 'compliance', reason: 'posture_changed', ...payload },
    });
  });

  sub('risk.score_changed', 'xhub-risk→qiyas-recalc', async (e) => {
    const { tenantId, payload } = e;
    await safePublish({
      eventType: 'qiyas.indicator_score_updated', tenantId,
      sourceService: 'risk-to-qiyas', severity: 'info',
      payload: { domain: 'risk_management', reason: 'risk_score_changed', ...payload },
    });
  });

  sub('audit.finding.issued', 'xhub-audit→qiyas-recommendation', async (e) => {
    const { tenantId, entityId, payload } = e;
    await safePublish({
      eventType: 'qiyas.recommendation_generated', tenantId,
      sourceService: 'audit-to-qiyas', severity: 'info',
      payload: { source: 'audit_finding', findingId: entityId, ...payload },
    });
  });

  sub('training.assignment_completed', 'xhub-training→qiyas-awareness', async (e) => {
    const { tenantId, payload } = e;
    await safePublish({
      eventType: 'qiyas.indicator_score_updated', tenantId,
      sourceService: 'training-to-qiyas', severity: 'info',
      payload: { domain: 'people_awareness', reason: 'training_completed', ...payload },
    });
  });

  sub('governance.health_score_changed', 'xhub-governance→qiyas-governance', async (e) => {
    const { tenantId, payload } = e;
    await safePublish({
      eventType: 'qiyas.indicator_score_updated', tenantId,
      sourceService: 'governance-to-qiyas', severity: 'info',
      payload: { domain: 'governance_framework', reason: 'health_score_changed', ...payload },
    });
  });

  sub('evidence.approved', 'xhub-evidence→qiyas-quality', async (e) => {
    const { tenantId, entityId, payload } = e;
    await safePublish({
      eventType: 'qiyas.evidence_quality_scored', tenantId,
      sourceService: 'evidence-to-qiyas', severity: 'info',
      entityId, payload: { reason: 'evidence_approved', ...payload },
    });
  });
}

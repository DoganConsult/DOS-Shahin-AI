// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: ADVANCED HUB → other hubs
// Subscribers: advanced.redteam_finding, advanced.vulnerability_found,
//   advanced.model_risk_high, advanced.simulation_completed,
//   advanced.digital_twin_changed
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeCreateActionItem, safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
} from './helpers';

export function registerAdvancedHub(sub: SubFn): void {

  // advanced.redteam_finding → Risk Hub: create high-severity risk
  //                          → Incident Hub: create incident if critical
  //                          → Compliance Hub: flag control gap
  //                          → Evidence Hub: collect remediation evidence
  //                          → Audit Hub: flag for next audit
  sub('advanced.redteam_finding', 'xhub-advanced→risk-create', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Red team finding: ${payload.findingTitle || entityId}`,
        description: `Red team exercise discovered: "${payload.findingTitle}". Attack vector: ${payload.attackVector || 'N/A'}. Severity: ${payload.severity || e.severity}.`,
        category: 'cybersecurity',
        likelihood: e.severity === 'critical' ? 5 : 4,
        impact: e.severity === 'critical' ? 5 : 4,
      });
    } catch { /* best effort */ }

    if (e.severity === 'critical') {
      const schema = tenantSchema(tenantId);
      try {
        await safeQuery(
          `INSERT INTO "${schema}".incidents (title, description, severity, status, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `[Auto] Critical red team finding: ${payload.findingTitle || entityId}`,
            `Red team exercise found critical vulnerability: "${payload.findingTitle}". Attack vector: ${payload.attackVector || 'N/A'}. Immediate remediation required.`,
            'critical', 'open', 'agrc-os-cross-hub',
          ]
        );
      } catch { /* best effort */ }
    }

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: e.severity,
      entityType: 'red_team', entityId,
      payload: { reason: 'redteam_finding', controlName: payload.affectedControl, finding: payload.findingTitle },
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Remediation evidence: red team finding ${payload.findingTitle || entityId}`,
      description: `Provide evidence that red team finding "${payload.findingTitle}" has been remediated.`,
      assignedTo: admin, dueDate: daysFromNow(14),
      entityType: 'red_team', entityId: entityId || '',
    });

    await safeCreateActionItem(tenantId, {
      title: `[Auto] Audit flag: red team finding — ${payload.findingTitle || entityId}`,
      sourceType: 'red_team', sourceId: entityId || '',
      assignedTo: admin, deadline: daysFromNow(21),
    });
  });

  // advanced.vulnerability_found → Risk Hub: create vulnerability risk
  //                              → Incident Hub: create incident if critical/high
  //                              → Compliance Hub: flag control effectiveness gap
  //                              → Operations Hub: alert security operations
  //                              → Workflow Hub: create remediation workflow
  sub('advanced.vulnerability_found', 'xhub-advanced→risk-vuln', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Vulnerability: ${payload.cveId || payload.title || entityId}`,
        description: `Vulnerability "${payload.title}" (${payload.cveId || 'No CVE'}) found. CVSS: ${payload.cvss || 'N/A'}. Affected asset: ${payload.affectedAsset || 'any'}.`,
        category: 'cybersecurity',
        likelihood: (payload.cvss || 0) >= 9 ? 5 : (payload.cvss || 0) >= 7 ? 4 : 3,
        impact: (payload.cvss || 0) >= 9 ? 5 : (payload.cvss || 0) >= 7 ? 4 : 3,
      });
    } catch { /* best effort */ }

    if ((payload.cvss || 0) >= 7 || e.severity === 'critical') {
      const schema = tenantSchema(tenantId);
      try {
        await safeQuery(
          `INSERT INTO "${schema}".incidents (title, description, severity, status, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            `[Auto] High vulnerability: ${payload.cveId || payload.title || entityId}`,
            `CVSS ${payload.cvss || '?'} vulnerability found on "${payload.affectedAsset || 'any'}". Patch or mitigate immediately.`,
            (payload.cvss || 0) >= 9 ? 'critical' : 'high', 'open', 'agrc-os-cross-hub',
          ]
        );
      } catch { /* best effort */ }
    }

    await safeCreateTask(tenantId, {
      title: `[Auto] Patch/remediate: ${payload.cveId || payload.title || entityId}`,
      description: `Apply patch or compensating control for vulnerability. CVSS: ${payload.cvss || 'N/A'}. Asset: ${payload.affectedAsset || 'any'}.`,
      assignedTo: admin, dueDate: daysFromNow((payload.cvss || 0) >= 9 ? 3 : 14),
      entityType: 'vulnerability', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,
      sourceService: 'cross-hub-integration',
      severity: (payload.cvss || 0) >= 7 ? 'warning' : 'info',
      payload: { reason: 'vulnerability_found', vulnId: entityId, cvss: payload.cvss },
    });
  });

  // advanced.model_risk_high → Risk Hub: create AI/ML model risk
  //                          → Governance Hub: board review required
  //                          → AI Suite Hub: alert AI governance team
  //                          → Compliance Hub: check AI Act / AI governance framework
  sub('advanced.model_risk_high', 'xhub-advanced→risk-model', async (e) => {
    const { tenantId, entityId, payload } = e;

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] AI model risk: ${payload.modelName || entityId}`,
        description: `Model "${payload.modelName}" risk score ${payload.riskScore || '?'} exceeds threshold. Category: ${payload.riskCategory || 'model_risk'}. Review model governance controls.`,
        category: 'ai_governance',
        likelihood: 4, impact: 4,
      });
    } catch { /* best effort */ }

    await safeCreateTask(tenantId, {
      title: `[Auto] Board review: AI model risk — ${payload.modelName || entityId}`,
      description: `AI/ML model "${payload.modelName}" flagged as high risk (score: ${payload.riskScore}). Board review and governance decision required.`,
      dueDate: daysFromNow(7), entityType: 'model_risk', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.gap_detected', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      entityType: 'model_risk', entityId,
      payload: { reason: 'model_risk_high', modelName: payload.modelName, riskScore: payload.riskScore },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'model_risk_high',
      title: '[AGRC-OS] AI Model Risk Alert',
      body: `Model "${payload.modelName || entityId}" risk score ${payload.riskScore || '?'} — governance review required.`,
      link: '/model-risk',
    });
  });

  // advanced.simulation_completed → Analytics Hub: update predictive metrics
  //                               → Reports Hub: generate simulation report
  //                               → Risk Hub: update risk scores from simulation results
  //                               → Governance Hub: report to board if material
  sub('advanced.simulation_completed', 'xhub-advanced→analytics-update', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'report.generated', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reportType: 'simulation_result', simulationId: entityId, scenario: payload.scenario, outcome: payload.outcome },
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'simulation_completed', simulationId: entityId, impactDelta: payload.impactDelta },
    });

    if (payload.materialImpact) {
      await safeCreateTask(tenantId, {
        title: `[Auto] Board briefing: simulation results — ${payload.scenario || entityId}`,
        description: `Simulation "${payload.scenario}" completed with material impact. Results: ${payload.outcome || 'review required'}. Board briefing recommended.`,
        dueDate: daysFromNow(7), entityType: 'simulation', entityId: entityId || '',
      });
    }
  });

  // advanced.digital_twin_changed → Risk Hub: recalculate risk under new scenario
  //                               → Analytics Hub: update twin metrics
  //                               → Compliance Hub: re-evaluate compliance under scenario
  sub('advanced.digital_twin_changed', 'xhub-advanced→risk-recalc', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safePublish({
      eventType: 'risk.score_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'digital_twin_changed', twinId: entityId, change: payload.changeType, scenario: payload.scenario },
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'digital_twin_scenario', twinId: entityId },
    });
  });
}

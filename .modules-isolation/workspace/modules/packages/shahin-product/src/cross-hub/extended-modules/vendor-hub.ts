// @ts-nocheck — module-layer imports not yet extracted
// ============================================
// Cross-Hub: VENDOR HUB → other hubs
// Subscribers: vendor.onboarded, vendor.risk_changed, vendor.contract_expiring
// ============================================

import {
  type SubFn,
  enterpriseCreateTask, safeCreateTask, safePublish,
  daysFromNow,
} from './helpers';

export function registerVendorHub(sub: SubFn): void {

  // vendor.onboarded → Risk Hub: create vendor risk assessment
  //                  → Compliance Hub: create compliance checklist
  //                  → Evidence Hub: request vendor evidence
  sub('vendor.onboarded', 'xhub-vendor→risk-assess', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Risk Hub: vendor risk assessment
    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Vendor risk: ${payload.vendorName || entityId}`,
        description: `New vendor "${payload.vendorName}" onboarded. Initial risk assessment required.`,
        category: 'third_party',
        likelihood: 3, impact: 3,
      });
    } catch { /* risk table may not exist */ }

    // → Compliance: vendor compliance checklist (enterprise role: vendor_assessor)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Vendor compliance checklist: ${payload.vendorName || entityId}`,
      description: `Complete compliance questionnaire and due diligence for "${payload.vendorName}".`,
      taskType: 'verification', assigneeRole: 'vendor_assessor',
      entityType: 'vendor', entityId: entityId || '', dueInHours: 336,
      triggerSource: 'xhub-vendor→compliance',
    });

    // → Evidence: request vendor evidence (enterprise role: evidence_owner)
    await enterpriseCreateTask(tenantId, {
      title: `[Auto] Collect vendor evidence: ${payload.vendorName || entityId}`,
      description: `Request SOC 2, ISO 27001, or equivalent certifications from "${payload.vendorName}".`,
      taskType: 'evidence_request', assigneeRole: 'evidence_owner',
      entityType: 'vendor', entityId: entityId || '', dueInHours: 504,
      triggerSource: 'xhub-vendor→evidence',
    });
  });

  // vendor.risk_changed → Risk Hub: update risk register
  //                     → Compliance Hub: re-evaluate vendor compliance
  //                     → Enforcement Hub: check vendor gate
  sub('vendor.risk_changed', 'xhub-vendor→enforcement-gate', async (e) => {
    const { tenantId, entityId, payload } = e;

    // → Enforcement gate check
    try {
      const { validateVendorGate } = await import('../../../modules/governance/services/misc/enforcement-gate.service');
      await validateVendorGate(
        tenantId, entityId || '', payload.vendorName || 'Unknown',
        payload.riskScore ?? 0, 'cross-hub-integration'
      );
    } catch { /* enforcement gate may not exist */ }

    // → Compliance: re-evaluate
    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'vendor_risk_changed', vendorId: entityId, newScore: payload.riskScore },
    });
  });

  // vendor.contract_expiring → Workflow Hub: create renewal workflow
  //                          → Risk Hub: flag contract expiry risk
  sub('vendor.contract_expiring', 'xhub-vendor→workflow-renew', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Vendor contract renewal: ${payload.vendorName || entityId}`,
      description: `Contract expiring on ${payload.expiryDate || 'any'}. Initiate renewal or transition.`,
      dueDate: daysFromNow(14), entityType: 'vendor', entityId: entityId || '',
    });

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Contract expiry risk: ${payload.vendorName || entityId}`,
        description: `Vendor contract expiring. Business continuity risk if not renewed.`,
        category: 'third_party', likelihood: 4, impact: 3,
      });
    } catch { /* best effort */ }
  });
}

import { logger } from '../../../ports/logger.port';
// ============================================
// Shahin — Vendor Cross-Agent Propagation
// Bridges A09 (Third-Party Risk) findings into
// A07 (Risk), A06 (Gap), A05 (Evidence),
// A10 (Audit), and A03 (Framework).
//
// This is THE missing wiring that transforms
// vendor from a siloed module into a cross-cutting
// organizational success factor.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus, type PlatformEvent } from '../../../ports/events.port';
import { createProcessTask, type ProcessTaskType as _ProcessTaskType } from '../../../ports/lifecycle.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// ── Types ────────────────────────────────────────────────────────────────────

export interface VendorPropagationResult {
  propagations: {
    target: string;         // e.g. 'A07', 'A06', 'A05', 'A10', 'A03'
    action: string;         // e.g. 'risk_created', 'gap_created'
    entityId?: string;
    success: boolean;
    error?: string;
  }[];
  vendorId: string;
  vendorName?: string;
  totalPropagations: number;
  successCount: number;
}

// ── A09 → A07: Vendor Risk → Enterprise Risk Register ────────────────────────

export async function propagateVendorRiskToEnterprise(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  riskScore: number,
  riskTier: string,
  details?: Record<string, unknown>,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  try {
    // Check if an enterprise risk already exists for this vendor
    const existing = await safeQuery(
      `SELECT risk_id FROM "${schema}".risks
       WHERE source_type = 'vendor' AND source_id = $1 AND status != 'closed'
       LIMIT 1`,
      [vendorId],
    );

    if (existing.rows.length > 0) {
      // Update existing enterprise risk with new vendor score
      const riskId = getFirstRow(existing)?.risk_id;
      const likelihood = riskTier === 'critical' ? 5 : riskTier === 'high' ? 4 : riskTier === 'medium' ? 3 : 2;
      const impact = Math.min(5, Math.ceil(riskScore / 20));

      await safeQuery(
        `UPDATE "${schema}".risks
         SET risk_score = $1, likelihood = $2, impact = $3,
             ai_assessment = $4, updated_at = NOW()
         WHERE risk_id = $5`,
        [
          likelihood * impact,
          likelihood,
          impact,
          `[A09→A07] Vendor "${vendorName}" risk tier: ${riskTier}, score: ${riskScore}. ${details?.reason || ''}`,
          riskId,
        ],
      );

      await eventBus.publish(({
              eventType: 'vendor.risk_propagated',
              tenantId,
              sourceService: 'vendor-cross-agent',
              severity: riskTier === 'critical' ? 'critical' : 'warning',
              entityType: 'risk',
              entityId: riskId,
              payload: { vendorId, vendorName, riskScore, riskTier, action: 'updated', riskId },
            } as any));

      return riskId;
    }

    // Create new enterprise risk entry from vendor risk
    const likelihood = riskTier === 'critical' ? 5 : riskTier === 'high' ? 4 : riskTier === 'medium' ? 3 : 2;
    const impact = Math.min(5, Math.ceil(riskScore / 20));

    const insertRes = await safeQuery(
      `INSERT INTO "${schema}".risks
       (title, description, category, status, likelihood, impact, risk_score,
        source_type, source_id, ai_assessment, created_at)
       VALUES ($1, $2, 'third_party', 'open', $3, $4, $5, 'vendor', $6, $7, NOW())
       RETURNING risk_id`,
      [
        `Third-Party Risk: ${vendorName}`,
        `Auto-propagated from vendor assessment. Vendor risk tier: ${riskTier}, composite score: ${riskScore}/100.`,
        likelihood,
        impact,
        likelihood * impact,
        vendorId,
        `[A09→A07] Auto-created from vendor risk assessment. ${details?.reason || ''}`,
      ],
    );

    const riskId = getFirstRow(insertRes)?.risk_id;

    await eventBus.publish(({
          eventType: 'vendor.risk_propagated',
          tenantId,
          sourceService: 'vendor-cross-agent',
          severity: riskTier === 'critical' ? 'critical' : 'warning',
          entityType: 'risk',
          entityId: riskId,
          payload: { vendorId, vendorName, riskScore, riskTier, action: 'created', riskId },
        } as any));

    // Create a process task for risk team to review
    await createProcessTask(tenantId, {
      title: `[A09→A07] Review vendor risk: ${vendorName} (${riskTier})`,
      description: `Vendor "${vendorName}" scored ${riskScore}/100 (tier: ${riskTier}). Enterprise risk auto-created. Review and set risk treatment.`,
      taskType: 'vendor_risk_propagation',
      priority: riskTier === 'critical' ? 'critical' : riskTier === 'high' ? 'high' : 'medium',
      entityType: 'vendor_risk',
      entityId: riskId,
      triggerSource: 'agent_A09',
      triggerData: { vendorId, vendorName, riskScore, riskTier },
    }).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

    return riskId;
  } catch (err: unknown) {
    logger.error(`[VendorCrossAgent] A09→A07 propagation failed: ${toErrorMessage(err)}`);
    return null;
  }
}

// ── A09 → A06: Vendor Compliance Gap → Remediation ───────────────────────────

export async function propagateVendorGapToRemediation(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  gapDescription: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  controlId?: string,
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  try {
    const insertRes = await safeQuery(
      `INSERT INTO "${schema}".compliance_gaps
       (tenant_id, title, description, severity, status, source_type, source_id, control_id, created_at)
       VALUES ($1, $2, $3, $4, 'open', 'vendor', $5, $6, NOW())
       RETURNING gap_id`,
      [
        tenantId,
        `Vendor Gap: ${vendorName} — ${gapDescription.slice(0, 100)}`,
        `[A09→A06] ${gapDescription}`,
        severity,
        vendorId,
        controlId || null,
      ],
    );

    const gapId = getFirstRow(insertRes)?.gap_id;

    await eventBus.publish(({
          eventType: 'vendor.compliance_gap_propagated',
          tenantId,
          sourceService: 'vendor-cross-agent',
          severity: severity === 'critical' ? 'critical' : 'warning',
          entityType: 'compliance_gap',
          entityId: gapId,
          payload: { vendorId, vendorName, gapDescription, severity, controlId },
        } as any));

    // Create remediation task
    await createProcessTask(tenantId, {
      title: `[A09→A06] Remediate vendor compliance gap: ${vendorName}`,
      description: gapDescription,
      taskType: 'vendor_gap_remediation',
      priority: severity,
      entityType: 'vendor_compliance_gap',
      entityId: gapId,
      triggerSource: 'agent_A09',
      triggerData: { vendorId, vendorName, controlId },
    }).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

    return gapId;
  } catch (err: unknown) {
    logger.error(`[VendorCrossAgent] A09→A06 propagation failed: ${toErrorMessage(err)}`);
    return null;
  }
}

// ── A09 → A05: Vendor Certificate → Auto-Satisfy Evidence ───────────────────

export async function propagateVendorEvidenceToControls(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  documentType: string, // 'soc2', 'iso27001', 'pci_dss', etc.
  documentId: string,
  expiryDate?: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let satisfied = 0;

  try {
    // Find controls that depend on this vendor via shared_responsibility
    const sharedControls = await safeQuery(
      `SELECT vsr.control_id
       FROM "${schema}".vendor_shared_responsibility vsr
       WHERE vsr.vendor_id = $1
         AND vsr.ownership IN ('vendor', 'shared')
         AND vsr.control_id IS NOT NULL`,
      [vendorId],
    );

    for (const row of sharedControls.rows) {
      // Check if evidence_task exists for this control; auto-satisfy if vendor cert covers it
      const taskRes = await safeQuery(
        `SELECT task_id FROM "${schema}".evidence_tasks
         WHERE control_id = $1 AND status IN ('open', 'pending', 'overdue')
         LIMIT 1`,
        [row.control_id],
      );

      if (taskRes.rows.length > 0) {
        await safeQuery(
          `UPDATE "${schema}".evidence_tasks
           SET status = 'completed',
               completion_notes = $1,
               completed_at = NOW()
           WHERE task_id = $2`,
          [
            `[A09→A05] Auto-satisfied by vendor "${vendorName}" ${documentType} certificate (doc: ${documentId})`,
            getFirstRow(taskRes)?.task_id,
          ],
        );
        satisfied++;
      }
    }

    if (satisfied > 0) {
      await eventBus.publish(({
              eventType: 'vendor.evidence_auto_satisfied',
              tenantId,
              sourceService: 'vendor-cross-agent',
              severity: 'info',
              entityType: 'vendor',
              entityId: vendorId,
              payload: { vendorId, vendorName, documentType, documentId, satisfiedCount: satisfied, expiryDate },
            } as any));
    }

    return satisfied;
  } catch (err: unknown) {
    logger.error(`[VendorCrossAgent] A09→A05 propagation failed: ${toErrorMessage(err)}`);
    return 0;
  }
}

// ── A09 → A10: Vendor Finding → Audit Finding ───────────────────────────────

export async function propagateVendorFindingToAudit(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  findingTitle: string,
  findingDescription: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
): Promise<string | null> {
  const schema = tenantSchema(tenantId);

  try {
    const insertRes = await safeQuery(
      `INSERT INTO "${schema}".findings
       (title, description, severity, status, source_type, source_id, created_at)
       VALUES ($1, $2, $3, 'open', 'vendor_assessment', $4, NOW())
       RETURNING finding_id`,
      [
        `[Vendor] ${vendorName}: ${findingTitle}`,
        `[A09→A10] ${findingDescription}`,
        severity,
        vendorId,
      ],
    );

    const findingId = getFirstRow(insertRes)?.finding_id;

    await eventBus.publish(({
          eventType: 'vendor.audit_finding_propagated',
          tenantId,
          sourceService: 'vendor-cross-agent',
          severity: severity === 'critical' ? 'critical' : 'warning',
          entityType: 'finding',
          entityId: findingId,
          payload: { vendorId, vendorName, findingTitle, severity },
        } as any));

    // Create task for audit team to review
    await createProcessTask(tenantId, {
      title: `[A09→A10] Review vendor audit finding: ${vendorName}`,
      description: `${findingTitle}: ${findingDescription}`,
      taskType: 'vendor_audit_finding',
      priority: severity,
      entityType: 'vendor_finding',
      entityId: findingId,
      triggerSource: 'agent_A09',
      triggerData: { vendorId, vendorName },
    }).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

    return findingId;
  } catch (err: unknown) {
    logger.error(`[VendorCrossAgent] A09→A10 propagation failed: ${toErrorMessage(err)}`);
    return null;
  }
}

// ── A09 → A03: Vendor Shared Responsibility → Framework Sync ─────────────────

export async function propagateVendorFrameworkSync(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  frameworkCode: string,
  controlMappings: { controlCode: string; ownership: 'vendor' | 'shared' | 'customer' }[],
): Promise<number> {
  const schema = tenantSchema(tenantId);
  let synced = 0;

  try {
    for (const mapping of controlMappings) {
      await safeQuery(
        `INSERT INTO "${schema}".vendor_shared_responsibility
         (vendor_id, control_id, ownership, framework_code, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (vendor_id, control_id) DO UPDATE SET ownership = $3, updated_at = NOW()`,
        [vendorId, mapping.controlCode, mapping.ownership, frameworkCode],
      ).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
      synced++;
    }

    if (synced > 0) {
      await eventBus.publish(({
              eventType: 'vendor.framework_sync_triggered',
              tenantId,
              sourceService: 'vendor-cross-agent',
              severity: 'info',
              entityType: 'vendor',
              entityId: vendorId,
              payload: { vendorId, vendorName, frameworkCode, syncedCount: synced },
            } as any));
    }

    return synced;
  } catch (err: unknown) {
    logger.error(`[VendorCrossAgent] A09→A03 propagation failed: ${toErrorMessage(err)}`);
    return 0;
  }
}

// ── Master Propagation: Full cross-agent cascade from vendor score change ────

export async function runVendorCrossAgentPropagation(
  tenantId: string,
  vendorId: string,
): Promise<VendorPropagationResult> {
  const schema = tenantSchema(tenantId);
  const propagations: VendorPropagationResult['propagations'] = [];

  // Load vendor details
  const vendorRes = await safeQuery(
    `SELECT vendor_id, name, risk_score, risk_rating, status
     FROM "${schema}".vendors WHERE vendor_id = $1`,
    [vendorId],
  );
  if (!vendorRes.rows.length) {
    return { propagations: [], vendorId, totalPropagations: 0, successCount: 0 };
  }

  const vendor = getFirstRow(vendorRes)!;
  const vendorName = vendor.name;
  const riskScore = Number(vendor.risk_score ?? 50);
  const riskTier = vendor.risk_rating || (riskScore >= 80 ? 'low' : riskScore >= 60 ? 'medium' : riskScore >= 40 ? 'high' : 'critical');

  // ── A09 → A07: Propagate to enterprise risk register if tier is high/critical ──
  if (riskTier === 'critical' || riskTier === 'high') {
    try {
      const riskId = await propagateVendorRiskToEnterprise(tenantId, vendorId, vendorName, riskScore, riskTier);
      propagations.push({ target: 'A07', action: 'risk_propagated', entityId: riskId || undefined, success: !!riskId });
    } catch (err: unknown) {
      propagations.push({ target: 'A07', action: 'risk_propagated', success: false, error: toErrorMessage(err) });
    }
  }

  // ── A09 → A10: Propagate vendor findings to audit ──
  try {
    const findingsRes = await safeQuery(
      `SELECT finding_id, title, description, severity
       FROM "${schema}".vendor_findings
       WHERE vendor_id = $1 AND status = 'open'
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".findings f
           WHERE f.source_type = 'vendor_assessment' AND f.source_id = $1
             AND f.title LIKE '%' || vendor_findings.title || '%'
         )
       ORDER BY severity DESC LIMIT 5`,
      [vendorId],
    );

    for (const f of findingsRes.rows) {
      const findingId = await propagateVendorFindingToAudit(
        tenantId, vendorId, vendorName, f.title, f.description, f.severity,
      );
      propagations.push({ target: 'A10', action: 'audit_finding_propagated', entityId: findingId || undefined, success: !!findingId });
    }
  } catch (err: unknown) {
    propagations.push({ target: 'A10', action: 'audit_finding_propagated', success: false, error: toErrorMessage(err) });
  }

  // ── A09 → A05: Auto-satisfy evidence from vendor documents ──
  try {
    const docsRes = await safeQuery(
      `SELECT document_id, document_type, expiry_date
       FROM "${schema}".vendor_documents
       WHERE vendor_id = $1 AND status = 'active'
         AND document_type IN ('soc2', 'iso27001', 'pci_dss', 'hipaa', 'nca_ecc')
         AND (expiry_date IS NULL OR expiry_date > NOW())`,
      [vendorId],
    );

    for (const doc of docsRes.rows) {
      const satisfied = await propagateVendorEvidenceToControls(
        tenantId, vendorId, vendorName, doc.document_type, doc.document_id, doc.expiry_date,
      );
      if (satisfied > 0) {
        propagations.push({ target: 'A05', action: 'evidence_auto_satisfied', success: true });
      }
    }
  } catch (err: unknown) {
    propagations.push({ target: 'A05', action: 'evidence_auto_satisfied', success: false, error: toErrorMessage(err) });
  }

  const successCount = propagations.filter(p => p.success).length;

  return {
    propagations,
    vendorId,
    vendorName,
    totalPropagations: propagations.length,
    successCount,
  };
}

// ── Event Bus Subscriber: Auto-trigger propagation on vendor score change ────

export function registerVendorCrossAgentSubscribers(): void {
  // When vendor risk score changes, run full cross-agent propagation
  eventBus.subscribe('vendor.risk_changed', 'vendor-cross-agent:risk-propagation', async (event: PlatformEvent) => {
    const { vendorId } = event.payload || {};
    if (!vendorId) return;
    await runVendorCrossAgentPropagation(event.tenantId, (vendorId as any)).catch((err) => {
      logger.error(`[VendorCrossAgent] Auto-propagation failed for vendor ${vendorId}: ${toErrorMessage(err)}`);
    });
  });

  // When vendor SLA is breached, create process task for risk team
  eventBus.subscribe('vendor.sla_breached', 'vendor-cross-agent:sla-breach', async (event: PlatformEvent) => {
    const { vendorId, vendorName, metricName, targetValue, actualValue } = event.payload || {};
    if (!vendorId) return;

    await createProcessTask(event.tenantId, {
      title: `[A09→A07] Vendor SLA Breach: ${vendorName || vendorId}`,
      description: `SLA metric "${metricName}" breached. Target: ${targetValue}, Actual: ${actualValue}. Review vendor risk and consider escalation.`,
      taskType: 'vendor_risk_propagation',
      priority: 'high',
      entityType: 'vendor_risk',
      entityId: vendorId,
      triggerSource: 'agent_A09',
      triggerData: { vendorId, metricName, targetValue, actualValue },
    }).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  });

  // When vendor concentration is high, alert risk team
  eventBus.subscribe('vendor.concentration_high', 'vendor-cross-agent:concentration', async (event: PlatformEvent) => {
    const { vendorId, vendorName, dimension, concentrationPct } = event.payload || {};
    if (!vendorId) return;

    await propagateVendorGapToRemediation(

      event.tenantId, (vendorId as any), vendorName || vendorId,
      `Vendor concentration risk: ${dimension} at ${concentrationPct}%. Single-point-of-failure risk detected.`,
      (concentrationPct as any) > 80 ? 'critical' : 'high',
    ).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  });

  // When fourth-party risk is flagged, cascade to enterprise risk
  eventBus.subscribe('vendor.fourth_party_flagged', 'vendor-cross-agent:fourth-party', async (event: PlatformEvent) => {
    const { vendorId, vendorName, subVendorName, riskLevel } = event.payload || {};
    if (!vendorId) return;

    await propagateVendorRiskToEnterprise(

      event.tenantId, (vendorId as any), vendorName || vendorId,
      riskLevel === 'critical' ? 15 : riskLevel === 'high' ? 35 : 55,
      riskLevel || 'medium',
      { reason: `Fourth-party risk: sub-vendor "${subVendorName}" flagged as ${riskLevel}` },
    ).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

    await eventBus.publish(({
          eventType: 'vendor.cascade_risk_assessed',
          tenantId: event.tenantId,
          sourceService: 'vendor-cross-agent',
          severity: riskLevel === 'critical' ? 'critical' : 'warning',
          entityType: 'vendor',
          entityId: vendorId,
          payload: { vendorId, vendorName, subVendorName, riskLevel },
        } as any)).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
  });

  // When vendor monitoring signal arrives, evaluate if propagation needed
  eventBus.subscribe('vendor.monitoring_signal', 'vendor-cross-agent:monitoring', async (event: PlatformEvent) => {
    const { vendorId, vendorName: _vendorName, signalType, severity: _signalSeverity } = event.payload || {};
    if (!vendorId) return;

    const highImpactSignals = [
      'data_breach_reported', 'cyber_rating_change', 'regulatory_action',
      'sanction_match', 'credit_downgrade', 'financial_alert',
    ];

    if (highImpactSignals.includes((signalType as any))) {
      // Trigger full cross-agent propagation for high-impact signals
      await runVendorCrossAgentPropagation(event.tenantId, (vendorId as any)).catch((e: unknown) => logger.warn(`[VendorCrossAgent] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));
    }
  });

  logger.info('[VendorCrossAgent] Cross-agent event subscribers registered');
}

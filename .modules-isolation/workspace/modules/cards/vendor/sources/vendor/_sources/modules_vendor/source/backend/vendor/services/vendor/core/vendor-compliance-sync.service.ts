import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '../../../ports/logger.port';
// ============================================
// Shahin — Vendor Compliance Sync Service
// Proactively monitors vendor SLAs and validates
// vendor compliance gates. Creates tasks and
// triggers escalation on breaches/failures.
// Runs daily at 9:00 AM.
//
// Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { monitorSLA } from './vendor.service';
import { validateVendorGate } from '../../../../governance/services/misc/enforcement-gate.service.js';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { eventBus } from '../../../ports/events.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service.js';
import { createNotification } from '../../../../notification/services/notification.service.js';
import type { ComplianceSyncResult } from '@dos/types';
import { toErrorMessage } from '@dos/module-sdk';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

// ── Compliance Sync ────────────────────────────────────────────────────────

/**
 * Run vendor compliance sync cycle:
 * 1. Call monitorSLA() for each active vendor
 * 2. Call validateVendorGate() for each vendor
 * 3. On SLA breach: create high-priority task + trigger escalation
 * 4. On gate failure: publish vendor.gate_blocked + create remediation task
 *
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */
export async function runComplianceSync(tenantId: string): Promise<ComplianceSyncResult> {
  const startMs = Date.now();
  const schema = tenantSchema(tenantId);

  let vendorsChecked = 0;
  let slaBreaches = 0;
  let gateFailures = 0;
  let tasksCreated = 0;

  // Get all active vendors
  const vendorResult = await safeQuery(
    `SELECT vendor_id, name, risk_tier, assessment_score
     FROM "${schema}".vendors
     WHERE status IS NULL OR status != 'inactive'`,
  );

  for (const vendor of vendorResult.rows) {
    vendorsChecked++;

    // ── SLA Monitoring ──
    try {
      const slaStatus = await monitorSLA(tenantId, vendor.vendor_id);

      // Check for SLA breaches (expired or expiring_soon contracts)

      if (slaStatus.contractStatus === 'expired' || slaStatus.contractStatus === 'expiring_soon') {
        slaBreaches++;

        await createProcessTask(tenantId, {

          title: `SLA breach: ${vendor.name} — contract ${slaStatus.contractStatus}`,
          description:

            `Auto-generated: Vendor "${vendor.name}" has a ${slaStatus.contractStatus} contract. ` +

            `Days to expiry: ${slaStatus.daysToExpiry ?? 'N/A'}. Immediate action required.`,
          taskType: 'risk_assessment',
          priority: 'high',
          entityType: 'vendor',
          entityId: vendor.vendor_id,
          dueInHours: 168,
          triggerSource: 'vendor-compliance-sync',
          createdBy: 'system',
        });

        tasksCreated++;

        // Notify about the breach
        try {
          await createNotification(tenantId, {
            userId: SYSTEM_JOB_ACTOR,
            type: 'sla_breach',
            title: `SLA Breach: ${vendor.name}`,

            body: `Vendor contract is ${slaStatus.contractStatus}. Days to expiry: ${slaStatus.daysToExpiry ?? 'N/A'}`,
            link: `/vendors/${vendor.vendor_id}`,
          });
        } catch {
          // Non-fatal
        }
      }
    } catch {
      // Non-fatal: skip SLA check for this vendor on error
    }

    // ── Gate Validation ──
    try {
      const gateResult = await validateVendorGate(
        tenantId,
        vendor.vendor_id,
        vendor.name,
        vendor.assessment_score || 0,
        'system',
      );

      if (!gateResult.allowed) {
        gateFailures++;

        // Publish vendor.gate_blocked event
        await eventBus.publish({
          eventType: 'vendor.gate_blocked' as any,
          tenantId,

          sourceService: 'vendor-compliance-sync',
          entityType: 'vendor',
          entityId: vendor.vendor_id,
          severity: 'warning',
          payload: {
            vendorId: vendor.vendor_id,
            vendorName: vendor.name,
            reason: gateResult.reason,
            overrideAvailable: gateResult.overrideAvailable,
          },
        });

        await createProcessTask(tenantId, {
          title: `Gate blocked: ${vendor.name} — remediation required`,
          description:
            `Auto-generated: Vendor "${vendor.name}" failed compliance gate validation. ` +
            `Reason: ${gateResult.reason}. Remediation action required.`,
          taskType: 'remediation',
          priority: 'medium',
          entityType: 'vendor',
          entityId: vendor.vendor_id,
          dueInHours: 336,
          triggerSource: 'vendor-compliance-sync',
          createdBy: 'system',
        });

        tasksCreated++;
      }
    } catch {
      // Non-fatal: skip gate validation for this vendor on error
    }
  }

  // Record audit trail
  await recordAudit({
    tenantId,
    userId: SYSTEM_JOB_ACTOR,
    module: 'vendor-compliance-sync',
    action: 'create',
    entityType: 'compliance_sync_cycle',
    entityId: tenantId,
    afterState: { vendorsChecked, slaBreaches, gateFailures, tasksCreated },
  });

  // ── Cross-Agent: trigger vendor risk propagation for high-risk vendors ──
  try {
    const { runVendorCrossAgentPropagation } = await import('./vendor-cross-agent.service.js');
    const highRiskVendors = vendorResult.rows.filter(

      (v: unknown) => v.risk_tier === 'critical' || v.risk_tier === 'high',
    );
    for (const vendor of highRiskVendors) {
      await runVendorCrossAgentPropagation(tenantId, vendor.vendor_id).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch { /* cross-agent propagation non-fatal */ }

  return {
    tenantId,
    vendorsChecked,
    slaBreaches,
    gateFailures,
    tasksCreated,
    cycleMs: Date.now() - startMs,
  };
}

// ── Regulatory Change → Vendor Impact Assessment ─────────────────────────────

/**
 * When a regulatory change is detected (via A08 or framework update),
 * assess which vendors are affected and trigger re-assessment.
 * This bridges A08 (Policy Lifecycle) → A09 (Vendor Risk).
 */
export async function assessRegulatoryChangeVendorImpact(
  tenantId: string,
  frameworkCode: string,
  changeDescription: string,
  affectedControlCodes: string[],
): Promise<{ affectedVendors: number; tasksCreated: number }> {
  const schema = tenantSchema(tenantId);
  let affectedVendors = 0;
  let tasksCreated = 0;

  try {
    // Find vendors linked to affected controls via shared-responsibility
    const vendorRes = await safeQuery(
      `SELECT DISTINCT v.vendor_id, v.name, v.risk_rating
       FROM "${schema}".vendor_shared_responsibility vsr
       JOIN "${schema}".vendors v ON v.vendor_id = vsr.vendor_id AND v.status = 'active'
       WHERE vsr.control_id = ANY($1)
         AND vsr.ownership IN ('vendor', 'shared')`,
      [affectedControlCodes],
    );

    affectedVendors = vendorRes.rows.length;

    for (const vendor of vendorRes.rows) {
      // Create re-assessment task
      await createProcessTask(tenantId, {
        title: `[A08→A09] Regulatory change impact: reassess ${vendor.name}`,
        description: `Framework ${frameworkCode} regulatory change: ${changeDescription}. ` +
          `Vendor "${vendor.name}" has shared/vendor-owned controls affected. Re-assessment required.`,
        taskType: 'vendor_risk_propagation',
        priority: vendor.risk_rating === 'critical' ? 'critical' : 'high',
        entityType: 'vendor',
        entityId: vendor.vendor_id,
        triggerSource: 'regulatory-change-impact',
        triggerData: { frameworkCode, affectedControlCodes },
      }).catch(catchHandler(EC.EVENT_BUS, {}));
      tasksCreated++;

      // Flag vendor for next assessment date update
      await safeQuery(
        `UPDATE "${schema}".vendors
         SET next_assessment_date = LEAST(next_assessment_date, NOW() + INTERVAL '14 days'),
             updated_at = NOW()
         WHERE vendor_id = $1`,
        [vendor.vendor_id],
      ).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    if (affectedVendors > 0) {
      await eventBus.publish(({
              eventType: 'vendor.assessment_due',
              tenantId,
              sourceService: 'vendor-compliance-sync',
              severity: 'warning',
              entityType: 'vendor',
              payload: { frameworkCode, changeDescription, affectedVendors, tasksCreated },
            } as any));
    }
  } catch (err: unknown) {
    logger.error(`[VendorComplianceSync] Regulatory change vendor impact failed: ${toErrorMessage(err)}`);
  }

  return { affectedVendors, tasksCreated };
}

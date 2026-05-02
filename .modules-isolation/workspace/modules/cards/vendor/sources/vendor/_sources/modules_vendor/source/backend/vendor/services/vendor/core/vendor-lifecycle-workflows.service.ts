/**
 * Vendor Lifecycle Workflows Service — Due diligence, assessment, and offboarding workflows.
 *
 * Manages the vendor relationship lifecycle from onboarding through periodic
 * assessment to termination/offboarding.
 *
 * @owner vendor module (Law 2)
 */

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { emitEvent } from '../../../ports/events.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface DDWorkflowResult {
  workflowId: string;
  vendorId: string;
  status: string;
  steps: { stepCode: string; status: string; assignedTo?: string }[];
}

export interface OffboardingResult {
  offboardingId: string;
  vendorId: string;
  status: string;
  reason: string;
}

const DD_STEPS = [
  { code: 'initial_screening', name: 'Initial Screening', sequence: 1 },
  { code: 'financial_review', name: 'Financial Review', sequence: 2 },
  { code: 'security_assessment', name: 'Security Assessment', sequence: 3 },
  { code: 'compliance_check', name: 'Compliance Check', sequence: 4 },
  { code: 'legal_review', name: 'Legal Review', sequence: 5 },
  { code: 'risk_assessment', name: 'Risk Assessment', sequence: 6 },
  { code: 'final_approval', name: 'Final Approval', sequence: 7 },
];

/**
 * Initiate a due diligence workflow for a vendor.
 */
export async function initiateDDWorkflow(
  tenantId: string,
  vendorId: string,
  assessmentType: 'onboarding' | 'periodic' | 'renewal' = 'onboarding',
  initiatedBy: string = 'system',
): Promise<DDWorkflowResult | null> {
  const schema = tenantSchema(tenantId);
  try {
    // Create workflow record
    const { rows: wfRows } = await safeQuery(
      `INSERT INTO "${schema}".vendor_due_diligence
         (vendor_id, assessment_type, status, initiated_by, created_at, updated_at)
       VALUES ($1, $2, 'in_progress', $3, NOW(), NOW())
       RETURNING id`,
      [vendorId, assessmentType, initiatedBy],
    );
    if (wfRows.length === 0) return null;
    const workflowId = wfRows[0].id as string;

    // Create DD steps
    for (const step of DD_STEPS) {
      await safeQuery(
        `INSERT INTO "${schema}".vendor_dd_steps
           (due_diligence_id, step_code, step_name, sequence_no, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [workflowId, step.code, step.name, step.sequence],
      ).catch(catchHandler(EC.EVENT_BUS));
    }

    await emitEvent(({
          tenantId, userId: initiatedBy, module: 'vendor',
          event: 'dd_initiated', entityType: 'vendor', entityId: vendorId,
          data: { workflowId, assessmentType },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    logger.info('[VendorLifecycle] DD workflow initiated', { tenantId, vendorId, workflowId });

    return {
      workflowId,
      vendorId,
      status: 'in_progress',
      steps: DD_STEPS.map(s => ({ stepCode: s.code, status: 'pending' })),
    };
  } catch (err) {
    logger.error('[VendorLifecycle] initiateDDWorkflow failed', {
      tenantId, vendorId, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Complete a due diligence step.
 */
export async function completeDDWorkflow(
  tenantId: string,
  workflowId: string,
  stepCode: string,
  result: { passed: boolean; notes?: string; completedBy: string },
): Promise<{ success: boolean; allComplete: boolean }> {
  const schema = tenantSchema(tenantId);
  try {
    await safeQuery(
      `UPDATE "${schema}".vendor_dd_steps
       SET status = $1, notes = $2, completed_by = $3, completed_at = NOW()
       WHERE due_diligence_id = $4 AND step_code = $5`,
      [result.passed ? 'passed' : 'failed', result.notes ?? null, result.completedBy, workflowId, stepCode],
    );

    // Check if all steps complete
    const { rows } = await safeQuery(
      `SELECT COUNT(*) FILTER (WHERE status = 'pending') AS pending,
              COUNT(*) FILTER (WHERE status = 'failed') AS failed
       FROM "${schema}".vendor_dd_steps WHERE due_diligence_id = $1`,
      [workflowId],
    );
    const pending = parseInt(rows[0]?.pending ?? '0');
    const failed = parseInt(rows[0]?.failed ?? '0');
    const allComplete = pending === 0;

    if (allComplete) {
      const finalStatus = failed > 0 ? 'failed' : 'completed';
      await safeQuery(
        `UPDATE "${schema}".vendor_due_diligence SET status = $1, completed_at = NOW() WHERE id = $2`,
        [finalStatus, workflowId],
      );
    }

    return { success: true, allComplete };
  } catch (_err) {
    logger.error('[VendorLifecycle] completeDDWorkflow failed', { tenantId, workflowId, stepCode });
    return { success: false, allComplete: false };
  }
}

/**
 * Escalate overdue due diligence steps.
 */
export async function escalateOverdueDDSteps(
  tenantId: string,
  thresholdDays: number = 14,
): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `UPDATE "${schema}".vendor_dd_steps
       SET status = 'escalated', updated_at = NOW()
       WHERE status = 'pending'
         AND created_at < NOW() - ($1 || ' days')::interval
         AND escalated_at IS NULL
       RETURNING id`,
      [String(thresholdDays)],
    );
    if (rows.length > 0) {
      logger.info(`[VendorLifecycle] Escalated ${rows.length} overdue DD steps`, { tenantId });
    }
    return rows.length;
  } catch {
    return 0;
  }
}

/**
 * Initiate vendor offboarding.
 */
export async function initiateVendorOffboarding(
  tenantId: string,
  vendorId: string,
  reason: string,
  initiatedBy: string = 'system',
): Promise<OffboardingResult | null> {
  const schema = tenantSchema(tenantId);
  try {
    const { rows } = await safeQuery(
      `INSERT INTO "${schema}".vendor_offboarding
         (vendor_id, reason, status, initiated_by, created_at)
       VALUES ($1, $2, 'initiated', $3, NOW())
       RETURNING id`,
      [vendorId, reason, initiatedBy],
    );
    if (rows.length === 0) return null;

    // Update vendor status
    await safeQuery(
      `UPDATE "${schema}".vendors SET status = 'offboarding', updated_at = NOW() WHERE id = $1`,
      [vendorId],
    ).catch(catchHandler(EC.EVENT_BUS));

    await emitEvent(({
          tenantId, userId: initiatedBy, module: 'vendor',
          event: 'offboarding_initiated', entityType: 'vendor', entityId: vendorId,
          data: { reason, offboardingId: rows[0].id },
        } as any)).catch(catchHandler(EC.EVENT_BUS));

    return {
      offboardingId: rows[0].id as string,
      vendorId,
      status: 'initiated',
      reason,
    };
  } catch (_err) {
    logger.error('[VendorLifecycle] initiateVendorOffboarding failed', { tenantId, vendorId });
    return null;
  }
}

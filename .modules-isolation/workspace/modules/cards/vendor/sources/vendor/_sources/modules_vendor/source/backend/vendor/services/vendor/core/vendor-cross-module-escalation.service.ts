import { logger } from '../../../ports/logger.port';
// ============================================
// Vendor Cross-Module Escalation
// Covers: BCP test requirement creation for
// high-concentration vendors, and governance
// board attention items for critical-risk vendors.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { createProcessTask } from '../../../ports/lifecycle.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Vendor <-> BCP Integration ────────────────────────────────────────────────

/**
 * When vendor concentration is flagged as critical, create a BCP test requirement
 * so the BCP team validates continuity plans for that vendor dependency.
 */
export async function createBcpTestRequirementForVendor(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  concentrationPercentage: number,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Ensure bcp_test_requirements table exists
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".bcp_test_requirements (
      requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL DEFAULT 'vendor_concentration',
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      priority VARCHAR(20) DEFAULT 'high',
      status VARCHAR(30) DEFAULT 'pending',
      assigned_to UUID,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Avoid duplicate requirements for the same vendor
  const existingRes = await safeQuery(
    `SELECT requirement_id FROM "${schema}".bcp_test_requirements
     WHERE source_type = 'vendor_concentration' AND source_id = $1 AND status != 'completed'
     LIMIT 1`,
    [vendorId],
  );
  if (existingRes.rows.length > 0) {
    return getFirstRow(existingRes);
  }

  const dueDate = new Date(Date.now() + 14 * 24 * 3600_000); // 14-day deadline

  const result = await safeQuery(
    `INSERT INTO "${schema}".bcp_test_requirements
       (source_type, source_id, title, description, priority, due_date)
     VALUES ('vendor_concentration', $1, $2, $3, 'high', $4)
     RETURNING *`,
    [
      vendorId,
      `BCP Test: Vendor concentration - ${vendorName}`,
      `Vendor "${vendorName}" has ${concentrationPercentage}% concentration. Validate BCP continuity plans for service disruption scenario.`,
      dueDate.toISOString(),
    ],
  );

  const requirement = getFirstRow(result)!;

  // Create a process task for the BCP team
  await createProcessTask(tenantId, {
    title: `BCP Test Required: ${vendorName} vendor concentration at ${concentrationPercentage}%`,
    description: `High vendor concentration detected. Validate business continuity plans for ${vendorName}.`,
    taskType: 'verification',
    priority: 'high',
    entityType: 'bcp_test_requirement',
    entityId: requirement?.requirement_id,
    dueInHours: 14 * 24,
    triggerSource: 'vendor-enhancements',
    triggerData: { vendorId, vendorName, concentrationPercentage },
  }).catch((err: unknown) => {
    logger.warn(`[VendorEnhancements] BCP process task creation failed: ${(err instanceof Error ? err.message : String(err))}`);
  });

  await eventBus.publish(({
      eventType: 'bcp.exercise_scheduled',
      tenantId,
      sourceService: 'vendor-enhancements',
      severity: 'warning',
      entityType: 'bcp_test_requirement',
      entityId: requirement?.requirement_id,
      payload: { vendorId, vendorName, concentrationPercentage, requirementId: requirement?.requirement_id },
    } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  return requirement;
}

// ── Vendor <-> Governance Board Escalation ────────────────────────────────────

/**
 * When a vendor risk_tier changes to 'critical', create a board attention item
 * so the governance committee is informed and can take action.
 */
export async function createBoardAttentionItemForVendor(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  riskTier: string,
  riskScore: number,
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Ensure board_attention_items table exists
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".board_attention_items (
      item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type VARCHAR(50) NOT NULL,
      source_id UUID,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      severity VARCHAR(20) DEFAULT 'critical',
      status VARCHAR(30) DEFAULT 'pending_review',
      recommended_action TEXT,
      board_decision TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Avoid duplicate items for the same vendor in pending status
  const existingRes = await safeQuery(
    `SELECT item_id FROM "${schema}".board_attention_items
     WHERE source_type = 'vendor_critical_risk' AND source_id = $1
       AND status IN ('pending_review', 'under_discussion')
     LIMIT 1`,
    [vendorId],
  );
  if (existingRes.rows.length > 0) {
    return getFirstRow(existingRes);
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".board_attention_items
       (source_type, source_id, title, description, severity, recommended_action)
     VALUES ('vendor_critical_risk', $1, $2, $3, 'critical', $4)
     RETURNING *`,
    [
      vendorId,
      `Critical Vendor Risk: ${vendorName}`,
      `Vendor "${vendorName}" has been classified as risk tier "${riskTier}" with a risk score of ${riskScore}. Board review is required.`,
      'Consider accelerated due diligence, contract amendment, or contingency planning.',
    ],
  );

  const item = getFirstRow(result)!;

  await eventBus.publish(({
      eventType: 'governance.board_attention_item',
      tenantId,
      sourceService: 'vendor-enhancements',
      severity: 'critical',
      entityType: 'board_attention_item',
      entityId: item?.item_id,
      payload: { vendorId, vendorName, riskTier, riskScore, itemId: item?.item_id },
    } as any)).catch((e: unknown) => logger.warn(`[VendorEnhancements] Non-fatal: ${(e instanceof Error ? e.message : String(e))}`));

  return item;
}

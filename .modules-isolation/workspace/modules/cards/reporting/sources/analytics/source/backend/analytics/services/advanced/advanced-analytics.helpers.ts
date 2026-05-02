import { logger } from '../../ports/logger.port';
// ============================================
// Shahin-Ai — Advanced Analytics Helpers
// Shared helper functions for advanced analytics modules
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { AGRCOSCycleResult } from '@dos/types';

/**
 * Get latest AGRC-OS cycle result from tenant's cycle log
 */
export async function getLatestCycleResult(tenantId: string): Promise<AGRCOSCycleResult | null> {
  try {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(
      `SELECT
        cycle_id,
        telemetry_ingested,
        controls_evaluated,
        risks_recomputed,
        policy_decisions,
        enforcement_actions,
        audit_entries,
        cycle_ms,
        executed_at
       FROM "${schema}".agrc_os_cycle_log
       ORDER BY executed_at DESC
       LIMIT 1`
    );

    if (result.rows[0]) {
      const row = result.rows[0];
      return {
        tenantId: tenantId,
        telemetryIngested: row.telemetry_ingested || 0,
        controlsEvaluated: row.controls_evaluated || 0,
        risksRecomputed: row.risks_recomputed || 0,
        policyDecisions: row.policy_decisions || 0,
        enforcementActions: row.enforcement_actions || 0,
        auditEntries: row.audit_entries || 0,
        cycleMs: row.cycle_ms || 0,
        completedAt: row.executed_at?.toISOString() || new Date().toISOString(),
      } as unknown as AGRCOSCycleResult;
    }
  } catch (err: unknown) {
    // Non-fatal: cycle log may not exist yet
    logger.warn('[AdvancedAnalytics] Could not fetch cycle result:', err instanceof Error ? err.message : String(err));
  }

  return null;
}

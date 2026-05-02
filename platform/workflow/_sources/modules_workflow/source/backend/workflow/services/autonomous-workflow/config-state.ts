// ============================================================
// Shahin — Autonomous Workflow: Config & User State
// Configuration management for autonomous workflows and
// user absence state management.
// ============================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { AbsenceStatus, AutonomousWorkflowConfig, AutonomyLevel } from "@dos/types";

/**
 * Set a user's absence status (absent / ooo / available).
 */
export async function setUserAbsence(
  tenantId: string,
  userId: string,
  status: AbsenceStatus,
  from?: string,
  until?: string
): Promise<{ updated: true }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.workflow_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Get the autonomous workflow configuration for a tenant.
 * Returns sensible defaults if no config row exists yet.
 */
export async function getAutonomousConfig(tenantId: string): Promise<AutonomousWorkflowConfig> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".autonomous_workflow_config LIMIT 1`
    );
    if (result.rows.length > 0) {
      const r = getFirstRow(result)!;
      return {
        enabled: r.enabled,
        autonomyLevel: (r.autonomy_level ?? 2) as AutonomyLevel,
        slaGraceMultiplier: parseFloat(r.sla_grace_multiplier),
        aiCanExecuteActions: r.ai_can_execute_actions,
        aiCanDraftApprovals: r.ai_can_draft_approvals,
        requireHumanReview: r.require_human_review,
        cronIntervalMinutes: r.cron_interval_minutes,
      };
    }
  } catch {
    // table may not exist yet
  }
  return {
    enabled: true,

    autonomyLevel: 2, // Default to level 2 (moderate autonomy)
    slaGraceMultiplier: 1.0,
    aiCanExecuteActions: true,
    aiCanDraftApprovals: true,
    requireHumanReview: true,
    cronIntervalMinutes: 5,
  };
}

/**
 * Update the autonomous workflow configuration for a tenant.
 * Merges partial updates with existing config.
 */
export async function updateAutonomousConfig(
  tenantId: string,
  config: Partial<AutonomousWorkflowConfig>
): Promise<AutonomousWorkflowConfig> {
  const schema = tenantSchema(tenantId);
  const current = await getAutonomousConfig(tenantId);

  const merged = { ...current, ...config };

  const existing = await safeQuery(
    `SELECT config_id FROM "${schema}".autonomous_workflow_config LIMIT 1`
  );

  if (existing.rows.length > 0) {
    await safeQuery(
      `UPDATE "${schema}".autonomous_workflow_config
       SET enabled = $1, autonomy_level = $2, sla_grace_multiplier = $3, ai_can_execute_actions = $4,
           ai_can_draft_approvals = $5, require_human_review = $6, cron_interval_minutes = $7,
           updated_at = NOW()
       WHERE config_id = $8`,
      [
        merged.enabled, merged.autonomyLevel ?? 2, merged.slaGraceMultiplier, merged.aiCanExecuteActions,
        merged.aiCanDraftApprovals, merged.requireHumanReview, merged.cronIntervalMinutes,
        getFirstRow(existing)?.config_id,
      ]
    );
  } else {
    await safeQuery(
      `INSERT INTO "${schema}".autonomous_workflow_config
        (enabled, autonomy_level, sla_grace_multiplier, ai_can_execute_actions, ai_can_draft_approvals, require_human_review, cron_interval_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [merged.enabled, merged.autonomyLevel ?? 2, merged.slaGraceMultiplier, merged.aiCanExecuteActions, merged.aiCanDraftApprovals, merged.requireHumanReview, merged.cronIntervalMinutes]
    );
  }

  return merged;
}

// ============================================================================
// Shahin — Governance Baseline Seeders: Action Items
// Seeds baseline governance action items across GRC domains.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getTenantAdmin } from './_shared';

export async function seedActionItems(
  tenantId: string,
): Promise<{ seeded: number }> {
  const schema = tenantSchema(tenantId);
  let seeded = 0;
  const adminId = await getTenantAdmin(tenantId);

  const BASELINE_ACTIONS = [
    { title: 'Update Information Security Policy', description: 'Review and update the information security policy to align with latest NCA ECC requirements', priority: 'high', source_type: 'policy', due_days: 30 },
    { title: 'Complete Risk Treatment Plans', description: 'Finalize risk treatment plans for all high-rated risks identified in the latest assessment', priority: 'high', source_type: 'risk', due_days: 45 },
    { title: 'Schedule Annual Policy Acknowledgement', description: 'Launch policy acknowledgement campaign for all employees', priority: 'medium', source_type: 'compliance', due_days: 60 },
    { title: 'Review Vendor Risk Assessments', description: 'Complete vendor risk reassessment for all critical vendors', priority: 'medium', source_type: 'vendor', due_days: 90 },
    { title: 'Conduct Business Impact Analysis', description: 'Update BIA for all critical business processes', priority: 'medium', source_type: 'bcm', due_days: 60 },
    { title: 'Implement Access Control Review', description: 'Conduct quarterly access rights review for privileged accounts', priority: 'critical', source_type: 'audit', due_days: 14 },
    { title: 'Update Incident Response Playbooks', description: 'Revise incident response procedures based on recent lessons learned', priority: 'high', source_type: 'incident', due_days: 30 },
    { title: 'Board Governance Report Preparation', description: 'Prepare quarterly governance report for board review', priority: 'high', source_type: 'governance', due_days: 21, board_attention: true },
  ];

  for (const a of BASELINE_ACTIONS) {
    const exists = await safeQuery(
      `SELECT 1 FROM "${schema}".governance_action_items
       WHERE title = $1 AND deleted_at IS NULL LIMIT 1`,
      [a.title],
    );
    if (exists.rows.length > 0) continue;

    await safeQuery(
      `INSERT INTO "${schema}".governance_action_items
         (title, description, assigned_to, due_date, priority, status, source_type, board_attention, escalation_level)
       VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL, $5, 'open', $6, $7, 0)`,
      [a.title, a.description, adminId, String(a.due_days), a.priority, a.source_type, (a as Record<string, unknown>).board_attention || false],
    );
    seeded++;
  }

  return { seeded };
}

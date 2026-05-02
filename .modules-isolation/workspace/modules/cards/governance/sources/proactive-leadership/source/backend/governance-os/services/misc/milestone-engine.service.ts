// Milestone-engine — drives proactive leadership milestone evaluation.
// Backed by dos.proactive_leadership_milestones. Sibling
// proactive-signal-detection.service consumes evaluateMilestones to decide
// whether a detected signal warrants a board-level escalation.

import { safeQuery } from '@dos/db';

export type MilestoneStatus = 'pending' | 'achieved' | 'overdue' | 'cancelled';

export interface Milestone {
  milestoneId: string;
  tenantId: string;
  code: string;
  milestoneCode?: string;
  moduleCode?: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: MilestoneStatus;
  state?: string;
  health?: string;
  progressPct?: number;
  achievedAt?: string;
  metadata?: Record<string, unknown>;
}

export async function listMilestones(tenantId: string): Promise<Milestone[]> {
  try {
    const r = await safeQuery(
      `SELECT milestone_id, tenant_id, code, title, description, target_date,
              status, achieved_at, metadata
         FROM dos.proactive_leadership_milestones
        WHERE tenant_id = $1
        ORDER BY target_date NULLS LAST, code`,
      [tenantId],
    );
    return (r.rows as Record<string, unknown>[]).map((row) => ({
      milestoneId: row['milestone_id'] as string,
      tenantId: row['tenant_id'] as string,
      code: (row['code'] as string) ?? '',
      milestoneCode: (row['code'] as string) ?? '',
      moduleCode: (row['module_code'] as string) ?? 'governance-os',
      title: (row['title'] as string) ?? '',
      description: (row['description'] as string) ?? undefined,
      targetDate: (row['target_date'] as string) ?? undefined,
      status: (row['status'] as MilestoneStatus) ?? 'pending',
      state: (row['state'] as string) ?? (row['status'] as string) ?? 'pending',
      health: (row['health'] as string) ?? 'unknown',
      progressPct: typeof row['progress_pct'] === 'number' ? (row['progress_pct'] as number) : undefined,
      achievedAt: (row['achieved_at'] as string) ?? undefined,
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

export const getMilestoneInstances = listMilestones;

export async function evaluateMilestones(
  tenantId: string,
  signals: Array<{ name: string; value: number }> = [],
): Promise<{ achieved: Milestone[]; overdue: Milestone[]; pending: Milestone[] }> {
  const all = await listMilestones(tenantId);
  const now = new Date();
  const achieved: Milestone[] = [];
  const overdue: Milestone[] = [];
  const pending: Milestone[] = [];
  for (const m of all) {
    if (m.status === 'achieved') achieved.push(m);
    else if (m.targetDate && new Date(m.targetDate) < now && m.status !== 'cancelled') overdue.push(m);
    else if (m.status === 'pending') pending.push(m);
  }
  // Future: cross-reference signals to surface auto-achievement; today we
  // return the pure DB view.
  void signals;
  return { achieved, overdue, pending };
}

export async function markAchieved(tenantId: string, milestoneId: string): Promise<void> {
  try {
    await safeQuery(
      `UPDATE dos.proactive_leadership_milestones
          SET status = 'achieved', achieved_at = NOW()
        WHERE tenant_id = $1 AND milestone_id = $2`,
      [tenantId, milestoneId],
    );
  } catch { /* table absent */ }
}

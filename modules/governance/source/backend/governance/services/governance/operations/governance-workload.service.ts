import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

const OVERLOAD_THRESHOLD = 15;

export async function getWorkloadDashboard(tenantId: string) {
  const schema = tenantSchema(tenantId);

  const [actionsPerOwner, decisionsPerCommittee, overdueByOwner, moduleLoad] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT COALESCE(assigned_to, 'unassigned') AS owner,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','completed','cancelled'))::int AS open,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('closed','completed','cancelled'))::int AS overdue
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
      GROUP BY COALESCE(assigned_to, 'unassigned')
      ORDER BY open DESC
    `), { tenantId: tenantId, operation: 'query governance_action_items' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT gd.committee_id, t.name_en AS committee_name,
        COUNT(*)::int AS total_decisions,
        COUNT(*) FILTER (WHERE gd.status = 'pending')::int AS pending
      FROM "${schema}".governance_decisions gd
      LEFT JOIN "${schema}".teams t ON t.team_id = gd.committee_id AND t.committee_type IS NOT NULL
      WHERE gd.deleted_at IS NULL
      GROUP BY gd.committee_id, t.name_en
      ORDER BY pending DESC
    `), { tenantId: tenantId, operation: 'query governance_decisions' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT COALESCE(assigned_to, 'unassigned') AS owner,
        COUNT(*)::int AS overdue_count,
        MIN(due_date) AS earliest_due
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
        AND due_date < NOW()
        AND status NOT IN ('closed','completed','cancelled')
      GROUP BY COALESCE(assigned_to, 'unassigned')
      ORDER BY overdue_count DESC
    `), { tenantId: tenantId, operation: 'query governance_action_items' }),

    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT source_type AS module,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('closed','completed','cancelled'))::int AS open
      FROM "${schema}".governance_action_items
      WHERE deleted_at IS NULL
      GROUP BY source_type
      ORDER BY open DESC
    `), { tenantId: tenantId, operation: 'query governance_action_items' }),
  ]);

  const overloaded = actionsPerOwner.rows.filter((r: GenericRow) => r.open >= OVERLOAD_THRESHOLD);
  const recommendations: string[] = [];
  for (const o of overloaded) {
    recommendations.push(`Owner "${o.owner}" has ${o.open} open actions (threshold: ${OVERLOAD_THRESHOLD}). Consider reassignment.`);
  }

  const totalOpen = actionsPerOwner.rows.reduce((sum: number, r: Record<string, unknown>) => (sum as any) + r.open, 0);
  const totalOverdue = overdueByOwner.rows.reduce((sum: number, r: Record<string, unknown>) => (sum as any) + r.overdue_count, 0);
  const avgPerOwner = actionsPerOwner.rows.length > 0
    ? Math.round(totalOpen / actionsPerOwner.rows.length) : 0;

  return {
    actionsPerOwner: actionsPerOwner.rows,
    decisionsPerCommittee: decisionsPerCommittee.rows,
    overdueByOwner: overdueByOwner.rows,
    moduleLoad: moduleLoad.rows,
    overloaded,
    recommendations,
    summary: {
      totalOwners: actionsPerOwner.rows.length,
      totalOpen,
      totalOverdue,
      avgPerOwner,
      overloadedCount: overloaded.length,
      overloadThreshold: OVERLOAD_THRESHOLD,
    },
  };
}

export async function getOwnerWorkload(tenantId: string, ownerId: string) {
  const schema = tenantSchema(tenantId);
  const [actionsRes, decisionsRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT * FROM "${schema}".governance_action_items
      WHERE assigned_to = $1 AND deleted_at IS NULL
      ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, due_date ASC NULLS LAST
    `, [ownerId]), { tenantId: tenantId, operation: 'query governance_action_items' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT * FROM "${schema}".governance_decisions
      WHERE owner = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 50
    `, [ownerId]), { tenantId: tenantId, operation: 'query governance_action_items' }),
  ]);
  const actions = actionsRes.rows;
  const open = actions.filter((a: Record<string, unknown>) => !['closed', 'completed', 'cancelled'].includes((a as any).status));
  const overdue = open.filter((a: Record<string, unknown>) => a.due_date && new Date((a as any).due_date) < new Date());
  return {
    ownerId,
    actions,
    decisions: decisionsRes.rows,
    stats: {
      totalActions: actions.length,
      open: open.length,
      overdue: overdue.length,
      isOverloaded: open.length >= OVERLOAD_THRESHOLD,
    },
  };
}

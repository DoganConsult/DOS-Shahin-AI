import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { logger } from '../../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';

export interface GovernanceDashboardSummary {
  totalBodies: number;
  activeBodies: number;
  totalCommittees: number;
  activeMembers: number;
  totalResponsibilities: number;
  assignedResponsibilities: number;
  overdueResponsibilities: number;
  pendingReviews: number;
  blockedReviews: number;
  activeDelegations: number;
  expiredDelegations: number;
  boardPacksPending: number;
  chartersExpiringSoon: number;
  healthScore: number | null;
  capturedAt: string;
}

export async function getGovernanceDashboard(tenantId: string): Promise<GovernanceDashboardSummary> {
  const schema = tenantSchema(tenantId);
  try {
    const [bodies, members, responsibilities, reviews, delegations, boardPacks, charters] = await Promise.all([
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE body_type = 'committee')::int AS committees
         FROM "${schema}".governance_bodies WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, active: 0, committees: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS active
         FROM "${schema}".governance_committee_members
         WHERE status = 'active' AND deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ active: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::int AS assigned,
           COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'closed'))::int AS overdue
         FROM "${schema}".governance_responsibility_assignments WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, assigned: 0, overdue: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('pending', 'in_review'))::int AS pending,
           COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
         FROM "${schema}".governance_reviews WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending: 0, blocked: 0 }] })),
      safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE is_active = TRUE AND valid_to > NOW())::int AS active,
           COUNT(*) FILTER (WHERE is_active = TRUE AND valid_to <= NOW())::int AS expired
         FROM "${schema}".delegations`,
      ).catch(() => ({ rows: [{ active: 0, expired: 0 }] })),
      safeQuery(
        `SELECT COUNT(*) FILTER (WHERE status IN ('draft', 'assembling', 'review'))::int AS pending
         FROM "${schema}".governance_board_packs WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ pending: 0 }] })),
      safeQuery(
        `SELECT COUNT(*)::int AS expiring
         FROM "${schema}".governance_charters
         WHERE status = 'active' AND expiry_date IS NOT NULL
           AND expiry_date < NOW() + INTERVAL '30 days'
           AND expiry_date > NOW()
           AND deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ expiring: 0 }] })),
    ]);

    const b = bodies.rows[0] ?? {};
    const r = responsibilities.rows[0] ?? {};
    const rv = reviews.rows[0] ?? {};
    const d = delegations.rows[0] ?? {};

    const totalR = r.total ?? 0;
    const assignedR = r.assigned ?? 0;
    const overdueR = r.overdue ?? 0;
    const blockedRv = rv.blocked ?? 0;
    const score = totalR > 0
      ? parseFloat(Math.max(0, 100 - (overdueR / totalR) * 50 - blockedRv * 5).toFixed(1))
      : null;

    return {
      totalBodies: b.total ?? 0,
      activeBodies: b.active ?? 0,
      totalCommittees: b.committees ?? 0,
      activeMembers: members.rows[0]?.active ?? 0,
      totalResponsibilities: totalR,
      assignedResponsibilities: assignedR,
      overdueResponsibilities: overdueR,
      pendingReviews: rv.pending ?? 0,
      blockedReviews: blockedRv,
      activeDelegations: d.active ?? 0,
      expiredDelegations: d.expired ?? 0,
      boardPacksPending: boardPacks.rows[0]?.pending ?? 0,
      chartersExpiringSoon: charters.rows[0]?.expiring ?? 0,
      healthScore: score,
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[GovernanceDashboard] getGovernanceDashboard failed', { tenantId, error: toErrorMessage(err) });
    return {
      totalBodies: 0, activeBodies: 0, totalCommittees: 0, activeMembers: 0,
      totalResponsibilities: 0, assignedResponsibilities: 0, overdueResponsibilities: 0,
      pendingReviews: 0, blockedReviews: 0, activeDelegations: 0, expiredDelegations: 0,
      boardPacksPending: 0, chartersExpiringSoon: 0, healthScore: null,
      capturedAt: new Date().toISOString(),
    };
  }
}

export async function getCommitteeManagementSummary(tenantId: string): Promise<CommitteeSummary[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT gb.body_id, gb.name_en, gb.body_type, gb.status, gb.owner_id,
         (SELECT COUNT(*)::int FROM "${schema}".governance_committee_members gcm
          WHERE gcm.body_id = gb.body_id AND gcm.status = 'active' AND gcm.deleted_at IS NULL) AS member_count,
         (SELECT COUNT(*)::int FROM "${schema}".governance_responsibility_assignments gra
          WHERE gra.body_id = gb.body_id AND gra.status NOT IN ('completed', 'closed') AND gra.deleted_at IS NULL) AS open_responsibilities,
         (SELECT MAX(meeting_date) FROM "${schema}".governance_meetings gm
          WHERE gm.body_id = gb.body_id AND gm.deleted_at IS NULL) AS last_meeting
       FROM "${schema}".governance_bodies gb
       WHERE gb.body_type = 'committee' AND gb.deleted_at IS NULL
       ORDER BY gb.name_en`,
    ).catch(() => ({ rows: [] }));

    return result.rows.map((r: GenericRow) => ({
      bodyId: r.body_id,
      nameEn: r.name_en,
      status: r.status,
      ownerId: r.owner_id ?? null,
      memberCount: r.member_count ?? 0,
      openResponsibilities: r.open_responsibilities ?? 0,
      lastMeeting: r.last_meeting?.toISOString?.() ?? r.last_meeting ?? null,
    }));
  } catch (err) {
    logger.warn('[GovernanceDashboard] getCommitteeManagementSummary failed', { tenantId, error: toErrorMessage(err) });
    return [];
  }
}

export async function getResponsibilityAssignmentSummary(tenantId: string): Promise<AssignmentSummary> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::int AS assigned,
         COUNT(*) FILTER (WHERE assignee_id IS NULL)::int AS unassigned,
         COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'closed'))::int AS overdue,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         ROUND(
           COUNT(*) FILTER (WHERE assignee_id IS NOT NULL)::numeric /
           NULLIF(COUNT(*), 0) * 100, 1
         ) AS coverage_pct
       FROM "${schema}".governance_responsibility_assignments WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{}] }));

    const r = result.rows[0] ?? {};
    return {
      total: r.total ?? 0,
      assigned: r.assigned ?? 0,
      unassigned: r.unassigned ?? 0,
      overdue: r.overdue ?? 0,
      completed: r.completed ?? 0,
      coveragePercent: r.coverage_pct != null ? parseFloat(r.coverage_pct) : 0,
    };
  } catch (err) {
    logger.warn('[GovernanceDashboard] getResponsibilityAssignmentSummary failed', { tenantId, error: toErrorMessage(err) });
    return { total: 0, assigned: 0, unassigned: 0, overdue: 0, completed: 0, coveragePercent: 0 };
  }
}

export interface CommitteeSummary {
  bodyId: string;
  nameEn: string;
  status: string;
  ownerId: string | null;
  memberCount: number;
  openResponsibilities: number;
  lastMeeting: string | null;
}

export interface AssignmentSummary {
  total: number;
  assigned: number;
  unassigned: number;
  overdue: number;
  completed: number;
  coveragePercent: number;
}

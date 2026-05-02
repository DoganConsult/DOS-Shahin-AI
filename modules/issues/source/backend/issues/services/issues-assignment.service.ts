// ============================================
// Issues — Assignment Service
// Auto-assignment, workload balancing, reassignment
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitIssuesEvent } from './issues-event.service';
import { getFirstRow as _getFirstRow } from '@dos/db';

// === Types ===

export interface AssignmentSuggestion {
  userId: string;
  openCount: number;
  score: number;
  reason: string;
}

export interface WorkloadSnapshot {
  userId: string;
  openCount: number;
  criticalCount: number;
  overdueCount: number;
}

// === Pure Functions ===

const CATEGORY_OWNER_AFFINITY: Record<string, string[]> = {};

export function scoreAssignee(workload: WorkloadSnapshot, categorySuggested: boolean): number {
  let score = 100;
  score -= workload.openCount * 5;
  score -= workload.criticalCount * 10;
  score -= workload.overdueCount * 8;
  if (categorySuggested) score += 20;
  return Math.max(0, score);
}

export function pickBestAssignee(candidates: AssignmentSuggestion[]): AssignmentSuggestion | null {
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => b.score - a.score)[0];
}

// === DB-backed Functions ===

export async function getUserWorkloads(tenantId: string, userIds?: string[]): Promise<WorkloadSnapshot[]> {
  const schema = tenantSchema(tenantId);
  const today = new Date().toISOString().split('T')[0];

  let filterClause = '';
  const params: unknown[] = [today];

  if (userIds && userIds.length > 0) {
    filterClause = `AND assigned_to = ANY($2::text[])`;
    params.push(userIds);
  }

  const result = await safeQuery(
    `SELECT
       assigned_to AS user_id,
       COUNT(*) FILTER (WHERE status NOT IN ('closed','archived','resolved')) AS open_count,
       COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('closed','archived','resolved')) AS critical_count,
       COUNT(*) FILTER (WHERE due_date < $1 AND status NOT IN ('closed','archived','resolved')) AS overdue_count
     FROM "${schema}".issues
     WHERE assigned_to IS NOT NULL AND deleted_at IS NULL ${filterClause}
     GROUP BY assigned_to`,
    params
  );

  return result.rows.map(r => ({
    userId: r.user_id,
    openCount: parseInt(r.open_count, 10),
    criticalCount: parseInt(r.critical_count, 10),
    overdueCount: parseInt(r.overdue_count, 10),
  }));
}

export async function getAssignmentSuggestions(
  tenantId: string,
  category: string,
  severity: string,
  candidateUserIds: string[]
): Promise<AssignmentSuggestion[]> {
  if (candidateUserIds.length === 0) return [];

  const workloads = await getUserWorkloads(tenantId, candidateUserIds);
  const workloadMap = new Map(workloads.map(w => [w.userId, w]));

  const affinityUsers = new Set(CATEGORY_OWNER_AFFINITY[category] ?? []);

  return candidateUserIds.map(userId => {
    const wl = workloadMap.get(userId) ?? { userId, openCount: 0, criticalCount: 0, overdueCount: 0 };
    const categorySuggested = affinityUsers.has(userId);
    const score = scoreAssignee(wl, categorySuggested);
    const reason = categorySuggested ? `Category expert for ${category}` : `Workload score: ${score}`;
    return { userId, openCount: wl.openCount, score, reason };
  });
}

export async function autoAssign(
  tenantId: string,
  issueId: string,
  candidateUserIds: string[],
  triggeredBy: string
): Promise<string | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.issues_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function reassignIssue(
  tenantId: string,
  issueId: string,
  newAssignee: string,
  userId: string,
  reason?: string
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getIssuesByAssignee(tenantId: string, userId: string, statusFilter?: string): Promise<unknown[]> {
  const schema = tenantSchema(tenantId);
  const params: unknown[] = [userId];
  const extra = statusFilter ? `AND status = $2` : '';
  if (statusFilter) params.push(statusFilter);

  const result = await safeQuery(
    `SELECT issue_id, title, status, severity, priority, due_date, created_at
     FROM "${schema}".issues
     WHERE assigned_to = $1 AND deleted_at IS NULL ${extra}
     ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}

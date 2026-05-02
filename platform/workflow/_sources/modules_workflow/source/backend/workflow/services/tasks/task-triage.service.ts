// ============================================================
// Cooperative Workflow #1 — Smart Task Triage & Auto-Assignment
// Agent analyzes task complexity, team workload, skill match,
// then proposes assignments. Humans accept/reassign via one-click.
// ============================================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { TriageProposal } from '@dos/types';
import { getFirstRow } from '@dos/db';

// ── Generate Triage Proposals ──────────────────────────────────────────────

export async function generateTriageProposals(tenantId: string): Promise<TriageProposal[]> {
  const schema = tenantSchema(tenantId);
  const proposals: TriageProposal[] = [];

  // Get unassigned tasks
  const tasksRes = await safeQuery(
    `SELECT task_id, title, description, due_date, linked_entity_type
     FROM "${schema}".remediation_tasks
     WHERE (assigned_to IS NULL OR assigned_to = '')
       AND status NOT IN ('completed', 'resolved')
     ORDER BY due_date ASC NULLS LAST LIMIT 50`,
  );

  if (!tasksRes.rows.length) return [];

  // Get team members with workload
  const membersRes = await safeQuery(
    `SELECT u.user_id, u.display_name, u.role,
            COALESCE(wl.open_tasks, 0) AS open_tasks
     FROM "${schema}".unified_squad_members u
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS open_tasks
       FROM "${schema}".remediation_tasks t
       WHERE t.assigned_to = u.user_id AND t.status NOT IN ('completed', 'resolved')
     ) wl ON true
     WHERE u.is_agent = FALSE AND u.current_status != 'offline'`,
  );

  const members = membersRes.rows;
  if (!members.length) return [];

  for (const task of tasksRes.rows) {
    const best = pickBestAssignee(task, members);
    if (!best) continue;

    const propRes = await safeQuery(
      `INSERT INTO "${schema}".triage_proposals
         (task_id, task_title, proposed_assignee_id, proposed_assignee_name,
          agent_id, reasoning, confidence_score, workload_score, skill_match_score)
       VALUES ($1,$2,$3,$4,'AGENT-A01',$5,$6,$7,$8) RETURNING proposal_id, created_at`,
      [task.task_id, task.title, best.userId, best.displayName,
       best.reasoning, best.confidence, best.workloadScore, best.skillMatch],
    );

    proposals.push({
      proposalId: getFirstRow(propRes)?.proposal_id,
      taskId: task.task_id,
      taskTitle: task.title,
      proposedAssigneeId: best.userId,
      proposedAssigneeName: best.displayName,
      agentId: 'AGENT-A01',
      reasoning: best.reasoning,
      confidenceScore: best.confidence,
      workloadScore: best.workloadScore,
      skillMatchScore: best.skillMatch,
      status: 'pending',
      createdAt: getFirstRow(propRes)?.created_at,
    });
  }

  if (proposals.length > 0) {
    await eventBus.publish(({
          tenantId, eventType: 'triage.proposals_generated', severity: 'info',
          payload: { count: proposals.length },
        } as any));
  }

  return proposals;
}

// ── Resolve Proposal ───────────────────────────────────────────────────────

export async function resolveTriageProposal(tenantId: string, proposalId: string, decision: {
  action: 'accepted' | 'reassigned' | 'rejected';
  resolvedBy: string;
  newAssigneeId?: string;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".triage_proposals
       SET status = $1,
           resolved_by = $2,
           new_assignee_id = $3,
           resolved_at = NOW()
     WHERE proposal_id = $4`,
    [decision.action, decision.resolvedBy, decision.newAssigneeId ?? null, proposalId],
  );
}

// ── List Proposals ─────────────────────────────────────────────────────────

export async function listTriageProposals(tenantId: string, status?: string): Promise<TriageProposal[]> {
  const schema = tenantSchema(tenantId);
  const where = status ? `WHERE status = $1` : '';
  const params = status ? [status] : [];
  const res = await safeQuery(
    `SELECT * FROM "${schema}".triage_proposals ${where} ORDER BY created_at DESC LIMIT 100`, params,
  );
  return res.rows.map(mapProposal);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pickBestAssignee(task: any, members: unknown[]): {
  userId: string; displayName: string; reasoning: string;
  confidence: number; workloadScore: number; skillMatch: number;
} | null {
  if (!members.length) return null;

  const scored = members.map(m => {

    const workload = Math.max(0, 100 - (Number(m.open_tasks) || 0) * 15);

    const roleMatch = matchRoleToTask(m.role, task.linked_entity_type);
    const confidence = Math.round((workload * 0.4 + roleMatch * 0.6));

    return { userId: m.user_id, displayName: m.display_name || m.user_id, workload, roleMatch, confidence };
  });

  scored.sort((a, b) => b.confidence - a.confidence);
  const best = scored[0];

  return {
    userId: best.userId,
    displayName: best.displayName,
    reasoning: `Lowest workload (${best.workload}%) with role match score ${best.roleMatch}%. ${members.length} candidates evaluated.`,
    confidence: best.confidence,
    workloadScore: best.workload,
    skillMatch: best.roleMatch,
  };
}

function matchRoleToTask(role: string, entityType: string): number {
  const map: Record<string, string[]> = {
    compliance_officer: ['evidence_schedule', 'compliance'],
    risk_manager: ['risk'],
    auditor: ['audit', 'finding'],
    vendor_manager: ['vendor'],
  };
  for (const [r, types] of Object.entries(map)) {
    if (role?.includes(r) && types.some(t => entityType?.includes(t))) return 90;
  }
  return 50;
}

function mapProposal( r: Record<string, unknown>): TriageProposal {
  return {

    proposalId: r.proposal_id, taskId: r.task_id, taskTitle: r.task_title,

    proposedAssigneeId: r.proposed_assignee_id, proposedAssigneeName: r.proposed_assignee_name,

    agentId: r.agent_id, reasoning: r.reasoning,

    confidenceScore: r.confidence_score, workloadScore: r.workload_score,

    skillMatchScore: r.skill_match_score, status: r.status,

    resolvedBy: r.resolved_by, resolvedAt: r.resolved_at,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

// ============================================================
// Cooperative Workflow #5 — Approval Pre-Screening
// Agent pre-screens approval requests, attaches recommendation
// with supporting evidence and gaps before human approver sees it.
// ============================================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { ApprovalPreScreen } from '@dos/types';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Pre-Screen an Approval ─────────────────────────────────────────────────

export async function preScreenApproval(tenantId: string, approvalId: string): Promise<ApprovalPreScreen> {
  const schema = tenantSchema(tenantId);
  const analysis = await analyzeEntity(schema, 'approval', approvalId);
  return {
    tenantId,
    approvalId,
    agentId: 'approval-prescreen',
    recommendation: analysis.gapsFound.length > 3 ? 'reject' : analysis.gapsFound.length > 0 ? 'needs_review' : 'approve',
    confidenceScore: analysis.confidenceScore,
    summary: analysis.summary,
    supportingEvidence: analysis.supportingEvidence,
    gapsFound: analysis.gapsFound,
    createdAt: new Date().toISOString(),
  };
}

// ── Get Pre-Screen for Approval ────────────────────────────────────────────

export async function getPreScreen(tenantId: string, approvalId: string): Promise<ApprovalPreScreen | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".approval_pre_screens WHERE approval_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [approvalId],
  );
  if (!res.rows.length) return null;
  return mapPreScreen(getFirstRow(res));
}

export async function listPreScreens(tenantId: string, limit = 50): Promise<ApprovalPreScreen[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".approval_pre_screens ORDER BY created_at DESC LIMIT $1`, [limit],
  );
  return res.rows.map(mapPreScreen);
}

// ── Analysis Engine ────────────────────────────────────────────────────────

async function analyzeEntity(schema: string, entityType: string, entityId: string): Promise<{
  supportingEvidence: string[]; gapsFound: string[]; confidenceScore: number; summary: string;
}> {
  const evidence: string[] = [];
  const gaps: string[] = [];

  if (entityType === 'policy') {
    // Check if policy has required sections
    const policyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT title, status, content FROM "${schema}".policies WHERE policy_id = $1`, [entityId],
    ), { operation: 'query policies' });

    if (policyRes.rows.length) {
      const p = getFirstRow(policyRes)!;
      evidence.push(`Policy "${p.title}" exists with status: ${p.status}`);

      if (!p.content || p.content.length < 100) gaps.push('Policy content is too short or empty');
    } else {
      gaps.push('Policy entity not found');
    }

    // Check mapped controls
    const ctrlRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".controls WHERE policy_id = $1`, [entityId],
    ), { operation: 'query controls' });
    const ctrlCount = Number(getFirstRow(ctrlRes)?.cnt || 0);
    if (ctrlCount > 0) evidence.push(`${ctrlCount} controls mapped to this policy`);
    else gaps.push('No controls mapped to this policy');
  } else if (entityType === 'risk') {
    const riskRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT title, inherent_score, residual_score, owner FROM "${schema}".risks WHERE risk_id = $1`, [entityId],
    ), { operation: 'query risks' });

    if (riskRes.rows.length) {
      const r = getFirstRow(riskRes)!;
      evidence.push(`Risk "${r.title}" scored: inherent=${r.inherent_score}, residual=${r.residual_score}`);
      if (!r.owner) gaps.push('Risk has no assigned owner');
    } else {
      gaps.push('Risk entity not found');
    }
  } else {
    evidence.push(`Entity type "${entityType}" with ID ${entityId} referenced`);
  }

  const confidenceScore = Math.min(100, Math.max(0,
    50 + evidence.length * 15 - gaps.length * 20,
  ));

  const summary = gaps.length === 0
    ? `Agent recommends: Approve — ${evidence.length} supporting items found, 0 gaps.`
    : `Agent recommends: ${gaps.length > 3 ? 'Reject' : 'Review'} — ${gaps.length} gap(s) found: ${gaps.join('; ')}`;

  return { supportingEvidence: evidence, gapsFound: gaps, confidenceScore, summary };
}

function mapPreScreen( r: Record<string, unknown>): ApprovalPreScreen {
  return {

    preScreenId: r.pre_screen_id, approvalId: r.approval_id, agentId: r.agent_id,

    recommendation: r.recommendation,
    supportingEvidence: typeof r.supporting_evidence === 'string' ? JSON.parse(r.supporting_evidence) : r.supporting_evidence || [],
    gapsFound: typeof r.gaps_found === 'string' ? JSON.parse(r.gaps_found) : r.gaps_found || [],

    confidenceScore: r.confidence_score, summary: r.summary,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

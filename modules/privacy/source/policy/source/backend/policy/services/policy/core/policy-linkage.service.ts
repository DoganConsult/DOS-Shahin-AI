/**
 * Policy Linkage Service
 *
 * Manages bidirectional links between policies and other GRC entities
 * (controls, risks, issues, obligations). Provides coverage analysis
 * to identify governance gaps where entities lack policy coverage.
 */

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LinkData {
  linkType?: string;
  relevanceScore?: number;
  notes?: string;
  createdBy?: string;
}

export interface IssueLinkData {
  linkType?: string;
  notes?: string;
  createdBy?: string;
}

export interface PolicyLinks {
  controls: Record<string, unknown>[];
  risks: Record<string, unknown>[];
  obligations: Record<string, unknown>[];
  issues: Record<string, unknown>[];
}

export interface CoverageAnalysis {
  policiesWithoutControls: { count: number; items: Record<string, unknown>[] };
  policiesWithoutRisks: { count: number; items: Record<string, unknown>[] };
  controlsWithoutPolicy: { count: number; items: Record<string, unknown>[] };
  risksWithoutPolicy: { count: number; items: Record<string, unknown>[] };
  obligationsWithoutPolicy: { count: number; items: Record<string, unknown>[] };
}

// ── Control Links ────────────────────────────────────────────────────────────

/**
 * Link a policy to a control (upsert).
 * If the link already exists, updates the metadata fields.
 */
export async function linkPolicyToControl(
  tenantId: string,
  policyId: string,
  controlId: string,
  data?: LinkData,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `INSERT INTO "${schema}".policy_control_links
     (link_id, policy_id, control_id, link_type, relevance_score, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (policy_id, control_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_control_links.link_type),
         relevance_score = COALESCE(EXCLUDED.relevance_score, policy_control_links.relevance_score),
         notes = COALESCE(EXCLUDED.notes, policy_control_links.notes),
         updated_at = NOW()
     RETURNING *`,
    [
      uuid(),
      policyId,
      controlId,
      data?.linkType ?? 'implements',
      data?.relevanceScore ?? null,
      data?.notes ?? null,
      data?.createdBy ?? null,
    ],
  );

  return getFirstRow(res)!;
}

/**
 * Remove the link between a policy and a control.
 */
export async function unlinkPolicyFromControl(
  tenantId: string,
  policyId: string,
  controlId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `DELETE FROM "${schema}".policy_control_links
     WHERE policy_id = $1 AND control_id = $2
     RETURNING link_id`,
    [policyId, controlId],
  );

  return res.rows.length > 0;
}

// ── Risk Links ───────────────────────────────────────────────────────────────

/**
 * Link a policy to a risk (upsert).
 * If the link already exists, updates the metadata fields.
 */
export async function linkPolicyToRisk(
  tenantId: string,
  policyId: string,
  riskId: string,
  data?: LinkData,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `INSERT INTO "${schema}".policy_risk_links
     (link_id, policy_id, risk_id, link_type, relevance_score, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (policy_id, risk_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_risk_links.link_type),
         relevance_score = COALESCE(EXCLUDED.relevance_score, policy_risk_links.relevance_score),
         notes = COALESCE(EXCLUDED.notes, policy_risk_links.notes),
         updated_at = NOW()
     RETURNING *`,
    [
      uuid(),
      policyId,
      riskId,
      data?.linkType ?? 'mitigates',
      data?.relevanceScore ?? null,
      data?.notes ?? null,
      data?.createdBy ?? null,
    ],
  );

  return getFirstRow(res)!;
}

/**
 * Remove the link between a policy and a risk.
 */
export async function unlinkPolicyFromRisk(
  tenantId: string,
  policyId: string,
  riskId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `DELETE FROM "${schema}".policy_risk_links
     WHERE policy_id = $1 AND risk_id = $2
     RETURNING link_id`,
    [policyId, riskId],
  );

  return res.rows.length > 0;
}

// ── Issue Links ──────────────────────────────────────────────────────────────

/**
 * Link a policy to an issue (upsert).
 * If the link already exists, updates the metadata fields.
 */
export async function linkPolicyToIssue(
  tenantId: string,
  policyId: string,
  issueId: string,
  data?: IssueLinkData,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `INSERT INTO "${schema}".policy_issue_links
     (link_id, policy_id, issue_id, link_type, notes, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (policy_id, issue_id) DO UPDATE
     SET link_type = COALESCE(EXCLUDED.link_type, policy_issue_links.link_type),
         notes = COALESCE(EXCLUDED.notes, policy_issue_links.notes),
         updated_at = NOW()
     RETURNING *`,
    [
      uuid(),
      policyId,
      issueId,
      data?.linkType ?? 'addresses',
      data?.notes ?? null,
      data?.createdBy ?? null,
    ],
  );

  return getFirstRow(res)!;
}

/**
 * Remove the link between a policy and an issue.
 */
export async function unlinkPolicyFromIssue(
  tenantId: string,
  policyId: string,
  issueId: string,
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `DELETE FROM "${schema}".policy_issue_links
     WHERE policy_id = $1 AND issue_id = $2
     RETURNING link_id`,
    [policyId, issueId],
  );

  return res.rows.length > 0;
}

// ── Aggregated Links ─────────────────────────────────────────────────────────

/**
 * Get all links for a policy across all entity types.
 * Includes entity titles via LEFT JOIN for display purposes.
 */
export async function getPolicyLinks(
  tenantId: string,
  policyId: string,
): Promise<PolicyLinks> {
  const schema = tenantSchema(tenantId);

  // Controls
  const controlsRes = await safeQuery(
    `SELECT pcl.*,
            c.title AS control_title
     FROM "${schema}".policy_control_links pcl
     LEFT JOIN "${schema}".controls c ON c.control_id = pcl.control_id
     WHERE pcl.policy_id = $1
     ORDER BY pcl.created_at DESC`,
    [policyId],
  );

  // Risks
  const risksRes = await safeQuery(
    `SELECT prl.*,
            r.title AS risk_title
     FROM "${schema}".policy_risk_links prl
     LEFT JOIN "${schema}".risks r ON r.risk_id = prl.risk_id
     WHERE prl.policy_id = $1
     ORDER BY prl.created_at DESC`,
    [policyId],
  );

  // Obligations
  const obligationsRes = await safeQuery(
    `SELECT opl.*,
            o.title AS obligation_title
     FROM "${schema}".obligation_policy_links opl
     LEFT JOIN "${schema}".obligations o ON o.obligation_id = opl.obligation_id
     WHERE opl.policy_id = $1
     ORDER BY opl.created_at DESC`,
    [policyId],
  );

  // Issues
  const issuesRes = await safeQuery(
    `SELECT pil.*,
            i.title AS issue_title
     FROM "${schema}".policy_issue_links pil
     LEFT JOIN "${schema}".issues i ON i.issue_id = pil.issue_id
     WHERE pil.policy_id = $1
     ORDER BY pil.created_at DESC`,
    [policyId],
  );

  return {
    controls: controlsRes.rows,
    risks: risksRes.rows,
    obligations: obligationsRes.rows,
    issues: issuesRes.rows,
  };
}

// ── Coverage Analysis ────────────────────────────────────────────────────────

/**
 * Compute coverage analysis identifying governance gaps.
 * Returns counts and lists of entities that lack cross-references:
 * policies without controls, policies without risks, controls without
 * a governing policy, risks without a governing policy, and obligations
 * without a linked policy.
 */
export async function getCoverageAnalysis(
  tenantId: string,
): Promise<CoverageAnalysis> {
  const schema = tenantSchema(tenantId);

  // Policies without any control links
  const pwcRes = await safeQuery(
    `SELECT gp.policy_id, gp.title
     FROM "${schema}".policies gp
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.policy_id = gp.policy_id
     WHERE pcl.link_id IS NULL
       AND gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`,
    [],
  );

  // Policies without any risk links
  const pwrRes = await safeQuery(
    `SELECT gp.policy_id, gp.title
     FROM "${schema}".policies gp
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.policy_id = gp.policy_id
     WHERE prl.link_id IS NULL
       AND gp.status NOT IN ('retired', 'archived')
     ORDER BY gp.title`,
    [],
  );

  // Controls without a governing policy
  const cwpRes = await safeQuery(
    `SELECT c.control_id, c.title
     FROM "${schema}".controls c
     LEFT JOIN "${schema}".policy_control_links pcl ON pcl.control_id = c.control_id
     WHERE pcl.link_id IS NULL
     ORDER BY c.title`,
    [],
  );

  // Risks without a governing policy
  const rwpRes = await safeQuery(
    `SELECT r.risk_id, r.title
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".policy_risk_links prl ON prl.risk_id = r.risk_id
     WHERE prl.link_id IS NULL
     ORDER BY r.title`,
    [],
  );

  // Obligations without a linked policy
  const owpRes = await safeQuery(
    `SELECT o.obligation_id, o.title
     FROM "${schema}".obligations o
     LEFT JOIN "${schema}".obligation_policy_links opl ON opl.obligation_id = o.obligation_id
     WHERE opl.policy_id IS NULL
     ORDER BY o.title`,
    [],
  );

  return {
    policiesWithoutControls: { count: pwcRes.rows.length, items: pwcRes.rows },
    policiesWithoutRisks: { count: pwrRes.rows.length, items: pwrRes.rows },
    controlsWithoutPolicy: { count: cwpRes.rows.length, items: cwpRes.rows },
    risksWithoutPolicy: { count: rwpRes.rows.length, items: rwpRes.rows },
    obligationsWithoutPolicy: { count: owpRes.rows.length, items: owpRes.rows },
  };
}

/**
 * Get obligation coverage — all obligations with their linked policy info.
 * Shows which obligations are covered by policies and which are orphaned.
 */
export async function getObligationCoverage(
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT o.obligation_id,
            o.title AS obligation_title,
            o.status AS obligation_status,
            o.source AS obligation_source,
            opl.policy_id,
            gp.title AS policy_title,
            gp.status AS policy_status,
            CASE WHEN opl.policy_id IS NOT NULL THEN true ELSE false END AS is_covered
     FROM "${schema}".obligations o
     LEFT JOIN "${schema}".obligation_policy_links opl ON opl.obligation_id = o.obligation_id
     LEFT JOIN "${schema}".policies gp ON gp.policy_id = opl.policy_id
     ORDER BY o.title`,
    [],
  );

  return res.rows;
}

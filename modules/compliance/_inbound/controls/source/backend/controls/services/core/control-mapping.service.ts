// ============================================
// AGRC-OS — Control Mapping Service
// Coverage queries and link management for
// control-to-risk, control-to-obligation, and
// control-to-policy mappings.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface RiskLink {
  control_id: string;
  risk_id: string;
}

export interface ObligationLink {
  control_id: string;
  obligation_id: string;
  coverage_percent: number;
}

export interface PolicyLink {
  control_id: string;
  policy_id: string;
  link_type: string;
}

/** Coverage summary across all controls */
export interface ControlCoverage {
  totalControls: number;
  controlsWithRiskLinks: number;
  controlsWithObligationLinks: number;
  controlsWithPolicyLinks: number;
  unmappedControls: number;
  riskLinks: RiskLink[];
  obligationLinks: ObligationLink[];
  policyLinks: PolicyLink[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlMappingService {
  /**
   * Returns coverage statistics and all active links across
   * risks, obligations, and policies for the tenant's controls.
   */
  async getCoverage(tenantId: string): Promise<ControlCoverage> {
    const schema = tenantSchema(tenantId);

    const [
      totalResult,
      riskLinkedResult,
      obligationLinkedResult,
      policyLinkedResult,
      riskLinksResult,
      obligationLinksResult,
      policyLinksResult,
    ] = await Promise.all([
      // Total active controls
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.controls
          WHERE deleted_at IS NULL`,
        []
      ),

      // Controls with at least one risk link
      safeQuery(
        `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM ${schema}.control_risk_links`,
        []
      ),

      // Controls with at least one obligation link
      safeQuery(
        `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM ${schema}.control_obligation_mappings`,
        []
      ),

      // Controls with at least one policy link
      safeQuery(
        `SELECT COUNT(DISTINCT control_id)::int AS count
           FROM ${schema}.control_policy_links`,
        []
      ),

      // All risk links
      safeQuery(
        `SELECT control_id, risk_id
           FROM ${schema}.control_risk_links
          ORDER BY control_id`,
        []
      ),

      // All obligation links
      safeQuery(
        `SELECT control_id, obligation_id, coverage_percent
           FROM ${schema}.control_obligation_mappings
          ORDER BY control_id`,
        []
      ),

      // All policy links
      safeQuery(
        `SELECT control_id, policy_id, link_type
           FROM ${schema}.control_policy_links
          ORDER BY control_id`,
        []
      ),
    ]);

    const total = totalResult.rows[0]?.count ?? 0;
    const withRisk = riskLinkedResult.rows[0]?.count ?? 0;
    const withObligation = obligationLinkedResult.rows[0]?.count ?? 0;
    const withPolicy = policyLinkedResult.rows[0]?.count ?? 0;

    // Unmapped = controls that have zero links of any kind
    const unmappedResult = await safeQuery(
      `SELECT COUNT(*)::int AS count
         FROM ${schema}.controls c
        WHERE c.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM ${schema}.control_risk_links rl WHERE rl.control_id = c.control_id)
          AND NOT EXISTS (SELECT 1 FROM ${schema}.control_obligation_mappings om WHERE om.control_id = c.control_id)
          AND NOT EXISTS (SELECT 1 FROM ${schema}.control_policy_links pl WHERE pl.control_id = c.control_id)`,
      []
    );

    return {
      totalControls: total,
      controlsWithRiskLinks: withRisk,
      controlsWithObligationLinks: withObligation,
      controlsWithPolicyLinks: withPolicy,
      unmappedControls: unmappedResult.rows[0]?.count ?? 0,

      riskLinks: riskLinksResult.rows.map(( r: Record<string, unknown>) => ({
        control_id: r.control_id,
        risk_id: r.risk_id,
      })),

      obligationLinks: obligationLinksResult.rows.map(( r: Record<string, unknown>) => ({
        control_id: r.control_id,
        obligation_id: r.obligation_id,
        coverage_percent: r.coverage_percent,
      })),

      policyLinks: policyLinksResult.rows.map(( r: Record<string, unknown>) => ({
        control_id: r.control_id,
        policy_id: r.policy_id,
        link_type: r.link_type,
      })),
    };
  }

  /**
   * Returns gap analysis: controls with no risk links and
   * obligations with no control coverage.
   */
  async getGaps(tenantId: string): Promise<{
    controlsWithoutRiskLinks: Array<{ control_id: string; title: string }>;
    obligationsWithoutControlLinks: Array<{ obligation_id: string; title: string }>;
  }> {
    const schema = tenantSchema(tenantId);

    const [controlGaps, obligationGaps] = await Promise.all([
      // Controls that have no risk links
      safeQuery(
        `SELECT c.control_id, c.title
           FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM ${schema}.control_risk_links rl
               WHERE rl.control_id = c.control_id
            )
          ORDER BY c.title`,
        []
      ),

      // Obligations that have no control links
      safeQuery(
        `SELECT o.obligation_id, o.title
           FROM ${schema}.obligations o
          WHERE NOT EXISTS (
              SELECT 1 FROM ${schema}.control_obligation_mappings om
               WHERE om.obligation_id = o.obligation_id
            )
          ORDER BY o.title`,
        []
      ),
    ]);

    return {

      controlsWithoutRiskLinks: controlGaps.rows.map(( r: Record<string, unknown>) => ({
        control_id: r.control_id,
        title: r.title,
      })),

      obligationsWithoutControlLinks: obligationGaps.rows.map(( r: Record<string, unknown>) => ({
        obligation_id: r.obligation_id,
        title: r.title,
      })),
    };
  }

  /**
   * Detects duplicate controls: controls with identical titles
   * or overlapping obligation coverage (same obligation mapped
   * to multiple controls).
   */
  async getDuplicates(tenantId: string): Promise<{
    duplicateTitles: Array<{ title: string; control_ids: string[]; count: number }>;
    overlappingObligations: Array<{ obligation_id: string; obligation_title: string; control_ids: string[]; count: number }>;
  }> {
    const schema = tenantSchema(tenantId);

    const [titleDups, obligationOverlaps] = await Promise.all([
      // Controls sharing the same title (case-insensitive)
      safeQuery(
        `SELECT LOWER(c.title) AS title,
                ARRAY_AGG(c.control_id ORDER BY c.control_id) AS control_ids,
                COUNT(*)::int AS count
           FROM ${schema}.controls c
          WHERE c.deleted_at IS NULL
          GROUP BY LOWER(c.title)
         HAVING COUNT(*) > 1
          ORDER BY count DESC`,
        []
      ),

      // Obligations mapped to more than one control
      safeQuery(
        `SELECT om.obligation_id,
                o.title AS obligation_title,
                ARRAY_AGG(om.control_id ORDER BY om.control_id) AS control_ids,
                COUNT(*)::int AS count
           FROM ${schema}.control_obligation_mappings om
           LEFT JOIN ${schema}.obligations o ON o.obligation_id = om.obligation_id
          GROUP BY om.obligation_id, o.title
         HAVING COUNT(*) > 1
          ORDER BY count DESC`,
        []
      ),
    ]);

    return {

      duplicateTitles: titleDups.rows.map(( r: Record<string, unknown>) => ({
        title: r.title,
        control_ids: r.control_ids,
        count: r.count,
      })),

      overlappingObligations: obligationOverlaps.rows.map(( r: Record<string, unknown>) => ({
        obligation_id: r.obligation_id,
        obligation_title: r.obligation_title,
        control_ids: r.control_ids,
        count: r.count,
      })),
    };
  }

  /**
   * Creates a link between a control and a risk.
   * Uses INSERT ... ON CONFLICT DO NOTHING to avoid duplicates.
   */
  async linkRisk(
    tenantId: string,
    controlId: string,
    riskId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO ${schema}.control_risk_links (control_id, risk_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [controlId, riskId]
    );
  }

  /**
   * Creates a link between a control and a regulatory obligation.
   * Defaults coverage_percent to 100 if not tracked separately.
   */
  async linkObligation(
    tenantId: string,
    controlId: string,
    obligationId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO ${schema}.control_obligation_mappings (control_id, obligation_id, coverage_percent)
       VALUES ($1, $2, 100)
       ON CONFLICT DO NOTHING`,
      [controlId, obligationId]
    );
  }

  /**
   * Creates a link between a control and a policy.
   * link_type defaults to 'implements'.
   */
  async linkPolicy(
    tenantId: string,
    controlId: string,
    policyId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO ${schema}.control_policy_links (control_id, policy_id, link_type)
       VALUES ($1, $2, 'implements')
       ON CONFLICT DO NOTHING`,
      [controlId, policyId]
    );
  }

  /**
   * Removes a link by composite key. Attempts deletion from all three
   * link tables; exactly one will match for a valid linkId pair.
   * linkId is expected to be the foreign key value (risk_id, obligation_id, or policy_id).
   */
  async removeLink(
    tenantId: string,
    controlId: string,
    linkId: string
  ): Promise<void> {
    const schema = tenantSchema(tenantId);

    // Try all three tables — only the matching one will delete rows
    await Promise.all([
      safeQuery(
        `DELETE FROM ${schema}.control_risk_links
          WHERE control_id = $1 AND risk_id = $2`,
        [controlId, linkId]
      ),
      safeQuery(
        `DELETE FROM ${schema}.control_obligation_mappings
          WHERE control_id = $1 AND obligation_id = $2`,
        [controlId, linkId]
      ),
      safeQuery(
        `DELETE FROM ${schema}.control_policy_links
          WHERE control_id = $1 AND policy_id = $2`,
        [controlId, linkId]
      ),
    ]);
  }
}

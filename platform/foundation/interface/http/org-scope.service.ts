/**
 * Foundation org-scope service — derives a user's effective enterprise
 * scope from their primary position assignment and the BU/org/department
 * ancestor chains. Consumed by DAuth's ABAC step (via the access-snapshot
 * passthrough) and by the FE access-snapshot consumer.
 *
 * Source of truth is dos.* (canonical hierarchy). This file does NOT
 * compute permissions — that is DAuth's job.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

const MAX_DEPTH = 10;

export interface OrgScope {
  userId: string;
  tenantId: string;
  primaryPosition: {
    position_id: string;
    title_en: string;
    title_ar: string | null;
    code: string | null;
    level: number | null;
  } | null;
  /** Ordered from leaf (user's BU) to root. */
  businessUnits: Array<{ bu_id: string; name_en: string; code: string | null; depth: number }>;
  /** Ordered from leaf (user's org) to root. */
  organizations: Array<{ organization_id: string; name_en: string; code: string | null; org_type: string | null; depth: number }>;
  /** All position ids the user holds (primary first). */
  allPositionIds: string[];
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function getOrgScope(tenantId: string, userId: string): Promise<OrgScope> {
  return track('foundation.org_scope.resolve', async () =>
    withTenantClient(tenantId, async (c) => {
      // 1) Primary position + all positions held by the user
      const positions = await c.query(
        `SELECT p.position_id, p.title_en, p.title_ar, p.code, p.level, p.bu_id, pa.is_primary
           FROM dos.position_assignments pa
           JOIN dos.positions p ON p.position_id = pa.position_id
          WHERE pa.tenant_id = $1 AND pa.user_id = $2 AND pa.ended_at IS NULL
            AND p.deleted_at IS NULL
          ORDER BY pa.is_primary DESC, pa.assigned_at DESC`,
        [tenantId, userId],
      );

      const allPositionIds = positions.rows.map((r) => r.position_id as string);
      const primary = positions.rows.find((r) => r.is_primary) ?? positions.rows[0];

      if (!primary) {
        return {
          userId, tenantId, primaryPosition: null,
          businessUnits: [], organizations: [], allPositionIds,
        };
      }

      // 2) BU ancestor chain via parent_bu_id
      const buRows = primary.bu_id
        ? (await c.query(
            `WITH RECURSIVE bu_chain AS (
               SELECT bu_id, name_en, code, parent_bu_id, organization_id, 0 AS depth
                 FROM dos.business_units
                WHERE bu_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
               UNION ALL
               SELECT b.bu_id, b.name_en, b.code, b.parent_bu_id, b.organization_id, c.depth + 1
                 FROM dos.business_units b
                 JOIN bu_chain c ON b.bu_id = c.parent_bu_id
                WHERE b.tenant_id = $2 AND b.deleted_at IS NULL AND c.depth < ${MAX_DEPTH}
             )
             SELECT bu_id, name_en, code, organization_id, depth FROM bu_chain ORDER BY depth ASC`,
            [primary.bu_id, tenantId],
          )).rows
        : [];

      // 3) Org ancestor chain — start from the BU's organization, then walk parent_id
      const rootOrgId = buRows.find((r) => r.organization_id)?.organization_id as string | undefined;
      const orgRows = rootOrgId
        ? (await c.query(
            `WITH RECURSIVE org_chain AS (
               SELECT organization_id, name_en, code, org_type, parent_id, 0 AS depth
                 FROM dos.organizations
                WHERE organization_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
               UNION ALL
               SELECT o.organization_id, o.name_en, o.code, o.org_type, o.parent_id, c.depth + 1
                 FROM dos.organizations o
                 JOIN org_chain c ON o.organization_id = c.parent_id
                WHERE o.tenant_id = $2 AND o.deleted_at IS NULL AND c.depth < ${MAX_DEPTH}
             )
             SELECT organization_id, name_en, code, org_type, depth FROM org_chain ORDER BY depth ASC`,
            [rootOrgId, tenantId],
          )).rows
        : [];

      return {
        userId, tenantId,
        primaryPosition: {
          position_id: primary.position_id,
          title_en: primary.title_en,
          title_ar: primary.title_ar,
          code: primary.code,
          level: primary.level,
        },
        businessUnits: buRows.map((r) => ({
          bu_id: r.bu_id, name_en: r.name_en, code: r.code, depth: Number(r.depth),
        })),
        organizations: orgRows.map((r) => ({
          organization_id: r.organization_id, name_en: r.name_en, code: r.code,
          org_type: r.org_type, depth: Number(r.depth),
        })),
        allPositionIds,
      };
    }),
  );
}

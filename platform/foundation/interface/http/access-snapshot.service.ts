/**
 * Foundation access-snapshot composer — assembles the user's full access
 * snapshot from Foundation-owned data (org scope, manager chain, current
 * position, inherited policies) plus DAuth-owned identity/permission data
 * obtained via the registered authz evaluator's diagnostics OR via a
 * downstream call when available.
 *
 * Why this lives in Foundation
 * ────────────────────────────
 * The user-facing endpoint is `/api/foundation/access-snapshot` per the
 * 5-brain architecture: Foundation is the entry point for "what does this
 * user see / belong to?" The DAuth layer at /api/auth/access still exists
 * and is the source of truth for the permission/role parts; this service
 * augments those fields with Foundation's hierarchy data and presents the
 * unified shape the FE consumes.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';
import { getOrgScope, type OrgScope } from './org-scope.service';
import { getManagerChain, type ManagerChainEntry } from './org-hierarchy.service';
import { getInheritance } from './inheritance.service';

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export interface DeniedActionEntry {
  actionCode: string;
  reasonCode: string;
  correlationId?: string;
}

export interface PendingApprovalEntry {
  entityType: string;
  entityId: string;
  requiredAuthority: string;
  requestedAt: string;
}

export interface SlaBreachEntry {
  entityType: string;
  entityId: string;
  breachAt: string;
  escalationLevel: number;
}

export interface EscalationEntry {
  entityType: string;
  entityId: string;
  escalatedTo: string;
  reason: string;
}

export interface InheritedPolicyEntry {
  policyCode: string;
  source: string;
  level: number;
}

export interface FoundationAccessSnapshot {
  actor: {
    userId: string;
    tenantId: string;
  };
  /** From Foundation: primary position metadata. */
  currentPosition: OrgScope['primaryPosition'];
  /** Derived role-profile code (best-effort; refined by DAuth when present). */
  currentRoleProfile: string | null;
  /** Foundation org/BU ancestor chain. */
  orgScope: {
    businessUnits: OrgScope['businessUnits'];
    organizations: OrgScope['organizations'];
    allPositionIds: string[];
  };
  /** Manager chain from primary position upward. */
  managerChain: ManagerChainEntry[];
  /** Pending approvals where the user is the maker; from authz_decision_log. */
  pendingApprovals: PendingApprovalEntry[];
  /** Denials in the recent window — debug aid for FE. Capped at 50. */
  deniedActions: DeniedActionEntry[];
  /** SLA breaches for entities the user owns or supervises. */
  slaBreaches: SlaBreachEntry[];
  /** Escalations where the user is currently the escalation target. */
  escalations: EscalationEntry[];
  /** Policies inherited from ancestor scopes. */
  inheritedPolicies: InheritedPolicyEntry[];
  /** Trace metadata. */
  audit: {
    snapshotGeneratedAt: string;
    correlationId: string;
  };
}

/**
 * Best-effort role-profile resolution. The first non-anonymous role we can
 * read from `dos.position_assignments` joined with the position record (when
 * a `role_profile` column eventually lands) wins. Until that schema arrives,
 * we fall back to the user's primary functional role from `dos.user_roles`
 * (if present) or null.
 */
async function resolveRoleProfile(
  tenantId: string,
  userId: string,
): Promise<string | null> {
  return withTenantClient(tenantId, async (c) => {
    try {
      const r = await c.query(
        `SELECT role_code FROM dos.user_roles
          WHERE tenant_id = $1 AND user_id = $2
            AND (ended_at IS NULL OR ended_at > NOW())
          ORDER BY assigned_at DESC LIMIT 1`,
        [tenantId, userId],
      );
      return (r.rows[0]?.role_code as string | undefined) ?? null;
    } catch {
      // dos.user_roles may not exist in all tenant deployments; that's fine.
      return null;
    }
  });
}

async function fetchPendingApprovals(
  tenantId: string,
  userId: string,
): Promise<PendingApprovalEntry[]> {
  return withTenantClient(tenantId, async (c) => {
    try {
      const schemaQ = await c.query(`SELECT current_schema() AS s`);
      const schema = schemaQ.rows[0]?.s as string;
      const r = await c.query(
        `SELECT entity_type, entity_id, action AS required_authority, decided_at
           FROM "${schema}".authz_decision_log
          WHERE tenant_id = $1 AND user_id = $2
            AND allowed = FALSE AND reason ILIKE '%pending%'
          ORDER BY decided_at DESC LIMIT 25`,
        [tenantId, userId],
      );
      return r.rows.map((row) => ({
        entityType: (row.entity_type as string | null) ?? 'unknown',
        entityId: (row.entity_id as string | null) ?? '',
        requiredAuthority: (row.required_authority as string | null) ?? '',
        requestedAt: new Date(row.decided_at as string | Date).toISOString(),
      }));
    } catch {
      return [];
    }
  });
}

async function fetchRecentDenials(
  tenantId: string,
  userId: string,
): Promise<DeniedActionEntry[]> {
  return withTenantClient(tenantId, async (c) => {
    try {
      const schemaQ = await c.query(`SELECT current_schema() AS s`);
      const schema = schemaQ.rows[0]?.s as string;
      const r = await c.query(
        `SELECT action, reason, id AS correlation_id
           FROM "${schema}".authz_decision_log
          WHERE tenant_id = $1 AND user_id = $2 AND allowed = FALSE
            AND decided_at > NOW() - INTERVAL '24 hours'
          ORDER BY decided_at DESC LIMIT 50`,
        [tenantId, userId],
      );
      return r.rows.map((row) => ({
        actionCode: (row.action as string | null) ?? '',
        reasonCode: (row.reason as string | null) ?? 'UNKNOWN',
        correlationId: (row.correlation_id as string | null) ?? undefined,
      }));
    } catch {
      return [];
    }
  });
}

/**
 * K-6: SLA breach detector.
 *
 * Joins authz_decision_log entries that are in `pending_approval` state with
 * `dos.module_sla_defaults`. Any pending approval whose age exceeds the
 * module's threshold counts as a breach. The result is a flat list keyed by
 * (entityType, entityId) so the FE can deep-link.
 *
 * If `dos.module_sla_defaults` carries no rows for the relevant module,
 * `module_sla_defaults` falls back to the platform-wide default (24h) so
 * users still see breaches before ops finishes seeding the SLA matrix.
 */
async function fetchSlaBreaches(
  tenantId: string,
  userId: string,
): Promise<SlaBreachEntry[]> {
  return withTenantClient(tenantId, async (c) => {
    try {
      const schemaQ = await c.query(`SELECT current_schema() AS s`);
      const schema = schemaQ.rows[0]?.s as string;
      const r = await c.query(
        `WITH defaults AS (
           SELECT module_code, MAX(threshold_hours) AS threshold_hours
             FROM dos.module_sla_defaults
            WHERE sla_type = 'approval' OR sla_type IS NULL
            GROUP BY module_code
         )
         SELECT l.entity_type, l.entity_id,
                l.decided_at,
                COALESCE(d.threshold_hours, 24) AS threshold_hours,
                EXTRACT(EPOCH FROM (NOW() - l.decided_at)) / 3600 AS age_hours
           FROM "${schema}".authz_decision_log l
           LEFT JOIN defaults d
             ON d.module_code = split_part(l.action, '.', 1)
          WHERE l.tenant_id = $1
            AND l.user_id = $2
            AND l.allowed = FALSE
            AND l.reason ILIKE '%pending%'
            AND l.decided_at < NOW() - (COALESCE(d.threshold_hours, 24) || ' hours')::INTERVAL
          ORDER BY l.decided_at ASC
          LIMIT 25`,
        [tenantId, userId],
      );
      return r.rows.map((row) => ({
        entityType: (row.entity_type as string | null) ?? 'unknown',
        entityId: (row.entity_id as string | null) ?? '',
        breachAt: new Date(
          (row.decided_at as Date).getTime() +
            (row.threshold_hours as number) * 3600_000,
        ).toISOString(),
        escalationLevel: 1,
      }));
    } catch {
      return [];
    }
  });
}

/**
 * K-6: inheritance walk. Pulls the ancestor chain for the user's primary
 * organization (and BU when the org chain is empty) and projects each
 * ancestor as an `inheritedPolicies` entry tagged with the level. The
 * concrete policy fetcher hooks in `inheritance.service.ts.INHERITANCE_FETCHERS`
 * land here when modules register them; until then the policyCode is the
 * scope name itself so the FE can already show the chain.
 */
async function fetchInheritedPolicies(
  tenantId: string,
  orgScope: OrgScope,
): Promise<InheritedPolicyEntry[]> {
  // Choose the ROOT organization (largest depth) to anchor the walk so we
  // emit the full ancestry, not just the user's leaf.
  const rootOrgId = orgScope.organizations[orgScope.organizations.length - 1]?.organization_id;
  if (!rootOrgId) return [];
  try {
    const inh = await getInheritance(tenantId, 'organization', rootOrgId);
    return inh.chain.map((node) => ({
      policyCode: `org:${node.id}`,
      source: node.name,
      level: node.level,
    }));
  } catch {
    return [];
  }
}

export async function getAccessSnapshot(
  tenantId: string,
  userId: string,
  correlationId?: string,
): Promise<FoundationAccessSnapshot> {
  return track('foundation.access_snapshot.compose', async () => {
    const [orgScope, managerChain, roleProfile, pendingApprovals, deniedActions, slaBreaches] = await Promise.all([
      getOrgScope(tenantId, userId),
      getManagerChain(tenantId, userId),
      resolveRoleProfile(tenantId, userId),
      fetchPendingApprovals(tenantId, userId),
      fetchRecentDenials(tenantId, userId),
      fetchSlaBreaches(tenantId, userId),
    ]);

    // K-6: walk the inheritance chain for the user's primary org so the FE
    // can render "policy applies because tenant > org > BU" without hitting
    // a separate endpoint. The walk is dirt-cheap: 2 indexed reads per scope.
    const inheritedPolicies = await fetchInheritedPolicies(tenantId, orgScope);

    return {
      actor: { userId, tenantId },
      currentPosition: orgScope.primaryPosition,
      currentRoleProfile: roleProfile,
      orgScope: {
        businessUnits: orgScope.businessUnits,
        organizations: orgScope.organizations,
        allPositionIds: orgScope.allPositionIds,
      },
      managerChain,
      pendingApprovals,
      deniedActions,
      slaBreaches,
      escalations: [] as EscalationEntry[], // populated when an escalation event store lands
      inheritedPolicies,
      audit: {
        snapshotGeneratedAt: new Date().toISOString(),
        correlationId: correlationId ?? cryptoRandomId(),
      },
    };
  });
}

function cryptoRandomId(): string {
  // Lightweight unique id without pulling in a uuid dep at this layer.
  const part = () => Math.random().toString(36).slice(2, 10);
  return `as_${Date.now().toString(36)}_${part()}`;
}

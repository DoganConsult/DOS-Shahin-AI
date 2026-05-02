/**
 * workflow-service / platform / dauth / authority / approval-matrix
 *
 * Evaluates whether an actor has the DAuth authority to approve a permission
 * against an amount/risk threshold. Reads the shared approval-matrix rows
 * (populated by the DAuth seeder) and compares the actor's approval limit
 * for the module against the requested value.
 *
 * Call shape (legacy):
 *   checkActorAuthority(tenantId, actorUserId, permissionCode, moduleCode, requestValue?)
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ActorAuthorityCheckResult {
  /** True when the actor is allowed to approve at the requested value. */
  allowed: boolean;
  /** Back-compat alias used by the approval-engine caller. */
  canApprove: boolean;
  /** Maximum value the actor is authorised to approve for the module. */
  limit?: number;
  /** Numeric authority level (higher = more authority). */
  level?: number;
  /** Matched role code(s), if any. */
  authority?: string;
  reason?: string;
}

/**
 * Returns `canApprove = true` when the actor has:
 *   1. The `permissionCode` granted in the tenant, AND
 *   2. An approval limit (from authority_matrix or role level) ≥ requestValue.
 *
 * The query is tolerant of missing tables (still-provisioning tenants) and
 * returns `canApprove = false` with an explicit reason rather than throwing.
 */
export async function checkActorAuthority(
  tenantId: string,
  actorUserId: string,
  permissionCode: string,
  moduleCode?: string,
  requestValue?: number,
): Promise<ActorAuthorityCheckResult> {
  try {
    const res = await safeQuery(
      `WITH actor AS (
         SELECT
           COALESCE(MAX(r.level), 0)            AS level,
           string_agg(DISTINCT r.role_code, ',') AS authorities,
           COALESCE(MAX(am.approval_limit), 0)  AS approval_limit
         FROM public.user_roles ur
         JOIN public.roles r ON r.role_code = ur.role_code
         LEFT JOIN public.authority_matrix am
           ON am.role_code = r.role_code
          AND ($4::text IS NULL OR am.module_code = $4)
         WHERE ur.tenant_id = $1
           AND ur.user_id = $2
           AND ur.is_active = true
           AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ),
       permission AS (
         SELECT 1 AS granted
           FROM public.user_roles ur
           JOIN public.role_permissions rp ON rp.role_code = ur.role_code
          WHERE ur.tenant_id = $1
            AND ur.user_id = $2
            AND rp.permission_code = $3
            AND ur.is_active = true
          LIMIT 1
       )
       SELECT actor.level,
              actor.authorities,
              actor.approval_limit,
              (SELECT granted FROM permission) AS granted
         FROM actor`,
      [tenantId, actorUserId, permissionCode, moduleCode ?? null],
    );

    const row = res.rows[0] as
      | {
          level: number | string | null;
          authorities: string | null;
          approval_limit: number | string | null;
          granted: number | null;
        }
      | undefined;
    const level = Number(row?.level ?? 0);
    const limit = Number(row?.approval_limit ?? 0);
    const authorities = row?.authorities ?? '';
    const granted = Boolean(row?.granted);

    if (!granted) {
      return {
        allowed: false,
        canApprove: false,
        level,
        limit,
        authority: authorities || undefined,
        reason: `actor does not hold '${permissionCode}' in tenant ${tenantId}`,
      };
    }
    if (typeof requestValue === 'number' && requestValue > 0) {
      if (limit <= 0) {
        return {
          allowed: false,
          canApprove: false,
          level,
          limit,
          authority: authorities || undefined,
          reason: `no approval limit configured for actor on module '${moduleCode ?? 'unknown'}'`,
        };
      }
      if (requestValue > limit) {
        return {
          allowed: false,
          canApprove: false,
          level,
          limit,
          authority: authorities || undefined,
          reason: `request value ${requestValue} exceeds approval limit ${limit}`,
        };
      }
    }
    return {
      allowed: true,
      canApprove: true,
      level,
      limit,
      authority: authorities || undefined,
    };
  } catch (err) {
    logger.warn('[ApprovalMatrix] checkActorAuthority failed', {
      tenantId,
      actorUserId,
      permissionCode,
      moduleCode,
      requestValue,
      error: toErrorMessage(err),
    });
    return {
      allowed: false,
      canApprove: false,
      reason: `authority lookup failed: ${toErrorMessage(err)}`,
    };
  }
}

import { safeQuery } from '../../workflow/ports/database.port';
import { logger } from '@dos/module-sdk';
import { publish } from '@dos/event-backbone';

export interface AuthzContext {
  tenantId: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  action: string;
}

export interface AuthzResult {
  allowed: boolean;
  reason?: string;
  appliedPolicy?: string;
}

export interface AuthzDecisionLogEntry {
  userId: string;
  tenantId: string;
  permissionCode: string;
  moduleCode?: string;
  allowed: boolean;
  reason?: string;
  /** 'ai_auto' | 'human' | 'system' — distinguishes Law 9 auto-approval flows. */
  approval_mode?: string;
  [key: string]: unknown;
}

export interface EnterpriseAuthzService {
  check(ctx: AuthzContext): Promise<AuthzResult>;
  checkBulk(contexts: AuthzContext[]): Promise<AuthzResult[]>;
  getUserPermissions(tenantId: string, userId: string): Promise<string[]>;
  hasRole(tenantId: string, userId: string, roleCode: string): Promise<boolean>;
  /** Law 9: audit an authz decision. Publishes to the event backbone; a
   *  dedicated audit consumer persists it. Best-effort — failures do not
   *  block the decision path. */
  logDecision(tenantId: string, entry: AuthzDecisionLogEntry): Promise<void>;
}

async function getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT DISTINCT p.permission_code
     FROM public.user_roles ur
     JOIN public.role_permissions rp ON rp.role_code = ur.role_code
     JOIN public.permissions p ON p.code = rp.permission_code
     WHERE ur.tenant_id = $1
       AND ur.user_id = $2
       AND ur.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
    [tenantId, userId],
  );
  return result.rows.map((r: Record<string, unknown>) => r['permission_code'] as string);
}

async function hasRole(tenantId: string, userId: string, roleCode: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM public.user_roles
     WHERE tenant_id = $1 AND user_id = $2 AND role_code = $3
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [tenantId, userId, roleCode],
  );
  return result.rows.length > 0;
}

async function check(ctx: AuthzContext): Promise<AuthzResult> {
  try {
    const permissionCode = `${ctx.resourceType}:${ctx.action}`;

    const result = await safeQuery(
      `SELECT 1
       FROM public.user_roles ur
       JOIN public.role_permissions rp ON rp.role_code = ur.role_code
       WHERE ur.tenant_id = $1
         AND ur.user_id = $2
         AND rp.permission_code = $3
         AND ur.is_active = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       LIMIT 1`,
      [ctx.tenantId, ctx.userId, permissionCode],
    );

    const allowed = result.rows.length > 0;

    if (!allowed) {
      logger.debug(
        { tenantId: ctx.tenantId, userId: ctx.userId, action: ctx.action, resource: ctx.resourceType },
        '[EnterpriseAuthz] access denied',
      );
    }

    return {
      allowed,
      reason: allowed ? undefined : `Permission '${permissionCode}' not granted`,
      appliedPolicy: allowed ? 'role_based' : undefined,
    };
  } catch (err) {
    logger.error({ err, ctx }, '[EnterpriseAuthz] check error');
    return { allowed: false, reason: 'Authorization check failed' };
  }
}

async function checkBulk(contexts: AuthzContext[]): Promise<AuthzResult[]> {
  return Promise.all(contexts.map((ctx) => check(ctx)));
}

async function logDecision(tenantId: string, entry: AuthzDecisionLogEntry): Promise<void> {
  try {
    await publish('authz.decision', tenantId, {
      userId: entry.userId,
      permissionCode: entry.permissionCode,
      moduleCode: entry.moduleCode,
      allowed: entry.allowed,
      reason: entry.reason,
      approvalMode: entry.approval_mode,
      ts: new Date().toISOString(),
      extra: { ...entry },
    });
  } catch (err) {
    logger.warn({ err, entry }, '[EnterpriseAuthz] logDecision publish failed');
  }
}

export const enterpriseAuthzService: EnterpriseAuthzService = {
  check,
  checkBulk,
  getUserPermissions,
  hasRole,
  logDecision,
};

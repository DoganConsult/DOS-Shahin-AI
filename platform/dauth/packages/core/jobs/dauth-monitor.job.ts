import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery, tenantSchema } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { getProvisionedTenants } from '@dos/platform-core/tenancy';
import { DAUTH_CONFIG } from '../dauth.config';
import { detectConflictsForUser } from '../sod/sod-conflict-audit.service';

const _DEFAULT_DELEGATION_GRACE_HOURS = DAUTH_CONFIG.delegationGraceHours;
const DEFAULT_SESSION_MAX_IDLE_HOURS = DAUTH_CONFIG.sessionMaxIdleHours;
const DEFAULT_INVITATION_EXPIRY_HOURS = DAUTH_CONFIG.invitationExpiryHours;
const DEFAULT_SOD_SCAN_LIMIT = DAUTH_CONFIG.sodScanLimit;

export async function cleanupExpiredDelegations(tenantId: string): Promise<{ deactivated: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".delegations
     SET is_active = FALSE, updated_at = NOW()
     WHERE is_active = TRUE AND valid_to < NOW()
     RETURNING id`,
  ).catch(() => ({ rows: [] }));
  const deactivated = result.rows.length;
  if (deactivated > 0) {
    logger.info('[Job] dauth-delegation-cleanup completed', { tenantId, deactivated });
    for (const row of result.rows as Array<{ id: string }>) {
      await publish('dauth.delegation.expired', tenantId, { delegationId: row.id }).catch(catchHandler(EC.EVENT_BUS));
    }
  }
  return { deactivated };
}

export async function cleanupExpiredSessions(tenantId: string): Promise<{ terminated: number }> {
  const result = await safeQuery(
    `UPDATE sessions SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'active'
       AND last_activity_at < NOW() - INTERVAL '${DEFAULT_SESSION_MAX_IDLE_HOURS} hours'
     RETURNING session_id`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  const terminated = result.rows.length;
  if (terminated > 0) {
    logger.info('[Job] dauth-session-cleanup completed', { tenantId, terminated });
  }
  return { terminated };
}

export async function expireStaleInvitations(tenantId: string): Promise<{ expired: number }> {
  const result = await safeQuery(
    `UPDATE invitations SET status = 'expired', updated_at = NOW()
     WHERE tenant_id = $1 AND status = 'pending'
       AND created_at < NOW() - INTERVAL '${DEFAULT_INVITATION_EXPIRY_HOURS} hours'
     RETURNING invitation_id`,
    [tenantId],
  ).catch(() => ({ rows: [] }));
  const expired = result.rows.length;
  if (expired > 0) {
    logger.info('[Job] dauth-invitation-expiry completed', { tenantId, expired });
  }
  return { expired };
}

export async function runSodPeriodicScan(tenantId: string): Promise<{ conflicts: number }> {
  const schema = tenantSchema(tenantId);
  const { rows: activeUsers } = await safeQuery(
    `SELECT DISTINCT user_id FROM "${schema}".enterprise_user_role_assignments
     WHERE is_active = TRUE LIMIT $1`,
    [DEFAULT_SOD_SCAN_LIMIT],
  ).catch(() => ({ rows: [] }));

  let conflicts = 0;
  for (const u of activeUsers as Array<{ user_id: string }>) {
    try {
      const result = await detectConflictsForUser(tenantId, u.user_id);
      conflicts += (result as unknown[])?.length ?? 0;
    } catch { /* skip user */ }
  }
  if (conflicts > 0) {
    logger.warn('[Job] dauth-sod-scan: conflicts detected', { tenantId, conflicts });
  }
  return { conflicts };
}

export async function expireStaleRoleAssignments(tenantId: string): Promise<{ expired: number }> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".enterprise_user_role_assignments
     SET is_active = FALSE, updated_at = NOW()
     WHERE is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()
     RETURNING id`,
  ).catch(() => ({ rows: [] }));
  const expired = result.rows.length;
  if (expired > 0) {
    logger.info('[Job] dauth-role-assignment-expiry completed', { tenantId, expired });
  }
  return { expired };
}

export async function getDauthJobs(): Promise<any[]> {
  return [
    {
      name: 'dauth-delegation-cleanup',
      cron: '0 */2 * * *',
      description: 'Deactivate expired delegations and emit expiry events',
      handler: async () => {
        logger.info('[Job] dauth-delegation-cleanup executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try { await cleanupExpiredDelegations(t.tenant_id); } catch { /* skip */ }
          }
        } catch (err: unknown) { logger.error('[Job] dauth-delegation-cleanup error:', toErrorMessage(err)); }
      },
    },
    {
      name: 'dauth-session-cleanup',
      cron: '0 * * * *',
      description: 'Terminate idle sessions beyond max idle threshold',
      handler: async () => {
        logger.info('[Job] dauth-session-cleanup executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try { await cleanupExpiredSessions(t.tenant_id); } catch { /* skip */ }
          }
        } catch (err: unknown) { logger.error('[Job] dauth-session-cleanup error:', toErrorMessage(err)); }
      },
    },
    {
      name: 'dauth-invitation-expiry',
      cron: '0 4 * * *',
      description: 'Mark stale pending invitations as expired',
      handler: async () => {
        logger.info('[Job] dauth-invitation-expiry executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try { await expireStaleInvitations(t.tenant_id); } catch { /* skip */ }
          }
        } catch (err: unknown) { logger.error('[Job] dauth-invitation-expiry error:', toErrorMessage(err)); }
      },
    },
    {
      name: 'dauth-sod-periodic-scan',
      cron: '0 3 * * *',
      description: 'Scan all active role assignments for SoD conflicts',
      handler: async () => {
        logger.info('[Job] dauth-sod-periodic-scan executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try { await runSodPeriodicScan(t.tenant_id); } catch { /* skip */ }
          }
        } catch (err: unknown) { logger.error('[Job] dauth-sod-periodic-scan error:', toErrorMessage(err)); }
      },
    },
    {
      name: 'dauth-role-assignment-expiry',
      cron: '0 */4 * * *',
      description: 'Deactivate role assignments past their valid_to date',
      handler: async () => {
        logger.info('[Job] dauth-role-assignment-expiry executed');
        try {
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try { await expireStaleRoleAssignments(t.tenant_id); } catch { /* skip */ }
          }
        } catch (err: unknown) { logger.error('[Job] dauth-role-assignment-expiry error:', toErrorMessage(err)); }
      },
    },
  ];
}


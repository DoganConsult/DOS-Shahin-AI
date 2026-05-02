import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface UserLifecycleRow {
  user_id: string;
  email: string;
  display_name: string | null;
  status?: string;
  onboarding_complete?: boolean;
  member_onboarded?: boolean;
}

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function onboard(tenantId: string, userId: string): Promise<UserLifecycleRow | null> {
  return track('foundation.lifecycle.onboard', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.users SET onboarding_complete = TRUE, member_onboarded = TRUE, updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING user_id, email, display_name, onboarding_complete, member_onboarded`,
        [userId, tenantId],
      );
      return (r.rows[0] as UserLifecycleRow) ?? null;
    }),
  );
}

export async function offboard(tenantId: string, userId: string): Promise<UserLifecycleRow | null> {
  return track('foundation.lifecycle.offboard', async () =>
    withTenantClient(tenantId, async (c) => {
      const userRes = await c.query(
        `UPDATE dos.users SET status = 'offboarded', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status != 'offboarded'
          RETURNING user_id, email, display_name, status`,
        [userId, tenantId],
      );
      const row = (userRes.rows[0] as UserLifecycleRow) ?? null;
      if (!row) return null;

      await c.query(
        `UPDATE dos.role_assignments SET deleted_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [userId, tenantId],
      );
      await c.query(
        `UPDATE dos.committee_members SET deleted_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [userId, tenantId],
      );
      return row;
    }),
  );
}

export async function suspend(tenantId: string, userId: string): Promise<UserLifecycleRow | null> {
  return track('foundation.lifecycle.suspend', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.users SET status = 'suspended', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'active'
          RETURNING user_id, email, display_name, status`,
        [userId, tenantId],
      );
      return (r.rows[0] as UserLifecycleRow) ?? null;
    }),
  );
}

export async function reactivate(tenantId: string, userId: string): Promise<UserLifecycleRow | null> {
  return track('foundation.lifecycle.reactivate', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE dos.users SET status = 'active', updated_at = NOW()
          WHERE user_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('suspended','inactive','offboarded')
          RETURNING user_id, email, display_name, status`,
        [userId, tenantId],
      );
      return (r.rows[0] as UserLifecycleRow) ?? null;
    }),
  );
}

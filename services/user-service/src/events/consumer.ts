import { subscribeEvent, logger, toErrorMessage } from '@dos/module-sdk';
import type { PlatformEvent } from '@dos/types';
import { withTenantClient } from '@dos/db';
import { userMetrics } from '../observability/metrics';

const SERVICE_ID = 'user-service';

function eventTenantId(event: PlatformEvent): string | undefined {
  return (event.tenantId as string | undefined) ?? (event.tenant_id as string | undefined);
}

function eventUserId(event: PlatformEvent): string | undefined {
  const payload = (event.data ?? event.payload ?? {}) as Record<string, unknown>;
  return (
    (payload.userId as string | undefined) ??
    (event.entityId as string | undefined) ??
    (event.userId as string | undefined)
  );
}

/**
 * Wrap a handler so that (a) failures are logged instead of silently swallowed
 * and (b) metrics are observed. We intentionally do NOT re-throw — event bus
 * semantics are at-least-once and the handler must be idempotent.
 */
function safeHandler(
  eventName: string,
  fn: (event: PlatformEvent) => Promise<void>,
): (event: PlatformEvent) => Promise<void> {
  return async (event: PlatformEvent) => {
    const start = Date.now();
    try {
      await fn(event);
    } catch (err) {
      logger.error('[user-service.consumer] Handler failed', {
        event: eventName,
        tenantId: eventTenantId(event),
        error: toErrorMessage(err),
      });
    } finally {
      userMetrics.observeDb(`event.${eventName}`, Date.now() - start);
    }
  };
}

async function handleAuthLoginSuccess(event: PlatformEvent): Promise<void> {
  const tenantId = eventTenantId(event);
  const userId = eventUserId(event);
  if (!tenantId || !userId) return;
  await withTenantClient(tenantId, async (c) =>
    c.query(
      `UPDATE dos.users SET updated_at = NOW() WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    ),
  );
}

async function handleTenantUserProvisioned(event: PlatformEvent): Promise<void> {
  const tenantId = eventTenantId(event);
  if (!tenantId) return;

  const payload = (event.data ?? event.payload ?? {}) as Record<string, unknown>;
  const userId = (payload.userId as string | undefined) ?? (event.entityId as string | undefined);
  const platformRole = (payload.platformRole as string | undefined) ?? (payload.role as string | undefined);
  if (!userId || !platformRole) return;

  await withTenantClient(tenantId, async (c) =>
    c.query(
      `UPDATE dos.users SET role = $2, updated_at = NOW() WHERE user_id = $1 AND tenant_id = $3`,
      [userId, platformRole, tenantId],
    ),
  );
}

async function handleFoundationDeptUpdated(event: PlatformEvent): Promise<void> {
  const tenantId = eventTenantId(event);
  const deptId = event.entityId as string | undefined;
  if (!tenantId || !deptId) return;

  await withTenantClient(tenantId, async (c) =>
    c.query(
      `UPDATE dos.users
         SET updated_at = NOW()
       WHERE department_id = $1 AND tenant_id = $2`,
      [deptId, tenantId],
    ),
  );
}

async function handleTenantDeleted(event: PlatformEvent): Promise<void> {
  const tenantId = eventTenantId(event);
  if (!tenantId) return;
  await withTenantClient(tenantId, async (c) => {
    await c.query(
      `UPDATE dos.teams SET deleted_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    await c.query(
      `UPDATE dos.departments SET deleted_at = NOW(), updated_at = NOW()
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    await c.query(
      `UPDATE dos.user_role_assignments SET is_active = FALSE, revoked_at = NOW()
         WHERE tenant_id = $1 AND is_active = TRUE`,
      [tenantId],
    );
  });
  logger.info('[user-service.consumer] Tenant soft-deleted', { tenantId });
}

async function handleAuthUserSuspended(event: PlatformEvent): Promise<void> {
  const tenantId = eventTenantId(event);
  const userId = eventUserId(event);
  if (!tenantId || !userId) return;
  await withTenantClient(tenantId, async (c) =>
    c.query(
      `UPDATE public.users SET status = 'suspended', updated_at = NOW()
         WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    ),
  );
}

export function startConsumer(): Promise<void> {
  subscribeEvent('auth.login_success',       SERVICE_ID, safeHandler('auth.login_success',       handleAuthLoginSuccess));
  subscribeEvent('tenant.user_provisioned',  SERVICE_ID, safeHandler('tenant.user_provisioned',  handleTenantUserProvisioned));
  subscribeEvent('foundation.dept_updated',  SERVICE_ID, safeHandler('foundation.dept_updated',  handleFoundationDeptUpdated));
  subscribeEvent('tenant.deleted',           SERVICE_ID, safeHandler('tenant.deleted',           handleTenantDeleted));
  subscribeEvent('auth.user_suspended',      SERVICE_ID, safeHandler('auth.user_suspended',      handleAuthUserSuspended));
  return Promise.resolve();
}

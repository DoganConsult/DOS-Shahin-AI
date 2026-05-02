/**
 * Minimal onboarding session persistence for Temporal provisioning completion.
 * Mirrors the `activate_session` step in the onboarding provisioning worker.
 */
import { assertTenantId, safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

export class OnboardingSessionRepo {
  /**
   * Mark session active and attach workspace when provisioning completes.
   */
  async markActive(sessionId: string, tenantId: string, workspaceId: string): Promise<void> {
    assertTenantId(tenantId);
    try {
      await safeQuery(
        `UPDATE public.onboarding_sessions
           SET status = 'active',
               workspace_id = COALESCE($2::uuid, workspace_id),
               updated_at = NOW()
         WHERE id = $1::uuid
           AND tenant_id = $3::uuid
           AND status NOT IN ('archived', 'cancelled')`,
        [sessionId, workspaceId, tenantId],
      );
    } catch (err) {
      logger.warn('[OnboardingSessionRepo] markActive failed', {
        sessionId,
        tenantId,
        workspaceId,
        error: (err as { message?: string })?.message ?? String(err),
      });
      throw err;
    }
  }
}

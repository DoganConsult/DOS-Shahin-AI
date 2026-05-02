import { withTransaction, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

/**
 * Enterprise GDPR / PDPL Data Erasure Service.
 * Irrecoverably scrambles User PII (email, names, phone) while preserving
 * UUID referential integrity so historical workflow logs are not corrupted.
 */
export async function anonymizeUser(tenantId: string, userId: string, requestedBy: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const _anonymousId = `Anonymized_${userId.substring(0, 8)}`;

  try {
    await withTransaction(tenantId, async (client) => {
      // 1. Wipe PII from User Profile
      await client.query(
        `UPDATE public.users 
         SET email = $1, 
             first_name = $2, 
             last_name = $3, 
             phone_number = NULL, 
             is_active = FALSE 
         WHERE id = $4`,
        [`deleted_${userId}@anonymized.local`, 'Deleted', 'User', userId]
      );

      // 2. Wipe Tenant Membership PII overrides if any
      await client.query(
        `UPDATE "${schema}".tenant_user_memberships 
         SET role = 'viewer', status = 'suspended' 
         WHERE user_id = $1`,
        [userId]
      );

      // 3. Clear Active Sessions and MFA secrets
      await client.query(
        `DELETE FROM public.user_mfa WHERE user_id = $1`,
        [userId]
      );
      await client.query(
        `DELETE FROM platform_dauth.active_sessions WHERE user_id = $1`,
        [userId]
      );

      // 4. Log the hard deletion to the SIEM / Audit layer
      await client.query(
        `INSERT INTO "${schema}".authz_decision_log 
         (event_type, actor_id, target_id, decision, detail) 
         VALUES ('GDPR_ANONYMIZATION', $1, $2, 'approved', 'User PII irrecoverably wiped')`,
        [requestedBy, userId]
      );
    });

    logger.info('[GDPR Anonymization] User successfully scrambled', { tenantId, userId, requestedBy });
    return true;
  } catch (err) {
    logger.error('[GDPR Anonymization] Failed to wipe user', { err, userId });
    return false;
  }
}

import { v4 as uuid } from 'uuid';
import { safeQuery } from '../ports/database.port';

/**
 * Continuous Attestation checker.
 * Scans compliance attestations for items that are expired or nearing
 * expiry (within 14 days), then creates reminder records for the
 * responsible parties.
 */
export async function runContinuousAttestationCheck(
  tenantId: string,
): Promise<{ attestationsChecked: number; expired: number; remindersCreated: number }> {
  const schema = `tenant_${tenantId}`;
  let attestationsChecked = 0;
  let expired = 0;
  let remindersCreated = 0;

  try {
    // ── 1. Fetch all non-archived attestations ───────────────────────
    const attestationsResult = await safeQuery(
      `SELECT id, title, responsible_user_id, expires_at, status
         FROM ${schema}.compliance_attestations
        WHERE status NOT IN ('archived', 'cancelled')
        ORDER BY expires_at ASC`,
    );
    const attestations: Array<{
      id: string;
      title: string;
      responsible_user_id: string;
      expires_at: string;
      status: string;
    }> = attestationsResult.rows ?? [];

    attestationsChecked = attestations.length;

    if (attestationsChecked === 0) {
      return { attestationsChecked: 0, expired: 0, remindersCreated: 0 };
    }

    const now = new Date();
    const warningThreshold = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    for (const att of attestations) {
      const expiresAt = new Date(att.expires_at);

      // ── 2. Mark expired attestations ──────────────────────────────
      if (expiresAt <= now && att.status !== 'expired') {
        await safeQuery(
          `UPDATE ${schema}.compliance_attestations
              SET status = 'expired', updated_at = NOW()
            WHERE id = $1`,
          [att.id],
        );
        expired++;

        // Create overdue reminder
        await safeQuery(
          `INSERT INTO ${schema}.attestation_reminders
             (id, attestation_id, user_id, reminder_type, message, sent_at, created_at)
           VALUES ($1, $2, $3, 'overdue', $4, NOW(), NOW())`,
          [
            uuid(),
            att.id,
            att.responsible_user_id,
            `Attestation "${att.title}" has expired and requires immediate attention.`,
          ],
        );
        remindersCreated++;
        continue;
      }

      // ── 3. Create warning reminders for approaching expiry ────────
      if (expiresAt <= warningThreshold && expiresAt > now) {
        // Only create a reminder if one hasn't been sent in the last 7 days
        const existingReminder = await safeQuery(
          `SELECT id FROM ${schema}.attestation_reminders
            WHERE attestation_id = $1
              AND reminder_type = 'expiry_warning'
              AND sent_at > NOW() - INTERVAL '7 days'
            LIMIT 1`,
          [att.id],
        );

        if ((existingReminder.rows ?? []).length === 0) {
          const daysLeft = Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
          );

          await safeQuery(
            `INSERT INTO ${schema}.attestation_reminders
               (id, attestation_id, user_id, reminder_type, message, sent_at, created_at)
             VALUES ($1, $2, $3, 'expiry_warning', $4, NOW(), NOW())`,
            [
              uuid(),
              att.id,
              att.responsible_user_id,
              `Attestation "${att.title}" expires in ${daysLeft} day(s). Please review and re-attest.`,
            ],
          );
          remindersCreated++;
        }
      }
    }

    return { attestationsChecked, expired, remindersCreated };
  } catch (err) {
    console.error(
      `[CONTINUOUS_ATTESTATION] check failed for tenant ${tenantId}:`,
      err,
    );
    return { attestationsChecked, expired, remindersCreated };
  }
}

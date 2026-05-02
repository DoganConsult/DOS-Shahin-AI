/**
 * Policy domain job definitions.
 * Covers review monitoring, exception expiry, acknowledgment nudges,
 * stale policy detection, and gap analysis automation.
 */
import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';

export async function getPolicyJobs(): Promise<JobDefinition[]> {
  // Lazy-imported at module level to keep reference to shared helper
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    // ── Policy review monitor — daily at 7 AM ────────────────────────────────
    // Sends review-due alerts and auto-transitions overdue published policies to review status.
    {
      name: 'policy-review-monitor',
      cron: '0 7 * * *',
      description: 'Send review-due alerts and auto-transition overdue policies to review status',
      handler: async () => {
        logger.info('[Job] policy-review-monitor executed');
        try {
          const { sendReviewDueAlerts } = await import('../services/policy/policy-notification.service.js');
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const alertCount = await sendReviewDueAlerts(t.tenant_id, 30);
              if (alertCount > 0) {
                logger.info(`[Job] policy-review-monitor: tenant ${t.tenant_id} -- ${alertCount} review-due alerts sent`);
              }

              // Auto-transition published policies past their review date to 'review' status
              const schema = tenantSchema(t.tenant_id);
              const transitionResult = await safeQuery(
                `UPDATE "${schema}".policies
                 SET status = 'review', updated_at = NOW()
                 WHERE status = 'published'
                   AND next_review_date < NOW()
                   AND deleted_at IS NULL`,
              );
              if (transitionResult.rowCount && transitionResult.rowCount > 0) {
                logger.info(`[Job] policy-review-monitor: tenant ${t.tenant_id} -- ${transitionResult.rowCount} policies transitioned to review`);
              }
            } catch { /* tenant schema may not exist -- non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-review-monitor error:', toErrorMessage(err));
        }
      },
    },

    // ── Policy exception monitor — daily at 8 AM ─────────────────────────────
    // Sends exception expiry alerts and auto-expires overdue approved exceptions.
    {
      name: 'policy-exception-monitor',
      cron: '0 8 * * *',
      description: 'Send exception expiry alerts and auto-expire overdue approved exceptions',
      handler: async () => {
        logger.info('[Job] policy-exception-monitor executed');
        try {
          const { sendExceptionExpiryAlerts } = await import('../services/policy/policy-notification.service.js');
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const alertCount = await sendExceptionExpiryAlerts(t.tenant_id, 30);
              if (alertCount > 0) {
                logger.info(`[Job] policy-exception-monitor: tenant ${t.tenant_id} -- ${alertCount} exception expiry alerts sent`);
              }

              // Auto-expire approved exceptions past their expiry date
              const schema = tenantSchema(t.tenant_id);
              const expireResult = await safeQuery(
                `UPDATE "${schema}".policy_exception_requests
                 SET status = 'expired', updated_at = NOW()
                 WHERE status = 'approved'
                   AND expiry_date < NOW()`,
              );
              if (expireResult.rowCount && expireResult.rowCount > 0) {
                logger.info(`[Job] policy-exception-monitor: tenant ${t.tenant_id} -- ${expireResult.rowCount} exceptions auto-expired`);
              }
            } catch { /* tenant schema may not exist -- non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-exception-monitor error:', toErrorMessage(err));
        }
      },
    },

    // ── Policy acknowledgment monitor — daily at 9 AM ────────────────────────
    // Sends acknowledgment nudges and escalates overdue campaigns.
    {
      name: 'policy-ack-monitor',
      cron: '0 9 * * *',
      description: 'Send acknowledgment nudges and escalate overdue attestation campaigns',
      handler: async () => {
        logger.info('[Job] policy-ack-monitor executed');
        try {
          const { sendAcknowledgmentNudges } = await import('../services/policy/policy-notification.service.js');
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const nudgeCount = await sendAcknowledgmentNudges(t.tenant_id);
              if (nudgeCount > 0) {
                logger.info(`[Job] policy-ack-monitor: tenant ${t.tenant_id} -- ${nudgeCount} acknowledgment nudges sent`);
              }

              // Escalate campaigns past due + escalation window
              const schema = tenantSchema(t.tenant_id);
              const escalateResult = await safeQuery(
                `UPDATE "${schema}".attestation_campaigns
                 SET status = 'escalated', updated_at = NOW()
                 WHERE status = 'active'
                   AND due_date < NOW() - (COALESCE(escalation_after_days, 14) * INTERVAL '1 day')`,
              );
              if (escalateResult.rowCount && escalateResult.rowCount > 0) {
                logger.info(`[Job] policy-ack-monitor: tenant ${t.tenant_id} -- ${escalateResult.rowCount} campaigns escalated`);
              }
            } catch { /* tenant schema may not exist -- non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-ack-monitor error:', toErrorMessage(err));
        }
      },
    },

    // ── Policy stale detector — weekly Monday at 10 AM ───────────────────────
    // Warns about stale policies and recomputes their scores.
    {
      name: 'policy-stale-detector',
      cron: '0 10 * * 1',
      description: 'Detect stale policies, send warnings, and recompute scores',
      handler: async () => {
        logger.info('[Job] policy-stale-detector executed');
        try {
          const { sendStaleWarnings } = await import('../services/policy/policy-notification.service.js');
          const { computePolicyScores } = await import('../services/policy/policy-dashboard.service.js');
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const warningCount = await sendStaleWarnings(t.tenant_id, 12);
              if (warningCount > 0) {
                logger.info(`[Job] policy-stale-detector: tenant ${t.tenant_id} -- ${warningCount} stale warnings sent`);
              }

              // Recompute scores for stale policies
              const schema = tenantSchema(t.tenant_id);
              const staleResult = await safeQuery(
                `SELECT policy_id FROM "${schema}".policies
                 WHERE deleted_at IS NULL
                   AND status = 'published'
                   AND updated_at < NOW() - INTERVAL '12 months'`,
              );
              for (const row of staleResult.rows) {
                try {
                  await computePolicyScores(t.tenant_id, row.policy_id);
                } catch { /* individual score computation failure -- non-fatal */ }
              }
              if (staleResult.rows.length > 0) {
                logger.info(`[Job] policy-stale-detector: tenant ${t.tenant_id} -- recomputed scores for ${staleResult.rows.length} stale policies`);
              }
            } catch { /* tenant schema may not exist -- non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-stale-detector error:', toErrorMessage(err));
        }
      },
    },

    // ── Policy gap detector — every 4 hours ──────────────────────────────────
    // Runs gap analysis across all tenant policies.
    {
      name: 'policy-gap-detector',
      cron: '0 */4 * * *',
      description: 'Detect policy gaps (missing controls, risks, low acknowledgment, stale evidence, no owner)',
      handler: async () => {
        logger.info('[Job] policy-gap-detector executed');
        try {
          const { detectPolicyGaps } = await import('../services/policy/policy-gap-detector.service.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const result = await detectPolicyGaps(t.tenant_id);
              if (result.gapsDetected > 0 || result.gapsResolved > 0) {
                logger.info(
                  `[Job] policy-gap-detector: tenant ${t.tenant_id} -- ${result.totalPolicies} policies, ` +
                  `${result.gapsDetected} gaps detected, ${result.gapsResolved} gaps resolved`,
                );
              }
            } catch { /* tenant schema may not exist -- non-fatal */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] policy-gap-detector error:', toErrorMessage(err));
        }
      },
    },
  ];
}

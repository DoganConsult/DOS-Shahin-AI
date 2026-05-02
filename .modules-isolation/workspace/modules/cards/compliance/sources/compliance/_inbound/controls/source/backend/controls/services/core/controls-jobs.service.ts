/**
 * Controls Module Scheduled Jobs — AGRC-OS
 * Registers cron jobs for health snapshots, overdue test detection,
 * certification reminders, and monitoring rule evaluation.
 */
import { registerJob } from '../../ports/platform.port';
import { safeQuery } from '../../ports/database.port';
import { ControlHealthSnapshotService } from "./control-health-snapshot.service";
import { ControlNotificationService } from "./control-notification.service";

import { logger } from '../../ports/logger.port';

const snapshotSvc = new ControlHealthSnapshotService();
const notifySvc = new ControlNotificationService();

/**
 * Register all controls module scheduled jobs.
 * Called once during server startup.
 */
export async function registerControlsJobs(): Promise<void> {
  // ── Health Snapshots: daily at 2:30 AM ──────────────────────────────
  await registerJob("control-health-snapshot", "30 2 * * *", async () => {
    const { rows: tenants } = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
    for (const tenant of tenants) {
      try {
        await snapshotSvc.computeAndStoreSnapshots(tenant.tenant_id);
      } catch (err) {
        logger.error(`[control-health-snapshot] tenant=${tenant.tenant_id}`, err);
      }
    }
  });

  // ── Overdue Test Detection: daily at 7:00 AM ───────────────────────
  await registerJob("control-overdue-test-check", "0 7 * * *", async () => {
    const { rows: tenants } = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
    for (const tenant of tenants) {
      try {
        const schema = `tenant_${tenant.tenant_id.replace(/-/g, '_')}`;
        const { rows: overdue } = await safeQuery(`
          SELECT control_id, owner_user_id, next_test_due_at::text AS due_date
          FROM "${schema}".controls
          WHERE deleted_at IS NULL
            AND next_test_due_at IS NOT NULL
            AND next_test_due_at < NOW()
            AND owner_user_id IS NOT NULL
        `);
        for (const ctrl of overdue) {
          await notifySvc.notifyTestDue(
            tenant.tenant_id, ctrl.control_id, ctrl.owner_user_id, ctrl.due_date
          );
        }
      } catch (err) {
        logger.error(`[control-overdue-test-check] tenant=${tenant.tenant_id}`, err);
      }
    }
  });

  // ── Certification Reminder: daily at 8:00 AM ───────────────────────
  await registerJob("control-certification-reminder", "0 8 * * *", async () => {
    const { rows: tenants } = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
    for (const tenant of tenants) {
      try {
        const schema = `tenant_${tenant.tenant_id.replace(/-/g, '_')}`;
        const { rows: pending } = await safeQuery(`
          SELECT cr.request_id, cr.owner_id, cc.end_date::text AS deadline
          FROM "${schema}".control_certification_requests cr
          JOIN "${schema}".control_certification_campaigns cc ON cc.campaign_id = cr.campaign_id
          WHERE cr.status = 'pending'
            AND cc.status = 'active'
            AND cc.end_date <= NOW() + INTERVAL '7 days'
        `);
        for (const req of pending) {
          await notifySvc.notifyCertificationDue(
            tenant.tenant_id, req.request_id, req.owner_id, req.deadline
          );
        }
      } catch (err) {
        logger.error(`[control-certification-reminder] tenant=${tenant.tenant_id}`, err);
      }
    }
  });

  // ── Monitoring Rule Evaluator: every 15 minutes ────────────────────
  await registerJob("control-monitoring-evaluator", "*/15 * * * *", async () => {
    const { rows: tenants } = await safeQuery(`SELECT tenant_id FROM public.tenants WHERE status = 'active'`);
    for (const tenant of tenants) {
      try {
        const schema = `tenant_${tenant.tenant_id.replace(/-/g, '_')}`;
        // Find active rules and check latest signals for breaches
        const { rows: breaches } = await safeQuery(`
          SELECT DISTINCT r.rule_id, r.control_id, r.severity, r.auto_create_issue
          FROM "${schema}".control_monitoring_rules r
          JOIN "${schema}".control_monitoring_signals s ON s.rule_id = r.rule_id
          WHERE r.active = true AND r.deleted_at IS NULL
            AND s.breach = true
            AND s.captured_at > NOW() - INTERVAL '15 minutes'
            AND NOT EXISTS (
              SELECT 1 FROM "${schema}".control_monitoring_alerts a
              WHERE a.control_id = r.control_id
                AND a.status IN ('new', 'acknowledged')
                AND a.detected_at > NOW() - INTERVAL '1 hour'
            )
        `);
        for (const breach of breaches) {
          // Create alert
          await safeQuery(`
            INSERT INTO "${schema}".control_monitoring_alerts
              (tenant_id, control_id, severity, status, detected_at)
            VALUES ($1, $2, $3, 'new', NOW())
          `, [tenant.tenant_id, breach.control_id, breach.severity]);

          // Notify
          await notifySvc.notifyMonitoringBreach(
            tenant.tenant_id, breach.rule_id, breach.control_id, breach.severity
          );

          // Auto-create issue if configured
          if (breach.auto_create_issue) {
            await safeQuery(`
              INSERT INTO "${schema}".control_issues
                (tenant_id, control_id, severity, status, source, description, created_at)
              VALUES ($1, $2, $3, 'open', 'monitoring_rule',
                'Auto-created from monitoring rule breach (rule: ' || $4 || ')', NOW())
            `, [tenant.tenant_id, breach.control_id, breach.severity, breach.rule_id]);
          }
        }
      } catch (err) {
        logger.error(`[control-monitoring-evaluator] tenant=${tenant.tenant_id}`, err);
      }
    }
  });
}

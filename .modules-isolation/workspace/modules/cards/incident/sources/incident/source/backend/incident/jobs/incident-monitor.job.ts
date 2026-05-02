import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { INCIDENT_SLA_DEFAULTS, INCIDENT_BUSINESS_THRESHOLDS, INCIDENT_TIMEOUTS } from '../data/incident-constants';

export async function getIncidentJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'incident-sla-monitor',
      cron: '*/15 * * * *',
      description: 'Monitor SLA breaches by severity — critical every 15min',
      handler: async () => {
        logger.info('[Job] incident-sla-monitor started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*) FILTER (WHERE severity = 'critical' AND EXTRACT(HOUR FROM NOW() - created_at) > ${INCIDENT_SLA_DEFAULTS.critical})::int AS critical_breach,
                   COUNT(*) FILTER (WHERE severity = 'high' AND EXTRACT(HOUR FROM NOW() - created_at) > ${INCIDENT_SLA_DEFAULTS.high})::int AS high_breach,
                   COUNT(*) FILTER (WHERE severity = 'medium' AND EXTRACT(HOUR FROM NOW() - created_at) > ${INCIDENT_SLA_DEFAULTS.medium})::int AS medium_breach
                 FROM "${schema}".incident_incidents
                 WHERE deleted_at IS NULL AND status NOT IN ('resolved', 'closed', 'archived')`,
              );
              const r = result.rows[0] || {};
              if ((r.critical_breach || 0) > 0) {
                logger.error(`[Job] incident-sla-monitor: tenant ${t.tenant_id} — ${r.critical_breach} CRITICAL incidents breaching ${INCIDENT_SLA_DEFAULTS.critical}h SLA!`);
              }
              if ((r.high_breach || 0) > 0) {
                logger.warn(`[Job] incident-sla-monitor: tenant ${t.tenant_id} — ${r.high_breach} high-severity incidents breaching ${INCIDENT_SLA_DEFAULTS.high}h SLA`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-sla-monitor error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-escalation',
      cron: '*/30 * * * *',
      description: `Auto-escalate incidents not triaged within ${INCIDENT_TIMEOUTS.ESCALATION_AFTER_HOURS}h`,
      handler: async () => {
        logger.info('[Job] incident-escalation started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".incident_incidents
                 WHERE deleted_at IS NULL AND status = 'detected'
                   AND created_at < NOW() - INTERVAL '${INCIDENT_TIMEOUTS.ESCALATION_AFTER_HOURS} hours'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] incident-escalation: tenant ${t.tenant_id} — ${count} incidents stuck in 'detected' for ${INCIDENT_TIMEOUTS.ESCALATION_AFTER_HOURS}h+, need escalation`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-escalation error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-containment-check',
      cron: '0 */4 * * *',
      description: 'Flag incidents in containment phase for extended periods',
      handler: async () => {
        logger.info('[Job] incident-containment-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT id, title, severity,
                   EXTRACT(HOUR FROM NOW() - updated_at)::int AS hours_in_containment
                 FROM "${schema}".incident_incidents
                 WHERE deleted_at IS NULL AND status = 'contained'
                   AND updated_at < NOW() - INTERVAL '24 hours'`,
              );
              if (result.rows.length > 0) {
                logger.warn(`[Job] incident-containment-check: tenant ${t.tenant_id} — ${result.rows.length} incidents in containment 24h+`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-containment-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-stale-investigation',
      cron: '0 9 * * *',
      description: `Flag investigations stale for ${INCIDENT_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS}+ days`,
      handler: async () => {
        logger.info('[Job] incident-stale-investigation started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".incident_incidents
                 WHERE deleted_at IS NULL AND status = 'investigating'
                   AND updated_at < NOW() - INTERVAL '${INCIDENT_BUSINESS_THRESHOLDS.STALE_AFTER_DAYS} days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] incident-stale-investigation: tenant ${t.tenant_id} — ${count} stale investigations`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-stale-investigation error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-lessons-learned-check',
      cron: '0 10 * * 1',
      description: 'Flag resolved/closed incidents without lessons learned',
      handler: async () => {
        logger.info('[Job] incident-lessons-learned-check started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT COUNT(*)::int AS count
                 FROM "${schema}".incident_incidents i
                 WHERE i.deleted_at IS NULL AND i.status IN ('resolved', 'closed')
                   AND i.severity IN ('critical', 'high')
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".entity_links el
                     WHERE el.source_entity_id = i.id AND el.source_module = 'incident' AND el.link_type = 'lesson_learned'
                   )
                   AND i.created_at > NOW() - INTERVAL '90 days'`,
              );
              const count = result.rows[0]?.count || 0;
              if (count > 0) {
                logger.warn(`[Job] incident-lessons-learned-check: tenant ${t.tenant_id} — ${count} critical/high incidents missing lessons learned`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-lessons-learned-check error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-trend-report',
      cron: '0 6 1 * *',
      description: 'Monthly incident trend report (volume, MTTR, severity distribution)',
      handler: async () => {
        logger.info('[Job] incident-trend-report started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `SELECT
                   COUNT(*)::int AS total,
                   COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
                   COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
                   COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))::int AS resolved,
                   COALESCE(AVG(EXTRACT(HOUR FROM updated_at - created_at)) FILTER (WHERE status IN ('resolved', 'closed')), 0)::int AS avg_mttr_hours
                 FROM "${schema}".incident_incidents
                 WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '30 days'`,
              );
              const r = result.rows[0] || {};
              logger.info(`[Job] incident-trend-report: tenant ${t.tenant_id} — total=${r.total}, critical=${r.critical}, high=${r.high}, resolved=${r.resolved}, mttr=${r.avg_mttr_hours}h`);
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-trend-report error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-auto-archive',
      cron: '0 3 * * 0',
      description: `Auto-archive closed incidents after ${INCIDENT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days`,
      handler: async () => {
        logger.info('[Job] incident-auto-archive started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              const result = await safeQuery(
                `UPDATE "${schema}".incident_incidents
                 SET status = 'archived', updated_at = NOW()
                 WHERE deleted_at IS NULL AND status = 'closed'
                   AND updated_at < NOW() - INTERVAL '${INCIDENT_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS} days'`,
              );
              if (result.rowCount && result.rowCount > 0) {
                logger.info(`[Job] incident-auto-archive: tenant ${t.tenant_id} — ${result.rowCount} incidents archived`);
              }
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-auto-archive error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'incident-data-retention',
      cron: '0 0 1 * *',
      description: 'Enforce data retention — soft-delete archived incidents past retention, respecting legal holds',
      handler: async () => {
        logger.info('[Job] incident-data-retention started');
        try {
          const { safeQuery, tenantSchema } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();
          for (const t of tenants) {
            try {
              const schema = tenantSchema(t.tenant_id);
              await safeQuery(
                `UPDATE "${schema}".incident_incidents
                 SET deleted_at = NOW()
                 WHERE deleted_at IS NULL
                   AND status = 'archived'
                   AND updated_at < NOW() - INTERVAL '2555 days'
                   AND NOT EXISTS (
                     SELECT 1 FROM "${schema}".legal_holds lh
                     WHERE lh.entity_id = id::text AND lh.entity_type = 'incident' AND lh.active = true
                   )`,
              );
            } catch { }
          }
        } catch (err: unknown) {
          logger.error('[Job] incident-data-retention error:', toErrorMessage(err));
        }
      },
    },
  ];
}


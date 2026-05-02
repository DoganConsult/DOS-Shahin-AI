/**
 * Packs -- Scheduled Jobs
 *
 * Background jobs: outdated pack detection, missing dependency check,
 * version conflict detection, and stale installation cleanup.
 *
 * MP-36 Section 11: Observability and Operations.
 *
 * @owner DOS
 * @module packs
 */

import { JobDefinition } from '../ports/jobs.port';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { PACKS_THRESHOLDS as _PACKS_THRESHOLDS, PACKS_TIMEOUTS } from '../data/packs-constants';

/**
 * Get all scheduled job definitions for the packs module.
 * Uses dynamic imports to avoid circular dependencies during bootstrap.
 */
export async function getPacksJobs(): Promise<JobDefinition[]> {
  const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

  return [
    {
      name: 'packs-outdated-detector',
      cron: '0 4 * * *',
      description: 'Detect packs that have newer versions available in the registry',
      handler: async () => {
        logger.info('[Job] packs-outdated-detector executed');
        try {
          const { safeQuery } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();

          for (const t of tenants) {
            try {
              const result = await safeQuery(
                `SELECT tpi.pack_code, tpi.pack_version, pr.version AS latest_version
                 FROM public.tenant_pack_installations tpi
                 JOIN public.pack_registry pr ON pr.code = tpi.pack_code AND pr.is_active = true
                 WHERE tpi.tenant_id = $1
                   AND tpi.status = 'installed'
                   AND tpi.pack_version != pr.version`,
                [t.tenant_id],
              );

              if (result.rows.length > 0) {
                logger.warn(
                  `[Job] packs-outdated-detector: tenant ${t.tenant_id} has ${result.rows.length} outdated pack(s)`,
                  { packs: result.rows.map((r: Record<string, unknown>) => `${r.pack_code}@${r.pack_version} -> ${r.latest_version}`) },
                );
              }
            } catch { /* tenant_pack_installations may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] packs-outdated-detector error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'packs-dependency-checker',
      cron: '0 5 * * 1',
      description: 'Check for missing dependencies across all tenant pack installations',
      handler: async () => {
        logger.info('[Job] packs-dependency-checker executed');
        try {
          const { safeQuery } = await import('../../../config/database.js');
          const tenants = await getProvisionedTenants();

          for (const t of tenants) {
            try {
              // Get installed packs and their dependencies
              const installed = await safeQuery(
                `SELECT tpi.pack_code
                 FROM public.tenant_pack_installations tpi
                 WHERE tpi.tenant_id = $1 AND tpi.status = 'installed'`,
                [t.tenant_id],
              );
              const installedCodes = new Set(
                (installed.rows as Array<Record<string, unknown>>).map(r => r.pack_code as string),
              );

              // Check dependencies
              const deps = await safeQuery(
                `SELECT pr.code, pr.depends_on
                 FROM public.pack_registry pr
                 WHERE pr.code = ANY($1) AND pr.is_active = true`,
                [Array.from(installedCodes)],
              );

              for (const pack of deps.rows as Array<Record<string, unknown>>) {

                const missing = (pack.depends_on ?? []).filter(
                  (d: string) => !installedCodes.has(d),
                );
                if (missing.length > 0) {
                  logger.warn(
                    `[Job] packs-dependency-checker: tenant ${t.tenant_id} pack ${pack.code} missing deps: ${missing.join(', ')}`,
                  );
                }
              }
            } catch { /* tables may not exist */ }
          }
        } catch (err: unknown) {
          logger.error('[Job] packs-dependency-checker error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'packs-failed-install-cleanup',
      cron: '0 6 * * *',
      description: 'Detect and flag stale failed installations that exceed timeout threshold',
      handler: async () => {
        logger.info('[Job] packs-failed-install-cleanup executed');
        try {
          const { safeQuery } = await import('../../../config/database.js');
          const staleHours = PACKS_TIMEOUTS.STALE_INSTALL_AFTER_HOURS;

          const result = await safeQuery(
            `SELECT tenant_id, pack_code, pack_version, status, installed_at
             FROM public.tenant_pack_installations
             WHERE status IN ('installing', 'upgrading')
               AND installed_at < NOW() - INTERVAL '${staleHours} hours'`,
          );

          for (const install of result.rows as Array<Record<string, unknown>>) {
            logger.error(
              `[Job] packs-failed-install-cleanup: stale installation detected`,
              {
                tenantId: install.tenant_id,
                packCode: install.pack_code,
                status: install.status,
                installedAt: install.installed_at,
              },
            );
          }

          if (result.rows.length > 0) {
            logger.warn(`[Job] packs-failed-install-cleanup: ${result.rows.length} stale installation(s) found`);
          }
        } catch (err: unknown) {
          logger.error('[Job] packs-failed-install-cleanup error:', toErrorMessage(err));
        }
      },
    },
    {
      name: 'packs-registry-sync',
      cron: '0 2 * * 0',
      description: 'Sync pack registry from disk to database (weekly)',
      handler: async () => {
        logger.info('[Job] packs-registry-sync executed');
        try {
          const { PackRegistryService } = await import('../pack-registry.service.js');
          const registryService = new PackRegistryService();
          const result = await registryService.syncFromDisk();
          logger.info(`[Job] packs-registry-sync: +${result.added} ~${result.updated} =${result.unchanged} !${result.errors.length}`);
        } catch (err: unknown) {
          logger.error('[Job] packs-registry-sync error:', toErrorMessage(err));
        }
      },
    },
  ];
}


import { getEventBus } from '@dos/module-sdk';
import { logger } from '../ports/logger.port';

export function registerConfigCenterEventSubscribers(): void {
  const bus = getEventBus();

  bus.subscribe('config-center.setting_updated', 'config-center-audit-trail', async (event) => {
    logger.info('[ConfigCenter] Setting updated', {
      tenantId: event.tenantId,
      entityId: event.entityId,
      actor: event.userId,
    });
  });

  bus.subscribe('config-center.config_imported', 'config-center-import-audit', async (event) => {
    logger.info('[ConfigCenter] Config imported', {
      tenantId: event.tenantId,
      imported: event.payload?.imported,
      skipped: event.payload?.skipped,
    });
  });

  bus.subscribe('config-center.drift_detected', 'config-center-drift-alert', async (event) => {
    logger.warn('[ConfigCenter] Config drift detected', {
      tenantId: event.tenantId,
      driftCount: event.payload?.totalDrift,
    });
  });

  logger.info('[ConfigCenter] Event subscribers registered');
}

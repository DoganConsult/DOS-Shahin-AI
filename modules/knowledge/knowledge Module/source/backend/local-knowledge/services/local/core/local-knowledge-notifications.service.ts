import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin-Ai — Local Knowledge Notifications Service
// R3.3B Phase G+: Sends alerts for quota, health, legal hold expiry
// ============================================

import { logger } from '../../../ports/logger.port';
import { getStorageQuota, updateStorageUsage } from './local-knowledge-storage-quota.service';
import { getDocumentsUnderLegalHold } from './local-knowledge-legal-hold.service';
import { getKnowledgeBaseHealth } from './local-knowledge-health.service';
const checkAllSourcesHealth = getKnowledgeBaseHealth;
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import type { GenericRow } from '@dos/types';

/**
 * Check and send storage quota threshold alerts
 */
export async function checkAndSendQuotaAlerts(tenantId: string): Promise<void> {
  try {
    const quotaResult = await updateStorageUsage(tenantId);
    const quota = await getStorageQuota(tenantId);

    // Only send alert if threshold was just crossed (not if already alerted)
    if (quotaResult.alertLevel && !quota[`alertThreshold${quotaResult.alertLevel}` as keyof typeof quota]) {
      const { createNotification } = await import('../../../../notification/services/notification.service.js');
      const { getProvisionedTenants } = await import('@dos/platform-core/jobs');

      // Get tenant admins
      const tenants = await getProvisionedTenants();

      const tenant = tenants.find(t => t.tenantId === tenantId);
      if (!tenant) return;

      const schema = tenantSchema(tenantId);
      const adminsRes = await safeQuery(
        `SELECT user_id FROM "${schema}".users WHERE role = 'admin' AND is_active = TRUE LIMIT 10`,
      );

      const _severity = quotaResult.alertLevel === '100' ? 'critical' : quotaResult.alertLevel === '90' ? 'high' : 'medium';
      const message = quotaResult.alertLevel === '100'
        ? `Storage quota exceeded (100%). Ingestion is blocked.`
        : quotaResult.alertLevel === '90'
        ? `Storage quota at ${quotaResult.usagePercent.toFixed(1)}% (90% threshold).`
        : `Storage quota at ${quotaResult.usagePercent.toFixed(1)}% (80% threshold).`;

      for (const admin of adminsRes.rows) {
        await createNotification(tenantId, {
          userId: admin.user_id,
          type: 'storage_quota_alert',
          title: `[Local Knowledge] Storage Quota Alert`,
          body: message,
          link: '/local-knowledge/storage/quota',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      logger.warn('[LocalKnowledgeNotifications] Quota alert sent', {
        tenantId,
        alertLevel: quotaResult.alertLevel,
        usagePercent: quotaResult.usagePercent,
      });
    }
  } catch (err) {
    logger.error('[LocalKnowledgeNotifications] Failed to check quota alerts', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

/**
 * Check and send source health alerts
 */
export async function checkAndSendHealthAlerts(tenantId: string): Promise<void> {
  try {

    const healthResult = await checkAllSourcesHealth(tenantId) as Record<string, unknown>;

    const unhealthyCount = healthResult.unhealthy ?? (healthResult.status === 'unhealthy' ? 1 : 0);
    const degradedCount = healthResult.degraded ?? (healthResult.status === 'degraded' ? 1 : 0);

    if ((unhealthyCount as any) > 0 || (degradedCount as any) > 0) {
      const { createNotification } = await import('../../../../notification/services/notification.service.js');
      const schema = tenantSchema(tenantId);

      const adminsRes = await safeQuery(
        `SELECT user_id FROM "${schema}".users WHERE role = 'admin' AND is_active = TRUE LIMIT 10`,
      );

      const message = (unhealthyCount as any) > 0
        ? `${unhealthyCount} source(s) are unhealthy. ${degradedCount} source(s) are degraded.`
        : `${degradedCount} source(s) are degraded.`;

      for (const admin of adminsRes.rows) {
        await createNotification(tenantId, {
          userId: admin.user_id,
          type: 'source_health_alert',
          title: `[Local Knowledge] Source Health Alert`,
          body: message,
          link: '/local-knowledge/sources',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      logger.warn('[LocalKnowledgeNotifications] Health alert sent', {
        tenantId,
        unhealthy: unhealthyCount,
        degraded: degradedCount,
      });
    }
  } catch (err) {
    logger.error('[LocalKnowledgeNotifications] Failed to check health alerts', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

/**
 * Check and send legal hold expiry alerts
 */
export async function checkAndSendLegalHoldExpiryAlerts(tenantId: string): Promise<void> {
  try {
    const documents = await getDocumentsUnderLegalHold(tenantId);
    const _schema = tenantSchema(tenantId);

    // Find documents with legal holds expiring in next 7 days
    const expiringSoon = documents.filter(doc => {
      if (!doc.legalHoldUntil) return false;
      const expiryDate = new Date(doc.legalHoldUntil);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    });

    if (expiringSoon.length > 0) {
      const { createNotification } = await import('../../../../notification/services/notification.service.js');

      // Get users who placed the holds
      const userIds = new Set(expiringSoon.map((doc: GenericRow) => doc.legalHoldPlacedBy).filter(Boolean));

      for (const userId of userIds) {
        const userDocs = expiringSoon.filter((doc: GenericRow) => doc.legalHoldPlacedBy === userId);
        await createNotification(tenantId, {
          userId,
          type: 'legal_hold_expiring',
          title: `[Local Knowledge] Legal Hold Expiring Soon`,
          body: `${userDocs.length} document(s) under legal hold will expire within 7 days. Please review and extend if needed.`,
          link: '/local-knowledge/legal-holds',
        }).catch(catchHandler(EC.EVENT_BUS, {}));
      }

      logger.info('[LocalKnowledgeNotifications] Legal hold expiry alerts sent', {
        tenantId,
        count: expiringSoon.length,
      });
    }
  } catch (err) {
    logger.error('[LocalKnowledgeNotifications] Failed to check legal hold expiry alerts', {
      tenantId,
      error: (err as Error).message,
    });
  }
}

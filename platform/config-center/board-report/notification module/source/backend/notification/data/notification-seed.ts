import { NOTIFICATION_LIMITS, NOTIFICATION_TIMEOUTS, NOTIFICATION_BUSINESS_THRESHOLDS } from './notification-constants';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export interface NotificationSeedData {
  defaultConfigs: Record<string, unknown>;
  channels: Array<{ code: string; labelEn: string; labelAr: string; requiresConfig: boolean }>;
  templateCategories: Array<{ code: string; labelEn: string; labelAr: string }>;
  priorities: Array<{ code: string; labelEn: string; labelAr: string; maxDelaySecs: number }>;
  notificationStatuses: Array<{ code: string; labelEn: string; labelAr: string; terminal: boolean }>;
  digestFrequencies: Array<{ code: string; labelEn: string; labelAr: string; intervalMinutes: number }>;
  permissions?: Array<{ code: string; labelEn: string; labelAr: string; module: string }>;
  roles?: Array<{ code: string; labelEn: string; labelAr: string; permissions: string[] }>;
  actions?: Array<{ code: string; labelEn: string; labelAr: string; permissionRequired: string }>;
}

export function getNotificationSeedData(): NotificationSeedData {
  return {
    defaultConfigs: {
      moduleCode: 'notification',
      autoArchiveEnabled: true,
      autoArchiveAfterDays: NOTIFICATION_TIMEOUTS.AUTO_ARCHIVE_AFTER_DAYS,
      defaultVisibility: 'org',
      notificationsEnabled: true,
      aiAssistEnabled: false,
      workflowEnabled: false,
      maxItemsPerPage: 50,
      maxRecipientsPerBatch: NOTIFICATION_LIMITS.MAX_RECIPIENTS_PER_BATCH,
      maxRetries: NOTIFICATION_LIMITS.MAX_RETRIES,
      deliveryTimeoutSeconds: NOTIFICATION_TIMEOUTS.DELIVERY_TIMEOUT_SECONDS,
      digestIntervalMinutes: NOTIFICATION_TIMEOUTS.DIGEST_INTERVAL_MINUTES,
      deliveryRateWarning: NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_WARNING,
      deliveryRateCritical: NOTIFICATION_BUSINESS_THRESHOLDS.DELIVERY_RATE_CRITICAL,
      maxExportRows: NOTIFICATION_LIMITS.MAX_EXPORT_ROWS,
    },
    channels: [
      { code: 'email', labelEn: 'Email', labelAr: 'البريد الإلكتروني', requiresConfig: true },
      { code: 'sms', labelEn: 'SMS', labelAr: 'رسالة نصية', requiresConfig: true },
      { code: 'push', labelEn: 'Push Notification', labelAr: 'إشعار فوري', requiresConfig: true },
      { code: 'in_app', labelEn: 'In-App Notification', labelAr: 'إشعار داخل التطبيق', requiresConfig: false },
      { code: 'webhook', labelEn: 'Webhook', labelAr: 'ويب هوك', requiresConfig: true },
      { code: 'teams', labelEn: 'Microsoft Teams', labelAr: 'مايكروسوفت تيمز', requiresConfig: true },
    ],
    templateCategories: [
      { code: 'system', labelEn: 'System Alerts', labelAr: 'تنبيهات النظام' },
      { code: 'security', labelEn: 'Security Notifications', labelAr: 'إشعارات الأمان' },
      { code: 'workflow', labelEn: 'Workflow Updates', labelAr: 'تحديثات سير العمل' },
      { code: 'compliance', labelEn: 'Compliance Alerts', labelAr: 'تنبيهات الامتثال' },
      { code: 'risk', labelEn: 'Risk Alerts', labelAr: 'تنبيهات المخاطر' },
      { code: 'approval', labelEn: 'Approval Requests', labelAr: 'طلبات الموافقة' },
      { code: 'digest', labelEn: 'Digest Summary', labelAr: 'ملخص دوري' },
      { code: 'custom', labelEn: 'Custom', labelAr: 'مخصص' },
    ],
    priorities: [
      { code: 'critical', labelEn: 'Critical', labelAr: 'حرج', maxDelaySecs: 0 },
      { code: 'high', labelEn: 'High', labelAr: 'مرتفع', maxDelaySecs: 60 },
      { code: 'medium', labelEn: 'Medium', labelAr: 'متوسط', maxDelaySecs: 300 },
      { code: 'low', labelEn: 'Low', labelAr: 'منخفض', maxDelaySecs: 3600 },
    ],
    notificationStatuses: [
      { code: 'pending', labelEn: 'Pending', labelAr: 'معلق', terminal: false },
      { code: 'sent', labelEn: 'Sent', labelAr: 'مرسل', terminal: false },
      { code: 'delivered', labelEn: 'Delivered', labelAr: 'تم التسليم', terminal: false },
      { code: 'read', labelEn: 'Read', labelAr: 'مقروء', terminal: true },
      { code: 'failed', labelEn: 'Failed', labelAr: 'فشل', terminal: false },
      { code: 'archived', labelEn: 'Archived', labelAr: 'مؤرشف', terminal: true },
    ],
    digestFrequencies: [
      { code: 'realtime', labelEn: 'Real-time', labelAr: 'فوري', intervalMinutes: 0 },
      { code: 'hourly', labelEn: 'Hourly', labelAr: 'كل ساعة', intervalMinutes: 60 },
      { code: 'daily', labelEn: 'Daily', labelAr: 'يومي', intervalMinutes: 1440 },
      { code: 'weekly', labelEn: 'Weekly', labelAr: 'أسبوعي', intervalMinutes: 10080 },
    ],
  };
}

export async function seedNotificationModule(tenantId: string, schema: string): Promise<void> {
  const data = getNotificationSeedData();
  const { safeQuery } = await import('../../../config/database.js');

  for (const [key, value] of Object.entries(data.defaultConfigs)) {
    await safeQuery(
      `INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`,
      ['notification', key, JSON.stringify(value), tenantId],
    ).catch(catchHandler(EC.EVENT_BUS));
  }
}

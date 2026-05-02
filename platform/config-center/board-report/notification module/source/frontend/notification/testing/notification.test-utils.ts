import type { NotificationContract, NotificationPreferenceContract, NotificationDiagnosticsContract } from '../contracts/notification.contracts';
export function mockNotification(overrides?: Partial<NotificationContract>): NotificationContract {
  return { notificationId: 'ntf-001', tenantId: 'tenant-001', recipientId: 'user-001', channel: 'in_app', status: 'delivered',
    priority: 'normal', titleEn: 'Risk Assessment Due', titleAr: null, bodyEn: 'Your quarterly risk assessment is due in 7 days', bodyAr: null,
    sourceModule: 'risk', sourceEventCode: 'risk.assessment.due', deliveredAt: new Date().toISOString(), readAt: null,
    failureReason: null, retryCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockNotificationPreference(overrides?: Partial<NotificationPreferenceContract>): NotificationPreferenceContract {
  return { preferenceId: 'pref-001', userId: 'user-001', channel: 'email', enabled: true, quietHoursStart: '22:00', quietHoursEnd: '07:00', moduleOverrides: {}, ...overrides };
}
export function mockNotificationDiagnostics(overrides?: Partial<NotificationDiagnosticsContract>): NotificationDiagnosticsContract {
  return { moduleCode: 'notification', healthy: true, totalNotifications: 5000, pendingCount: 12, failedCount: 8, deliveryRate: 99.2,
    avgDeliveryMs: 350, checks: [{ name: 'delivery-pipeline', passed: true }, { name: 'queue-health', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockNotificationList(count = 5): NotificationContract[] { return Array.from({ length: count }, (_, i) => mockNotification({ notificationId: `ntf-${String(i+1).padStart(3,'0')}`, titleEn: `Notification ${i+1}` })); }

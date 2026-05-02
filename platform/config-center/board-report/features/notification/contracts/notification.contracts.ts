export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
export type NotificationStatus = 'queued' | 'sending' | 'delivered' | 'failed' | 'read' | 'archived';
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface NotificationContract {
  notificationId: string; tenantId: string; recipientId: string;
  channel: NotificationChannel; status: NotificationStatus; priority: NotificationPriority;
  titleEn: string; titleAr: string | null; bodyEn: string; bodyAr: string | null;
  sourceModule: string; sourceEventCode: string | null;
  deliveredAt: string | null; readAt: string | null; failureReason: string | null;
  retryCount: number; createdAt: string; updatedAt: string;
}

export interface NotificationPreferenceContract {
  preferenceId: string; userId: string; channel: NotificationChannel;
  enabled: boolean; quietHoursStart: string | null; quietHoursEnd: string | null;
  moduleOverrides: Record<string, boolean>;
}

export interface NotificationDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalNotifications: number; pendingCount: number;
  failedCount: number; deliveryRate: number; avgDeliveryMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface NotificationDashboardContract {
  totalNotifications: number; byChannel: Record<string, number>; byStatus: Record<string, number>;
  deliveryRate: number; failedCount: number; avgDeliveryMs: number | null;
  recentNotifications: Array<{ notificationId: string; channel: NotificationChannel; status: NotificationStatus; createdAt: string }>;
}

export interface NotificationListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
  priority?: string;
  recipientId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface NotificationListResponse {
  success: boolean;
  data: NotificationEntityContract[];
  total: number;
  page: number;
  limit: number;
  filters?: Record<string, unknown>;
}

export interface NotificationDetailResponse {
  success: boolean;
  data: NotificationEntityContract | null;
  delivery?: NotificationDeliveryContract;
  preference?: NotificationPreferenceContract;
}

export interface NotificationMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
  warnings?: string[];
}

export type NotificationStatus = 'queued' | 'sending' | 'delivered' | 'failed' | 'read' | 'dismissed' | 'expired';
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook' | 'teams' | 'slack';

export interface NotificationEntityContract {
  notificationId: string;
  tenantId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  priority: 'critical' | 'high' | 'normal' | 'low';
  recipientId: string;
  recipientType: 'user' | 'group' | 'role' | 'broadcast';
  sourceModule?: string;
  sourceEntityId?: string;
  sourceEvent?: string;
  actionUrl?: string;
  actionLabel?: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  expiresAt?: string;
  retryCount: number;
  createdAt: string;
}

export interface NotificationDeliveryContract {
  notificationId: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  attemptCount: number;
  lastAttemptAt?: string;
  lastFailureReason?: string;
  providerResponse?: string;
  deliveredAt?: string;
}

export interface NotificationPreferenceContract {
  userId: string;
  tenantId: string;
  channelPreferences: Record<NotificationChannel, boolean>;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  digestEnabled: boolean;
  digestFrequency?: 'hourly' | 'daily' | 'weekly';
  moduleOverrides: { moduleCode: string; channel: NotificationChannel; enabled: boolean }[];
  updatedAt: string;
}

export interface NotificationQueueContract {
  queueId: string;
  tenantId: string;
  channel: NotificationChannel;
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  oldestPendingAt?: string;
  throughputPerMinute: number;
  healthStatus: 'healthy' | 'slow' | 'backlogged' | 'failing';
}

export interface NotificationTemplateContract {
  templateId: string;
  tenantId: string;
  templateCode: string;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: string[];
  locale: string;
  active: boolean;
  version: number;
}

export interface NotificationDiagnosticsContract {
  tenantId: string;
  generatedAt: string;
  deliveryHealth: {
    failedDeliveries24h: number;
    bounceRate: number;
    averageDeliveryLatencyMs: number;
  };
  queueHealth: {
    backloggedQueues: number;
    totalPending: number;
    oldestPendingMinutes: number;
  };
  preferenceHealth: {
    usersWithNoPreferences: number;
    disabledChannelCount: number;
  };
  channelBreakdown: Record<NotificationChannel, { sent: number; failed: number; delivered: number }>;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  warnings: string[];
  errors: string[];
}

export interface NotificationDashboardSummaryContract {
  tenantId: string;
  generatedAt: string;
  statusBreakdown: Record<NotificationStatus, number>;
  channelBreakdown: Record<NotificationChannel, number>;
  deliveryRate: number;
  readRate: number;
  failedCount24h: number;
  totalSentToday: number;
  trends: { date: string; sentCount: number; failedCount: number; readCount: number }[];
}

/**
 * @dos/types — notification and messaging types
 * Covers in-app notifications, email configs, push, webhook delivery
 */
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';
export type NotificationStatus = 'archived' | 'cancelled' | 'delivered' | 'failed' | 'pending' | 'read' | 'sent';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationCategory = 'system' | 'compliance' | 'risk' | 'task' | 'approval' | 'alert' | 'info' | 'security' | 'module' | 'workflow';
export interface NotificationRecipient {
    userId?: string;
    email?: string;
    phone?: string;
    pushToken?: string;
    webhookUrl?: string;
    [k: string]: unknown;
}
export interface NotificationTemplate {
    templateId: string;
    code: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    subjectEn: string;
    subjectAr: string;
    bodyEn: string;
    bodyAr: string;
    variables: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface NotificationPayload {
    notificationId?: string;
    tenantId: string;
    userId?: string;
    recipientIds?: string[];
    recipients?: NotificationRecipient[];
    channel: NotificationChannel;
    category: NotificationCategory;
    priority: NotificationPriority;
    templateCode?: string;
    subjectEn?: string;
    subjectAr?: string;
    bodyEn?: string;
    bodyAr?: string;
    variables?: Record<string, unknown>;
    entityType?: string;
    entityId?: string;
    moduleCode?: string;
    correlationId?: string;
    scheduledAt?: string;
    expiresAt?: string;
    metadata?: Record<string, unknown>;
}
export interface NotificationRecord {
    notificationId: string;
    tenantId: string;
    userId?: string;
    channel: NotificationChannel;
    category: NotificationCategory;
    priority: NotificationPriority;
    status: NotificationStatus;
    subjectEn?: string;
    subjectAr?: string;
    bodyEn?: string;
    bodyAr?: string;
    entityType?: string;
    entityId?: string;
    moduleCode?: string;
    sentAt?: string;
    deliveredAt?: string;
    readAt?: string;
    failureReason?: string;
    retryCount?: number;
    createdAt: string;
    metadata?: Record<string, unknown>;
}
export interface NotificationPreferences {
    userId: string;
    tenantId: string;
    channels: Partial<Record<NotificationChannel, boolean>>;
    categories: Partial<Record<NotificationCategory, boolean>>;
    quietHours?: {
        enabled: boolean;
        startHour: number;
        endHour: number;
        timezone: string;
    };
    language?: 'en' | 'ar';
    updatedAt: string;
}
export interface NotificationStats {
    total: number;
    unread: number;
    bySeverity: Record<NotificationPriority, number>;
    byCategory: Record<string, number>;
    byChannel: Record<NotificationChannel, number>;
    lastReceivedAt?: string;
}
export interface NotificationBatch {
    batchId: string;
    tenantId: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    pendingCount: number;
    createdAt: string;
    completedAt?: string;
}
export type EmailProvider = 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark';
export interface EmailConfig {
    configId?: string;
    tenantId: string;
    provider: EmailProvider;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    smtpUser?: string;
    apiKey?: string;
    region?: string;
    isActive: boolean;
    testEmailSentAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface EmailDeliveryRecord {
    deliveryId: string;
    tenantId: string;
    notificationId?: string;
    recipientEmail: string;
    subject: string;
    provider: EmailProvider;
    messageId?: string;
    status: 'sent' | 'delivered' | 'bounced' | 'spam' | 'failed';
    openedAt?: string;
    clickedAt?: string;
    bouncedAt?: string;
    failureReason?: string;
    sentAt: string;
}
export type InboxMessageStatus = 'unread' | 'read' | 'archived' | 'deleted';
export type InboxMessageType = 'notification' | 'system' | 'comment' | 'approval_request' | 'escalation';
export interface InboxMessage {
    messageId: string;
    tenantId: string;
    userId: string;
    type: InboxMessageType;
    status: InboxMessageStatus;
    priority: NotificationPriority;
    titleEn: string;
    titleAr?: string;
    bodyEn?: string;
    bodyAr?: string;
    entityType?: string;
    entityId?: string;
    moduleCode?: string;
    senderUserId?: string;
    senderName?: string;
    actionUrl?: string;
    actionLabel?: string;
    readAt?: string;
    archivedAt?: string;
    expiresAt?: string;
    createdAt: string;
    metadata?: Record<string, unknown>;
}
export interface InboxSummary {
    userId: string;
    tenantId: string;
    totalMessages: number;
    unreadCount: number;
    unreadByCategory: Record<string, number>;
    latestMessageAt?: string;
}
export type PushProvider = 'fcm' | 'apns' | 'expo';
export interface PushToken {
    tokenId: string;
    userId: string;
    tenantId: string;
    token: string;
    provider: PushProvider;
    deviceType: 'android' | 'ios' | 'web';
    deviceId?: string;
    appVersion?: string;
    isActive: boolean;
    registeredAt: string;
    lastUsedAt?: string;
}
export interface PushPayload {
    title: string;
    body: string;
    badge?: number;
    sound?: string;
    imageUrl?: string;
    data?: Record<string, unknown>;
    clickAction?: string;
    ttl?: number;
    collapseKey?: string;
}
export type WebhookStatus = 'active' | 'paused' | 'failed' | 'disabled';
export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
export interface WebhookEndpoint {
    webhookId: string;
    tenantId: string;
    url: string;
    method: WebhookMethod;
    secret?: string;
    status: WebhookStatus;
    events: string[];
    headers?: Record<string, string>;
    retryConfig?: {
        maxRetries: number;
        backoffMs: number;
    };
    lastTriggeredAt?: string;
    failureCount?: number;
    createdAt: string;
    updatedAt: string;
}
export interface WebhookDelivery {
    deliveryId: string;
    webhookId: string;
    tenantId: string;
    event: string;
    payload: Record<string, unknown>;
    statusCode?: number;
    responseBody?: string;
    duration?: number;
    success: boolean;
    error?: string;
    retryCount?: number;
    triggeredAt: string;
    completedAt?: string;
}
export interface WebhookSignatureVerification {
    isValid: boolean;
    webhookId?: string;
    reason?: string;
}
export interface Notification {
    notification_id: string;
    tenant_id: string;
    recipient_id: string;
    channel: string;
    subject: string;
    body: string;
    status: string;
    read_at?: string;
    sent_at?: string;
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by?: string;
    deleted_at?: string | null;
}
export interface NotificationCreateInput {
    tenant_id: string;
    recipient_id: string;
    channel: string;
    subject: string;
    body: string;
    status: string;
    read_at?: string;
    sent_at?: string;
    created_by: string;
}
export interface NotificationUpdateInput {
    recipient_id: string;
    channel: string;
    subject: string;
    body: string;
    status: string;
    read_at?: string;
    sent_at?: string;
    updated_by: string;
}
export interface NotificationListFilter {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortDir?: 'ASC' | 'DESC';
}
export interface NotificationListResult {
    rows: Notification[];
    total: number;
}
export declare const NOTIFICATION_STATUSES: readonly NotificationStatus[];
export type NotificationSource = 'manual' | 'import' | 'api' | 'workflow' | 'ai_agent' | 'system';
export declare const NOTIFICATION_SOURCES: readonly NotificationSource[];
export type NotificationStatusReason = 'initial_creation' | 'user_action' | 'workflow_transition' | 'auto_escalation' | 'sla_breach' | 'approval_granted' | 'approval_denied' | 'system_rule';
export interface NotificationEventPayload {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: 'notification';
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: NotificationStatus;
    newState?: NotificationStatus;
    data: Record<string, unknown>;
}

export const NOTIFICATION_STATES = [
  'pending', 'sent', 'delivered', 'read', 'failed', 'expired',
] as const;

export type NotificationState = (typeof NOTIFICATION_STATES)[number];

export const NOTIFICATION_TRANSITIONS: Record<NotificationState, NotificationState[]> = {
  pending: ['sent', 'failed'],
  sent: ['delivered', 'failed', 'expired'],
  delivered: ['read', 'expired'],
  read: [],
  failed: ['pending'],
  expired: [],
};

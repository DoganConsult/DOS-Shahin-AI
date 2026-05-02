import type { NotificationStatus } from '../contracts/notification.contracts';
export const NOTIFICATION_STATES: readonly NotificationStatus[] = ['queued', 'sending', 'delivered', 'failed', 'read', 'archived'] as const;
export const NOTIFICATION_TRANSITIONS: Record<NotificationStatus, NotificationStatus[]> = {
  queued: ['sending', 'failed'], sending: ['delivered', 'failed'], delivered: ['read', 'archived'],
  failed: ['queued', 'archived'], read: ['archived'], archived: [],
};
export const NOTIFICATION_TERMINAL_STATES: readonly NotificationStatus[] = ['archived'];
export function isValidNotificationTransition(from: NotificationStatus, to: NotificationStatus): boolean { return NOTIFICATION_TRANSITIONS[from]?.includes(to) ?? false; }
export function isNotificationTerminal(state: NotificationStatus): boolean { return NOTIFICATION_TERMINAL_STATES.includes(state); }

import type { InboxItemStatus } from '../contracts/inbox.contracts';
export const INBOX_STATES: readonly InboxItemStatus[] = ['unread', 'read', 'actioned', 'snoozed', 'archived'] as const;
export const INBOX_TRANSITIONS: Record<InboxItemStatus, InboxItemStatus[]> = {
  unread: ['read', 'actioned', 'snoozed', 'archived'], read: ['actioned', 'snoozed', 'archived'],
  actioned: ['archived'], snoozed: ['unread', 'read', 'archived'], archived: [],
};
export const INBOX_TERMINAL_STATES: readonly InboxItemStatus[] = ['archived'];
export function isValidInboxTransition(from: InboxItemStatus, to: InboxItemStatus): boolean { return INBOX_TRANSITIONS[from]?.includes(to) ?? false; }
export function isInboxTerminal(state: InboxItemStatus): boolean { return INBOX_TERMINAL_STATES.includes(state); }

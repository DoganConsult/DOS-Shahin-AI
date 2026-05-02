export const INBOX_ITEM_STATES = [
  'unread', 'read', 'actioned', 'snoozed', 'archived',
] as const;

export type InboxItemState = (typeof INBOX_ITEM_STATES)[number];

export const INBOX_ITEM_TRANSITIONS: Record<InboxItemState, InboxItemState[]> = {
  unread: ['read', 'archived'],
  read: ['actioned', 'snoozed', 'archived'],
  actioned: ['archived'],
  snoozed: ['unread', 'archived'],
  archived: [],
};

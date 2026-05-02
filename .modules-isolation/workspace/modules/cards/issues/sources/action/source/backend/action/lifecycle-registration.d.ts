/**
 * Action Module — Lifecycle Registry Registration
 * SINGLE SOURCE OF TRUTH for action_item state machine.
 * All services, routes, contracts, and frontend must align with these states.
 */
export declare const ACTION_ITEM_STATES: readonly ["open", "in_progress", "completed", "verified", "closed", "overdue", "escalated", "cancelled"];
export type ActionItemState = typeof ACTION_ITEM_STATES[number];
export declare const ACTION_ITEM_TRANSITIONS: Record<string, string[]>;

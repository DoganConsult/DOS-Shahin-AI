export declare const ACTION_STATES: readonly ["pending", "assigned", "in_progress", "overdue", "escalated", "completed", "verified", "cancelled", "archived"];
export type ActionState = (typeof ACTION_STATES)[number];
export declare const ACTION_TRANSITIONS: Record<ActionState, ActionState[]>;

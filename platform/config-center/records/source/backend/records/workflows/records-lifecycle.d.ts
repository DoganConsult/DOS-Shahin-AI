export declare const RECORD_STATES: readonly ["draft", "active", "under_review", "retention_hold", "pending_disposal", "disposed", "archived"];
export type RecordState = (typeof RECORD_STATES)[number];
export declare const RECORD_TRANSITIONS: Record<RecordState, RecordState[]>;

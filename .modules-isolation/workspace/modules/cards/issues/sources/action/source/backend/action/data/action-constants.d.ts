export declare const ACTION_STATUSES: readonly ["open", "in_progress", "pending_review", "completed", "overdue", "cancelled", "archived"];
export declare const ACTION_DEFAULT_STATUS: typeof ACTION_STATUSES[number];
export declare const ACTION_TERMINAL_STATUSES: readonly ["completed", "cancelled", "archived"];
export declare const ACTION_LIMITS: {
    readonly MAX_TITLE_LENGTH: 500;
    readonly MAX_DESCRIPTION_LENGTH: 10000;
    readonly MAX_TAGS: 20;
    readonly MAX_ATTACHMENTS: 20;
    readonly MAX_BULK_OPERATION_SIZE: 200;
    readonly MAX_EXPORT_ROWS: 10000;
    readonly MAX_IMPORT_ROWS: 5000;
    readonly MAX_COMMENT_LENGTH: 5000;
    readonly MAX_LINKED_ENTITIES: 50;
    readonly MAX_SUBTASKS: 20;
    readonly MAX_ASSIGNEES: 5;
    readonly MAX_WATCHERS: 20;
};
export declare const ACTION_TIMEOUTS: {
    readonly DEFAULT_SLA_HOURS: 168;
    readonly ESCALATION_AFTER_HOURS: 48;
    readonly REMINDER_BEFORE_HOURS: 24;
    readonly AUTO_ARCHIVE_AFTER_DAYS: 365;
    readonly SESSION_TIMEOUT_MINUTES: 30;
    readonly OVERDUE_CHECK_INTERVAL_HOURS: 1;
};
export declare const ACTION_SLA_DEFAULTS: {
    readonly critical: 4;
    readonly high: 24;
    readonly medium: 72;
    readonly low: 168;
};
export declare const ACTION_FILE_RULES: {
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    readonly MAX_FILE_SIZE_MB: 25;
    readonly MAX_FILES_PER_ENTITY: 10;
};
export declare const ACTION_BUSINESS_THRESHOLDS: {
    readonly WARNING_PERCENTAGE: 75;
    readonly CRITICAL_PERCENTAGE: 90;
    readonly MIN_COMPLETION_FOR_CLOSE: 100;
    readonly STALE_AFTER_DAYS: 14;
    readonly OVERDUE_ESCALATION_HOURS: 24;
};
export declare const ACTION_TYPES: readonly ["task", "corrective", "preventive", "improvement", "follow_up", "mitigation", "compliance"];
export declare const ACTION_PRIORITIES: readonly ["critical", "high", "medium", "low"];
export declare const ACTION_SOURCE_TYPES: readonly ["manual", "audit_finding", "risk", "incident", "compliance_gap", "vulnerability", "workflow"];
export declare const ACTION_RECURRENCE_TYPES: readonly ["none", "daily", "weekly", "monthly", "quarterly", "annually"];

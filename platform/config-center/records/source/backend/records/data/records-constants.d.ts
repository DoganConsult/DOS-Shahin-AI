export declare const RECORDS_STATUSES: readonly ["active", "retention", "review", "hold", "disposal_pending", "disposed", "archived"];
export declare const RECORDS_DEFAULT_STATUS: typeof RECORDS_STATUSES[number];
export declare const RECORDS_TERMINAL_STATUSES: readonly ["disposed", "archived"];
export declare const RECORDS_LIMITS: {
    readonly MAX_TITLE_LENGTH: 500;
    readonly MAX_DESCRIPTION_LENGTH: 10000;
    readonly MAX_TAGS: 20;
    readonly MAX_VERSION_COUNT: 100;
    readonly MAX_LINKED_RECORDS: 50;
    readonly MAX_EXPORT_ROWS: 10000;
    readonly MAX_IMPORT_ROWS: 5000;
    readonly MAX_BULK_OPERATION_SIZE: 100;
};
export declare const RECORDS_TIMEOUTS: {
    readonly DEFAULT_SLA_HOURS: 168;
    readonly ESCALATION_AFTER_HOURS: 72;
    readonly REMINDER_BEFORE_HOURS: 24;
    readonly AUTO_ARCHIVE_AFTER_DAYS: 2555;
    readonly SESSION_TIMEOUT_MINUTES: 30;
    readonly REVIEW_TIMEOUT_DAYS: 30;
    readonly DISPOSAL_GRACE_DAYS: 14;
};
export declare const RECORDS_SLA_DEFAULTS: {
    readonly critical: 24;
    readonly high: 72;
    readonly medium: 168;
    readonly low: 720;
};
export declare const RECORDS_FILE_RULES: {
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg", "text/plain"];
    readonly MAX_FILE_SIZE_MB: 100;
    readonly MAX_FILES_PER_ENTITY: 50;
};
export declare const RECORDS_BUSINESS_THRESHOLDS: {
    readonly RETENTION_WARNING_DAYS: 30;
    readonly DISPOSAL_OVERDUE_DAYS: 14;
    readonly LEGAL_HOLD_REVIEW_DAYS: 90;
    readonly STALE_AFTER_DAYS: 365;
};

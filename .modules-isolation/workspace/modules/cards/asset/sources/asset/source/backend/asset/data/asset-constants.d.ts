export declare const ASSET_STATUSES: readonly ["discovered", "registered", "active", "maintenance", "decommissioning", "disposed", "archived"];
export declare const ASSET_DEFAULT_STATUS: typeof ASSET_STATUSES[number];
export declare const ASSET_TERMINAL_STATUSES: readonly ["disposed", "archived"];
export declare const ASSET_LIMITS: {
    readonly MAX_TITLE_LENGTH: 500;
    readonly MAX_DESCRIPTION_LENGTH: 10000;
    readonly MAX_TAGS: 30;
    readonly MAX_ATTACHMENTS: 30;
    readonly MAX_BULK_OPERATION_SIZE: 200;
    readonly MAX_EXPORT_ROWS: 50000;
    readonly MAX_IMPORT_ROWS: 10000;
    readonly MAX_COMMENT_LENGTH: 5000;
    readonly MAX_LINKED_ENTITIES: 100;
    readonly MAX_LINKED_RISKS: 20;
    readonly MAX_LINKED_CONTROLS: 30;
    readonly MAX_CUSTOM_ATTRIBUTES: 50;
};
export declare const ASSET_TIMEOUTS: {
    readonly DEFAULT_SLA_HOURS: 168;
    readonly ESCALATION_AFTER_HOURS: 72;
    readonly REMINDER_BEFORE_HOURS: 24;
    readonly AUTO_ARCHIVE_AFTER_DAYS: 365;
    readonly SESSION_TIMEOUT_MINUTES: 30;
    readonly REVIEW_CYCLE_DAYS: 365;
};
export declare const ASSET_SLA_DEFAULTS: {
    readonly critical: 4;
    readonly high: 24;
    readonly medium: 72;
    readonly low: 168;
};
export declare const ASSET_FILE_RULES: {
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/json"];
    readonly MAX_FILE_SIZE_MB: 25;
    readonly MAX_FILES_PER_ENTITY: 20;
};
export declare const ASSET_BUSINESS_THRESHOLDS: {
    readonly WARNING_PERCENTAGE: 80;
    readonly CRITICAL_PERCENTAGE: 95;
    readonly MIN_COMPLETION_FOR_CLOSE: 100;
    readonly STALE_AFTER_DAYS: 365;
};
export declare const ASSET_TYPES: readonly ["hardware", "software", "data", "network", "cloud", "facility", "people", "service", "intellectual_property"];
export declare const ASSET_CLASSIFICATION_LEVELS: readonly ["public", "internal", "confidential", "restricted", "top_secret"];
export declare const ASSET_CRITICALITY: readonly ["critical", "high", "medium", "low"];
export declare const ASSET_OWNERSHIP_TYPES: readonly ["owned", "leased", "shared", "contracted", "cloud_hosted"];
export declare const ASSET_ENVIRONMENTS: readonly ["production", "staging", "development", "testing", "dr", "decommissioned"];
export declare const ASSET_DATA_CATEGORIES: readonly ["pii", "financial", "health", "intellectual_property", "operational", "public"];

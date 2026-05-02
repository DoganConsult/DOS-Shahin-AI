export declare const ANALYTICS_STATUSES: readonly ["draft", "active", "published", "deprecated", "archived"];
export declare const ANALYTICS_DEFAULT_STATUS: typeof ANALYTICS_STATUSES[number];
export declare const ANALYTICS_TERMINAL_STATUSES: readonly ["archived"];
export declare const ANALYTICS_LIMITS: {
    readonly MAX_TITLE_LENGTH: 500;
    readonly MAX_DESCRIPTION_LENGTH: 10000;
    readonly MAX_TAGS: 20;
    readonly MAX_DATE_RANGE_DAYS: 730;
    readonly MAX_FILTERS: 20;
    readonly MAX_DATA_SOURCES: 10;
    readonly MAX_EXPORT_ROWS: 50000;
    readonly CACHE_MAX_ENTRIES: 1000;
    readonly MAX_ITEMS_PER_PAGE: 50;
    readonly MAX_WIDGETS_PER_DASHBOARD: 50;
};
export declare const ANALYTICS_TIMEOUTS: {
    readonly DEFAULT_SLA_HOURS: 24;
    readonly ESCALATION_AFTER_HOURS: 8;
    readonly REMINDER_BEFORE_HOURS: 4;
    readonly AUTO_ARCHIVE_AFTER_DAYS: 365;
    readonly SESSION_TIMEOUT_MINUTES: 30;
    readonly GENERATION_TIMEOUT_SECONDS: 120;
    readonly CACHE_TTL_MINUTES: 30;
};
export declare const ANALYTICS_SLA_DEFAULTS: {
    readonly critical: 1;
    readonly high: 4;
    readonly medium: 24;
    readonly low: 72;
};
export declare const ANALYTICS_FILE_RULES: {
    readonly ALLOWED_MIME_TYPES: readonly ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv", "image/png"];
    readonly MAX_FILE_SIZE_MB: 50;
    readonly MAX_FILES_PER_ENTITY: 20;
};
export declare const ANALYTICS_BUSINESS_THRESHOLDS: {
    readonly STALE_REPORT_DAYS: 30;
    readonly MIN_DATA_POINTS: 5;
    readonly MAX_VISUALIZATION_ELEMENTS: 500;
    readonly REFRESH_WARNING_HOURS: 24;
};

export const AI_STATUSES = ['draft', 'in_review', 'approved', 'active', 'suspended', 'decommissioned', 'archived'];
export const AI_DEFAULT_STATUS = 'draft';
export const AI_TERMINAL_STATUSES = ['decommissioned', 'archived'];
export const AI_LIMITS = {
    MAX_TITLE_LENGTH: 500,
    MAX_DESCRIPTION_LENGTH: 10000,
    MAX_TAGS: 20,
    MAX_TOKENS_PER_REQUEST: 32000,
    MAX_INVOCATIONS_PER_HOUR: 500,
    MAX_AGENTS: 20,
    MAX_PROMPT_LENGTH: 50000,
    MAX_CONCURRENT_REQUESTS: 10,
    MAX_EXPORT_ROWS: 10000,
};
export const AI_TIMEOUTS = {
    DEFAULT_SLA_HOURS: 1,
    ESCALATION_AFTER_HOURS: 0.5,
    REMINDER_BEFORE_HOURS: 0.25,
    AUTO_ARCHIVE_AFTER_DAYS: 365,
    SESSION_TIMEOUT_MINUTES: 30,
    MODEL_TIMEOUT_SECONDS: 120,
    RATE_LIMIT_WINDOW_SECONDS: 3600,
};
export const AI_SLA_DEFAULTS = {
    critical: 0.5,
    high: 1,
    medium: 4,
    low: 24,
};
export const AI_FILE_RULES = {
    ALLOWED_MIME_TYPES: ['application/json', 'text/plain', 'application/pdf', 'text/csv'],
    MAX_FILE_SIZE_MB: 25,
    MAX_FILES_PER_ENTITY: 10,
};
export const AI_BUSINESS_THRESHOLDS = {
    BUDGET_WARNING_PCT: 80,
    BUDGET_CRITICAL_PCT: 95,
    SUCCESS_RATE_WARNING: 90,
    SUCCESS_RATE_CRITICAL: 75,
    LATENCY_WARNING_MS: 5000,
    LATENCY_CRITICAL_MS: 30000,
    STALE_AFTER_DAYS: 30,
};
//# sourceMappingURL=ai-constants.js.map
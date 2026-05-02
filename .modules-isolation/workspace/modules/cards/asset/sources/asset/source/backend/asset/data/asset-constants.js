"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_DATA_CATEGORIES = exports.ASSET_ENVIRONMENTS = exports.ASSET_OWNERSHIP_TYPES = exports.ASSET_CRITICALITY = exports.ASSET_CLASSIFICATION_LEVELS = exports.ASSET_TYPES = exports.ASSET_BUSINESS_THRESHOLDS = exports.ASSET_FILE_RULES = exports.ASSET_SLA_DEFAULTS = exports.ASSET_TIMEOUTS = exports.ASSET_LIMITS = exports.ASSET_TERMINAL_STATUSES = exports.ASSET_DEFAULT_STATUS = exports.ASSET_STATUSES = void 0;
exports.ASSET_STATUSES = ['discovered', 'registered', 'active', 'maintenance', 'decommissioning', 'disposed', 'archived'];
exports.ASSET_DEFAULT_STATUS = 'discovered';
exports.ASSET_TERMINAL_STATUSES = ['disposed', 'archived'];
exports.ASSET_LIMITS = {
    MAX_TITLE_LENGTH: 500,
    MAX_DESCRIPTION_LENGTH: 10000,
    MAX_TAGS: 30,
    MAX_ATTACHMENTS: 30,
    MAX_BULK_OPERATION_SIZE: 200,
    MAX_EXPORT_ROWS: 50000,
    MAX_IMPORT_ROWS: 10000,
    MAX_COMMENT_LENGTH: 5000,
    MAX_LINKED_ENTITIES: 100,
    MAX_LINKED_RISKS: 20,
    MAX_LINKED_CONTROLS: 30,
    MAX_CUSTOM_ATTRIBUTES: 50,
};
exports.ASSET_TIMEOUTS = {
    DEFAULT_SLA_HOURS: 168,
    ESCALATION_AFTER_HOURS: 72,
    REMINDER_BEFORE_HOURS: 24,
    AUTO_ARCHIVE_AFTER_DAYS: 365,
    SESSION_TIMEOUT_MINUTES: 30,
    REVIEW_CYCLE_DAYS: 365,
};
exports.ASSET_SLA_DEFAULTS = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168,
};
exports.ASSET_FILE_RULES = {
    ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json'],
    MAX_FILE_SIZE_MB: 25,
    MAX_FILES_PER_ENTITY: 20,
};
exports.ASSET_BUSINESS_THRESHOLDS = {
    WARNING_PERCENTAGE: 80,
    CRITICAL_PERCENTAGE: 95,
    MIN_COMPLETION_FOR_CLOSE: 100,
    STALE_AFTER_DAYS: 365,
};
exports.ASSET_TYPES = ['hardware', 'software', 'data', 'network', 'cloud', 'facility', 'people', 'service', 'intellectual_property'];
exports.ASSET_CLASSIFICATION_LEVELS = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
exports.ASSET_CRITICALITY = ['critical', 'high', 'medium', 'low'];
exports.ASSET_OWNERSHIP_TYPES = ['owned', 'leased', 'shared', 'contracted', 'cloud_hosted'];
exports.ASSET_ENVIRONMENTS = ['production', 'staging', 'development', 'testing', 'dr', 'decommissioned'];
exports.ASSET_DATA_CATEGORIES = ['pii', 'financial', 'health', 'intellectual_property', 'operational', 'public'];
//# sourceMappingURL=asset-constants.js.map
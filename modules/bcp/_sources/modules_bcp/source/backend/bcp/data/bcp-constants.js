"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCP_ACTIVATION_TRIGGERS = exports.BCP_IMPACT_TIERS = exports.BCP_DEFAULT_RPO_HOURS = exports.BCP_DEFAULT_RTO_HOURS = exports.BCP_TEST_TYPES = exports.BCP_PLAN_TYPES = exports.BCP_BUSINESS_THRESHOLDS = exports.BCP_FILE_RULES = exports.BCP_SLA_DEFAULTS = exports.BCP_TIMEOUTS = exports.BCP_LIMITS = exports.BCP_TERMINAL_STATUSES = exports.BCP_DEFAULT_STATUS = exports.BCP_STATUSES = void 0;
exports.BCP_STATUSES = ['draft', 'approved', 'active', 'testing', 'failed_test', 'review', 'retired', 'archived'];
exports.BCP_DEFAULT_STATUS = 'draft';
exports.BCP_TERMINAL_STATUSES = ['retired', 'archived'];
exports.BCP_LIMITS = {
    MAX_TITLE_LENGTH: 500,
    MAX_DESCRIPTION_LENGTH: 50000,
    MAX_TAGS: 20,
    MAX_ATTACHMENTS: 50,
    MAX_BULK_OPERATION_SIZE: 50,
    MAX_EXPORT_ROWS: 5000,
    MAX_IMPORT_ROWS: 1000,
    MAX_COMMENT_LENGTH: 10000,
    MAX_LINKED_ENTITIES: 100,
    MAX_TEAM_MEMBERS: 50,
    MAX_RECOVERY_STEPS: 200,
    MAX_CRITICAL_SYSTEMS: 100,
};
exports.BCP_TIMEOUTS = {
    DEFAULT_SLA_HOURS: 720,
    ESCALATION_AFTER_HOURS: 168,
    REMINDER_BEFORE_HOURS: 72,
    AUTO_ARCHIVE_AFTER_DAYS: 1825,
    SESSION_TIMEOUT_MINUTES: 30,
    TEST_REMINDER_BEFORE_DAYS: 14,
};
exports.BCP_SLA_DEFAULTS = {
    critical: 4,
    high: 24,
    medium: 72,
    low: 168,
};
exports.BCP_FILE_RULES = {
    ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    MAX_FILE_SIZE_MB: 50,
    MAX_FILES_PER_ENTITY: 30,
};
exports.BCP_BUSINESS_THRESHOLDS = {
    WARNING_PERCENTAGE: 80,
    CRITICAL_PERCENTAGE: 95,
    MIN_COMPLETION_FOR_CLOSE: 100,
    STALE_AFTER_DAYS: 365,
    TEST_FREQUENCY_DAYS: 180,
};
exports.BCP_PLAN_TYPES = ['bcp', 'drp', 'crisis_management', 'pandemic', 'cyber_incident', 'communication', 'evacuation'];
exports.BCP_TEST_TYPES = ['tabletop', 'walkthrough', 'simulation', 'full_scale', 'parallel', 'cutover'];
exports.BCP_DEFAULT_RTO_HOURS = 24;
exports.BCP_DEFAULT_RPO_HOURS = 4;
exports.BCP_IMPACT_TIERS = ['tier1_critical', 'tier2_essential', 'tier3_normal', 'tier4_deferrable'];
exports.BCP_ACTIVATION_TRIGGERS = ['system_outage', 'natural_disaster', 'cyber_attack', 'pandemic', 'facility_loss', 'key_personnel_loss', 'supply_chain'];
//# sourceMappingURL=bcp-constants.js.map
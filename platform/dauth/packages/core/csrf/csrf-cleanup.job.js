"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupCsrfFailures = cleanupCsrfFailures;
exports.cleanupSessionSecurityEvents = cleanupSessionSecurityEvents;
exports.getCsrfJobs = getCsrfJobs;
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
const FAILURE_RETENTION_DAYS = 90;
const SESSION_EVENT_RETENTION_DAYS = 30;
/** Delete CSRF failures older than retention policy. */
async function cleanupCsrfFailures() {
    try {
        const { rows } = await (0, db_1.safeQuery)(`DELETE FROM csrf_failures
       WHERE occurred_at < NOW() - ($1 || ' days')::interval
       RETURNING failure_id`, [FAILURE_RETENTION_DAYS]);
        const deleted = rows.length;
        if (deleted > 0) {
            observability_1.logger.info('[Job] csrf-failure-cleanup completed', { deleted });
        }
        return { deleted };
    }
    catch (err) {
        observability_1.logger.warn('[Job] csrf-failure-cleanup failed', { error: err.message });
        return { deleted: 0 };
    }
}
/** Delete session security events older than retention policy. */
async function cleanupSessionSecurityEvents() {
    try {
        const { rows } = await (0, db_1.safeQuery)(`DELETE FROM session_security_events
       WHERE occurred_at < NOW() - ($1 || ' days')::interval
       RETURNING event_id`, [SESSION_EVENT_RETENTION_DAYS]);
        const deleted = rows.length;
        if (deleted > 0) {
            observability_1.logger.info('[Job] session-event-cleanup completed', { deleted });
        }
        return { deleted };
    }
    catch (err) {
        observability_1.logger.warn('[Job] session-event-cleanup failed', { error: err.message });
        return { deleted: 0 };
    }
}
/** Return job definitions for the scheduler. */
function getCsrfJobs() {
    return [
        {
            name: 'csrf-failure-cleanup',
            cron: '0 3 * * *',
            description: `Delete CSRF failure records older than ${FAILURE_RETENTION_DAYS} days`,
            handler: cleanupCsrfFailures,
        },
        {
            name: 'session-event-cleanup',
            cron: '0 4 * * *',
            description: `Delete session security events older than ${SESSION_EVENT_RETENTION_DAYS} days`,
            handler: cleanupSessionSecurityEvents,
        },
    ];
}
//# sourceMappingURL=csrf-cleanup.job.js.map
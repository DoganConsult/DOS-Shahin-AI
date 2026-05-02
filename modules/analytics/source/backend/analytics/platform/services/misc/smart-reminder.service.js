"use strict";
// ============================================
// Analytics — Smart Reminder Service
// Generates prioritized compliance reminders
// from deadline sources: process tasks, assessments,
// evidence expiry, and policy review cycles.
// Owner: Platform — analytics module (Law 2)
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReminder = void 0;
exports.generateReminders = generateReminders;
exports.dismissReminder = dismissReminder;
exports.getUpcomingDeadlines = getUpcomingDeadlines;
exports.sendReminder = sendReminder;
exports.isRateLimited = isRateLimited;
const database_port_1 = require("../../../ports/database.port");
const logger_port_1 = require("../../../ports/logger.port");
// ── Priority Calculation ───────────────────────────────────────────
/**
 * Determine reminder priority based on days until deadline.
 */
function computePriority(daysUntilDue) {
    if (daysUntilDue < 0)
        return 'critical'; // overdue
    if (daysUntilDue <= 3)
        return 'critical';
    if (daysUntilDue <= 7)
        return 'high';
    if (daysUntilDue <= 14)
        return 'medium';
    return 'low';
}
// ── Generate Reminders ─────────────────────────────────────────────
/**
 * Scan all deadline sources for a user/tenant and return
 * prioritized, de-duplicated reminders sorted by urgency.
 */
async function generateReminders(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const reminders = [];
    // ── Source 1: Process Tasks with due dates ─────────────────────
    try {
        const userFilter = userId ? `AND (t.assigned_to = $1 OR t.owner_user_id = $1)` : '';
        const params = userId ? [userId] : [];
        const { rows: tasks } = await (0, database_port_1.safeQuery)(`SELECT t.task_id, t.title, t.description, t.due_date, t.assigned_to, t.status
       FROM "${schema}".process_tasks t
       WHERE t.due_date IS NOT NULL
         AND t.status NOT IN ('completed', 'cancelled', 'closed')
         AND t.deleted_at IS NULL
         ${userFilter}
       ORDER BY t.due_date ASC
       LIMIT 50`, params);
        for (const t of tasks) {
            const daysUntilDue = Math.ceil((new Date(t.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            reminders.push({
                id: `task_${t.task_id}`,
                source: 'process_task',
                sourceId: t.task_id,
                title: t.title || `Task ${t.task_id}`,
                description: t.description || 'Process task approaching deadline',
                priority: computePriority(daysUntilDue),
                dueDate: t.due_date,
                daysUntilDue,
                isOverdue: daysUntilDue < 0,
                assignedTo: t.assigned_to,
                moduleCode: 'workflow',
                dismissed: false,
            });
        }
    }
    catch (err) {
        logger_port_1.logger.warn(`[SmartReminder] Failed to fetch process tasks: ${String(err)}`);
    }
    // ── Source 2: Compliance Assessments with deadlines ────────────
    try {
        const { rows: assessments } = await (0, database_port_1.safeQuery)(`SELECT a.assessment_id, a.title, a.due_date, a.assigned_to, a.status
       FROM "${schema}".compliance_assessments a
       WHERE a.due_date IS NOT NULL
         AND a.status NOT IN ('completed', 'closed', 'cancelled')
         AND a.deleted_at IS NULL
       ORDER BY a.due_date ASC
       LIMIT 50`);
        for (const a of assessments) {
            const daysUntilDue = Math.ceil((new Date(a.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (userId && a.assigned_to && a.assigned_to !== userId)
                continue;
            reminders.push({
                id: `assessment_${a.assessment_id}`,
                source: 'assessment',
                sourceId: a.assessment_id,
                title: a.title || `Assessment ${a.assessment_id}`,
                description: 'Compliance assessment deadline approaching',
                priority: computePriority(daysUntilDue),
                dueDate: a.due_date,
                daysUntilDue,
                isOverdue: daysUntilDue < 0,
                assignedTo: a.assigned_to,
                moduleCode: 'compliance',
                dismissed: false,
            });
        }
    }
    catch (err) {
        logger_port_1.logger.warn(`[SmartReminder] Failed to fetch assessments: ${String(err)}`);
    }
    // ── Source 3: Evidence expiry ──────────────────────────────────
    try {
        const { rows: evidence } = await (0, database_port_1.safeQuery)(`SELECT e.evidence_id, e.title, e.expiry_date, e.uploaded_by
       FROM "${schema}".evidence_items e
       WHERE e.expiry_date IS NOT NULL
         AND e.deleted_at IS NULL
         AND e.expiry_date <= (NOW() + INTERVAL '30 days')
       ORDER BY e.expiry_date ASC
       LIMIT 50`);
        for (const e of evidence) {
            const daysUntilDue = Math.ceil((new Date(e.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (userId && e.uploaded_by && e.uploaded_by !== userId)
                continue;
            reminders.push({
                id: `evidence_${e.evidence_id}`,
                source: 'evidence',
                sourceId: e.evidence_id,
                title: `Evidence expiring: ${e.title || e.evidence_id}`,
                description: daysUntilDue < 0
                    ? 'Evidence has expired — renewal required'
                    : `Evidence expires in ${daysUntilDue} day(s)`,
                priority: computePriority(daysUntilDue),
                dueDate: e.expiry_date,
                daysUntilDue,
                isOverdue: daysUntilDue < 0,
                assignedTo: e.uploaded_by,
                moduleCode: 'evidence',
                dismissed: false,
            });
        }
    }
    catch (err) {
        logger_port_1.logger.warn(`[SmartReminder] Failed to fetch evidence: ${String(err)}`);
    }
    // ── Source 4: Policy review cycles ────────────────────────────
    try {
        const { rows: policies } = await (0, database_port_1.safeQuery)(`SELECT p.policy_id, p.title, p.next_review_date, p.owner_user_id
       FROM "${schema}".policies p
       WHERE p.next_review_date IS NOT NULL
         AND p.deleted_at IS NULL
         AND p.status != 'archived'
         AND p.next_review_date <= (NOW() + INTERVAL '30 days')
       ORDER BY p.next_review_date ASC
       LIMIT 50`);
        for (const p of policies) {
            const daysUntilDue = Math.ceil((new Date(p.next_review_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (userId && p.owner_user_id && p.owner_user_id !== userId)
                continue;
            reminders.push({
                id: `policy_${p.policy_id}`,
                source: 'policy_review',
                sourceId: p.policy_id,
                title: `Policy review due: ${p.title || p.policy_id}`,
                description: daysUntilDue < 0
                    ? 'Policy review is overdue'
                    : `Policy review due in ${daysUntilDue} day(s)`,
                priority: computePriority(daysUntilDue),
                dueDate: p.next_review_date,
                daysUntilDue,
                isOverdue: daysUntilDue < 0,
                assignedTo: p.owner_user_id,
                moduleCode: 'policy',
                dismissed: false,
            });
        }
    }
    catch (err) {
        logger_port_1.logger.warn(`[SmartReminder] Failed to fetch policy reviews: ${String(err)}`);
    }
    // Sort by priority (critical first), then by days until due (most urgent first)
    const priorityOrder = {
        critical: 0, high: 1, medium: 2, low: 3,
    };
    reminders.sort((a, b) => {
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0)
            return pDiff;
        return a.daysUntilDue - b.daysUntilDue;
    });
    return reminders;
}
// ── Dismiss Reminder ───────────────────────────────────────────────
/**
 * Record a user dismissal for a specific reminder.
 * Stores in a dismissals table so the reminder is not re-surfaced.
 */
async function dismissReminder(tenantId, userId, reminderId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".smart_reminder_dismissals (user_id, reminder_key, dismissed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, reminder_key) DO UPDATE SET dismissed_at = NOW()`, [userId, reminderId]);
        return { dismissed: true };
    }
    catch (err) {
        logger_port_1.logger.warn(`[SmartReminder] Failed to dismiss reminder: ${String(err)}`);
        return { dismissed: false };
    }
}
// ── Upcoming Deadlines ─────────────────────────────────────────────
/**
 * Return all deadlines within the next N days across all tracked sources.
 */
async function getUpcomingDeadlines(tenantId, days = 14) {
    const allReminders = await generateReminders(tenantId);
    const deadlines = allReminders.filter((r) => r.daysUntilDue <= days);
    const summary = {
        total: deadlines.length,
        critical: deadlines.filter((r) => r.priority === 'critical').length,
        high: deadlines.filter((r) => r.priority === 'high').length,
        medium: deadlines.filter((r) => r.priority === 'medium').length,
        low: deadlines.filter((r) => r.priority === 'low').length,
        overdue: deadlines.filter((r) => r.isOverdue).length,
    };
    return { deadlines, summary };
}
// ── Legacy exports for backward compatibility ──────────────────────
/** @deprecated Use generateReminders instead */
exports.generateReminder = generateReminders;
/** @deprecated @removal-date Phase 9 @owner Product @replacement Direct UI return. Reminders are not sent. */
function sendReminder(..._args) { }
/** @deprecated @removal-date Phase 9 @owner DOS @replacement middleware-layer rate limiting. */
function isRateLimited(..._args) { return false; }
//# sourceMappingURL=smart-reminder.service.js.map
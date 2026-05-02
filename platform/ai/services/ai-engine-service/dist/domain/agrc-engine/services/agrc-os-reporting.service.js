import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// Shahin — AGRC-OS Reporting Service (Product)
// Report schedule status, escalation for overdue
// reports, and on-demand live report export.
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ============================================
import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { eventBus } from '../ports/events.port.js';
import { getScheduledReports, generateExecutiveSnapshot, generateComplianceReport } from '../../reporting/services/report/report.service.js';
import { exportPDF } from '../../reporting/services/misc/pdf-export.service.js';
import { exportExcel } from '../../reporting/services/misc/excel-export.service.js';
import { getFirstRow } from '@dos/db';
/** Approximate interval in hours for common cron patterns (for overdue detection). */
function cronToExpectedHours(cronExpression) {
    const c = (cronExpression || '').trim().split(/\s+/);
    if (c.length < 5)
        return 24;
    const [min, hour, dom, month, dow] = c;
    if (min !== '*' && hour === '*' && dom === '*' && month === '*' && dow === '*')
        return 1;
    if (hour !== '*' && dom === '*' && month === '*' && dow === '*')
        return 24;
    if (dow !== '*' && (dow !== '0' && dow !== '*'))
        return 24 * 7;
    if (dow === '0' || (dow && dow.includes('0')))
        return 24 * 7;
    return 24;
}
/**
 * Returns report schedules with status and escalation state.
 * Uses governance constitution escalation threshold (e.g. 48h) if available.
 */
export async function getReportSchedulesWithStatus(tenantId, escalationGraceHours = 48) {
    const schedules = await getScheduledReports(tenantId);
    const now = new Date();
    const statuses = [];
    let overdueCount = 0;
    let escalatedCount = 0;
    const schema = tenantSchema(tenantId);
    let lastEscalationAt = null;
    try {
        const logResult = await safeQuery(`SELECT created_at FROM "${schema}".agrc_event_log
       WHERE event_type = 'report.overdue'
       ORDER BY created_at DESC LIMIT 1`);
        if (getFirstRow(logResult))
            lastEscalationAt = getFirstRow(logResult)?.created_at?.toISOString?.() ?? getFirstRow(logResult)?.created_at;
    }
    catch {
        // agrc_event_log may not exist yet
    }
    for (const s of schedules) {
        const expectedHours = cronToExpectedHours(s.cronExpression || '');
        const lastRun = s.lastRunAt ? new Date(s.lastRunAt) : null;
        const created = s.createdAt ? new Date(s.createdAt) : null;
        const hoursSinceLastRun = lastRun ? (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60) : null;
        let nextExpectedAt = null;
        if (lastRun) {
            const next = new Date(lastRun.getTime() + expectedHours * 60 * 60 * 1000);
            nextExpectedAt = next.toISOString();
        }
        else if (created) {
            nextExpectedAt = new Date(created.getTime() + Math.min(expectedHours, 24) * 60 * 60 * 1000).toISOString();
        }
        const graceHours = Math.max(escalationGraceHours, expectedHours * 1.2);
        const isOverdue = s.enabled
            ? (lastRun ? hoursSinceLastRun > graceHours : created ? (now.getTime() - created.getTime()) / (1000 * 60 * 60) > graceHours : true)
            : false;
        const escalationState = isOverdue ? 'overdue' : 'on_time';
        if (isOverdue)
            overdueCount++;
        if (escalationState === 'escalated')
            escalatedCount++;
        statuses.push({
            scheduleId: s.scheduleId,
            reportType: s.reportType,
            cronExpression: s.cronExpression,
            enabled: s.enabled ?? true,
            lastRunAt: s.lastRunAt ?? null,
            createdAt: s.createdAt ?? '',
            createdBy: s.createdBy,
            nextExpectedAt,
            isOverdue,
            escalationState,
            hoursSinceLastRun: hoursSinceLastRun ?? null,
        });
    }
    return {
        schedules: statuses,
        overdueCount,
        escalatedCount,
        lastEscalationAt,
    };
}
/**
 * Detects overdue report schedules, publishes report.overdue events
 * (for runbooks / notifications), and returns count escalated.
 */
export async function escalateOverdueReports(tenantId, escalationGraceHours = 48) {
    const { schedules, overdueCount: _overdueCount } = await getReportSchedulesWithStatus(tenantId, escalationGraceHours);
    const overdue = schedules.filter((s) => s.isOverdue && s.enabled);
    const scheduleIds = [];
    for (const s of overdue) {
        await eventBus
            .publish({
            eventType: 'report.overdue',
            tenantId,
            sourceService: 'agrc-os-reporting',
            severity: 'warning',
            entityType: 'report_schedule',
            entityId: s.scheduleId,
            payload: {
                scheduleId: s.scheduleId,
                reportType: s.reportType,
                lastRunAt: s.lastRunAt,
                nextExpectedAt: s.nextExpectedAt,
                hoursSinceLastRun: s.hoursSinceLastRun,
            },
        })
            .catch(catchHandler(EC.AGENT_ACTION, {}));
        scheduleIds.push(s.scheduleId);
    }
    return { escalated: scheduleIds.length, scheduleIds };
}
/**
 * Generates a live (current-state) report and returns buffer for download.
 * Uses executive snapshot + optional first framework compliance for PDF/Excel.
 */
export async function exportLiveReport(tenantId, format, options) {
    const snapshot = await generateExecutiveSnapshot(tenantId);
    const schema = tenantSchema(tenantId);
    let frameworkId = options?.frameworkId;
    if (!frameworkId) {
        try {
            const fwResult = await safeQuery(`SELECT framework_id FROM "${schema}".assessments ORDER BY created_at DESC LIMIT 1`);
            const raw = getFirstRow(fwResult)?.framework_id;
            frameworkId = raw != null ? String(raw) : undefined;
        }
        catch {
            // assessments table may not exist
        }
    }
    let reportData;
    if (frameworkId) {
        reportData = await generateComplianceReport(tenantId, frameworkId);
    }
    else {
        reportData = {
            title: 'Live Executive Snapshot',
            frameworkId: '',
            generatedAt: snapshot.generatedAt,
            overallScore: snapshot.overallComplianceScore / 100,
            assessments: [],
            controlSummary: {
                compliant: 0,
                partiallyCompliant: 0,
                nonCompliant: 0,
                notApplicable: 0,
                notAssessed: 0,
            },
            evidenceCount: 0,
        };
    }
    // Override title and ensure fresh generatedAt
    reportData = {
        ...reportData,
        title: `AGRC-OS Live Report — ${new Date().toISOString().slice(0, 19)}Z`,
        generatedAt: new Date().toISOString(),
    };
    if (format === 'pdf') {
        return exportPDF(tenantId, reportData, undefined, options?.language || 'en');
    }
    return exportExcel(tenantId, reportData);
}
//# sourceMappingURL=agrc-os-reporting.service.js.map
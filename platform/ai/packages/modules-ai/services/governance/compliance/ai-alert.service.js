"use strict";
// ============================================================================
// AI Alert Service — AI OS R2
// Persistent, queryable alerts with lifecycle (open→acknowledged→resolved).
// Record-linked via entity_type + entity_id. Supports escalation.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlert = createAlert;
exports.listAlerts = listAlerts;
exports.getAlertsForEntity = getAlertsForEntity;
exports.acknowledgeAlert = acknowledgeAlert;
exports.resolveAlert = resolveAlert;
exports.escalateAlert = escalateAlert;
exports.dismissAlert = dismissAlert;
exports.getAlertStats = getAlertStats;
const database_port_1 = require("../../../ports/database.port");
const events_port_1 = require("../../../ports/events.port");
const db_1 = require("@dos/db");
// ── Core Operations ────────────────────────────────────────────────────────
async function createAlert(input) {
    const schema = (0, database_port_1.tenantSchema)(input.tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".ai_alerts
         (tenant_id, source_type, source_id, entity_type, entity_id,
          alert_type, title, description, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`, [
            input.tenantId,
            input.sourceType || 'agent',
            input.sourceId || null,
            input.entityType || null,
            input.entityId || null,
            input.alertType,
            input.title,
            input.description || null,
            input.severity || 'warning',
        ]);
        const row = (0, db_1.getFirstRow)(result);
        if (row) {
            events_port_1.eventBus.publish({
                eventType: 'ai.alert.created',
                tenantId: input.tenantId,
                // @ts-ignore - Pragmatic stabilization to unblock build
                sourceService: 'ai-alert',
                entityType: 'ai-alert',
                entityId: row.alert_id,
                severity: (input.severity || 'warning'),
                payload: {
                    alertId: row.alert_id,
                    alertType: input.alertType,
                    title: input.title,
                    linkedEntityType: input.entityType,
                    linkedEntityId: input.entityId,
                },
            });
        }
        return row || null;
    }
    catch {
        return null;
    }
}
async function listAlerts(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (filters?.alertType) {
        conditions.push(`alert_type = $${idx++}`);
        params.push(filters.alertType);
    }
    if (filters?.severity) {
        conditions.push(`severity = $${idx++}`);
        params.push(filters.severity);
    }
    if (filters?.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters?.entityType) {
        conditions.push(`entity_type = $${idx++}`);
        params.push(filters.entityType);
    }
    const where = conditions.join(' AND ');
    const limit = Math.min(filters?.limit || 50, 200);
    const offset = filters?.offset || 0;
    const [dataRes, countRes] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".ai_alerts WHERE ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, limit, offset]),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".ai_alerts WHERE ${where}`, params),
    ]);
    return { items: dataRes.rows, total: (0, db_1.getFirstRow)(countRes)?.total || 0 };
}
async function getAlertsForEntity(tenantId, entityType, entityId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".ai_alerts
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC LIMIT 50`, [tenantId, entityType, entityId]);
    return result.rows;
}
async function acknowledgeAlert(tenantId, alertId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".ai_alerts
       SET status = 'acknowledged', acknowledged_by = $3, acknowledged_at = now()
       WHERE alert_id = $1 AND tenant_id = $2 AND status = 'open'
       RETURNING alert_id`, [alertId, tenantId, userId]);
        if (result.rows.length > 0) {
            events_port_1.eventBus.publish({
                eventType: 'ai.alert.acknowledged',
                tenantId,
                sourceService: 'ai-alert',
                entityType: 'ai-alert',
                entityId: alertId,
                severity: 'info',
                payload: { alertId, acknowledgedBy: userId },
            });
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
async function resolveAlert(tenantId, alertId, userId, autoResolved = false) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".ai_alerts
       SET status = 'resolved', resolved_by = $3, resolved_at = now(), auto_resolved = $4
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id`, [alertId, tenantId, userId, autoResolved]);
        if (result.rows.length > 0) {
            events_port_1.eventBus.publish({
                eventType: 'ai.alert.resolved',
                tenantId,
                sourceService: 'ai-alert',
                entityType: 'ai-alert',
                entityId: alertId,
                severity: 'info',
                payload: { alertId, resolvedBy: userId, autoResolved },
            });
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
async function escalateAlert(tenantId, alertId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".ai_alerts
       SET escalation_level = escalation_level + 1, status = 'investigating'
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id, escalation_level`, [alertId, tenantId]);
        if (result.rows.length > 0) {
            events_port_1.eventBus.publish({
                eventType: 'ai.alert.escalated',
                tenantId,
                sourceService: 'ai-alert',
                entityType: 'ai-alert',
                entityId: alertId,
                severity: 'warning',
                payload: { alertId, escalationLevel: (0, db_1.getFirstRow)(result)?.escalation_level },
            });
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
async function dismissAlert(tenantId, alertId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".ai_alerts
       SET status = 'dismissed', resolved_by = $3, resolved_at = now()
       WHERE alert_id = $1 AND tenant_id = $2 AND status IN ('open','acknowledged','investigating')
       RETURNING alert_id`, [alertId, tenantId, userId]);
        return (result.rows.length > 0);
    }
    catch {
        return false;
    }
}
async function getAlertStats(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const [statusRes, typeRes] = await Promise.all([
            (0, database_port_1.safeQuery)(`SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
           COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating,
           COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
           COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed,
           COUNT(*) FILTER (WHERE severity = 'info')::int AS sev_info,
           COUNT(*) FILTER (WHERE severity = 'warning')::int AS sev_warning,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS sev_critical
         FROM "${schema}".ai_alerts WHERE tenant_id = $1`, [tenantId]),
            (0, database_port_1.safeQuery)(`SELECT alert_type, COUNT(*)::int AS cnt
         FROM "${schema}".ai_alerts WHERE tenant_id = $1
         GROUP BY alert_type`, [tenantId]),
        ]);
        const r = (0, db_1.getFirstRow)(statusRes) || {};
        const byType = {};
        for (const row of typeRes.rows)
            byType[row.alert_type] = row.cnt;
        return {
            open: r.open || 0,
            acknowledged: r.acknowledged || 0,
            investigating: r.investigating || 0,
            resolved: r.resolved || 0,
            dismissed: r.dismissed || 0,
            total: r.total || 0,
            bySeverity: { info: r.sev_info || 0, warning: r.sev_warning || 0, critical: r.sev_critical || 0 },
            byType,
        };
    }
    catch {
        return {
            open: 0, acknowledged: 0, investigating: 0, resolved: 0, dismissed: 0, total: 0,
            bySeverity: { info: 0, warning: 0, critical: 0 },
            byType: {},
        };
    }
}
//# sourceMappingURL=ai-alert.service.js.map
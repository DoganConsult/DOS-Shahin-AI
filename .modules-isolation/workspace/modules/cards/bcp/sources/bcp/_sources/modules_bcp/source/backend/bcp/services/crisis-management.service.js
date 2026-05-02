"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.declareCrisis = declareCrisis;
exports.getCrisisEvents = getCrisisEvents;
exports.getCrisisById = getCrisisById;
exports.getActiveCrises = getActiveCrises;
exports.updateCrisisStatus = updateCrisisStatus;
exports.addTimelineEntry = addTimelineEntry;
exports.resolveCrisis = resolveCrisis;
exports.getCrisisDashboard = getCrisisDashboard;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const db_1 = require("@dos/db");
const resilient_catch_1 = require("@dos/platform-core/resilience");
async function declareCrisis(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".crisis_events
     (title, description, crisis_type, severity, status, declared_at, declared_by,
      incident_id, affected_services, affected_locations, command_team,
      timeline)
     VALUES ($1,$2,$3,$4,'declared',NOW(),$5,$6,$7,$8,$9,$10)
     RETURNING *`, [
        data.title, data.description || null, data.crisis_type || 'operational',
        data.severity || 'high', data.declared_by || null, data.incident_id || null,
        JSON.stringify(data.affected_services || []),
        JSON.stringify(data.affected_locations || []),
        JSON.stringify(data.command_team || []),
        JSON.stringify([{ timestamp: new Date().toISOString(), type: 'declared', message: `Crisis declared: ${data.title}` }]),
    ]);
    const row = (0, db_1.getFirstRow)(r);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.crisis_declared', tenantId, sourceService: 'crisis-management',
        entityType: 'crisis_event', entityId: row.event_id, severity: (data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'warning' : 'info'),
        payload: { title: data.title, crisis_type: data.crisis_type, severity: data.severity },
    }), { tenantId, operation: 'eventBus:bcp.crisis_declared' });
    return row;
}
async function getCrisisEvents(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".crisis_events WHERE deleted_at IS NULL`;
    const params = [];
    if (filters?.status) {
        params.push(filters.status);
        sql += ` AND status = $${params.length}`;
    }
    if (filters?.severity) {
        params.push(filters.severity);
        sql += ` AND severity = $${params.length}`;
    }
    if (filters?.crisis_type) {
        params.push(filters.crisis_type);
        sql += ` AND crisis_type = $${params.length}`;
    }
    sql += ` ORDER BY declared_at DESC NULLS LAST, created_at DESC`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function getCrisisById(tenantId, eventId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".crisis_events WHERE event_id = $1 AND deleted_at IS NULL`, [eventId]));
}
async function getActiveCrises(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".crisis_events
     WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')
     ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, declared_at DESC`, [])).rows;
}
async function updateCrisisStatus(tenantId, eventId, status, update) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const existing = await getCrisisById(tenantId, eventId);
    if (!existing)
        return undefined;
    const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
    timeline.push({
        timestamp: new Date().toISOString(),
        type: 'status_change',
        from: existing.status,
        to: status,
        message: update?.message || `Status changed to ${status}`,
        by: update?.updated_by || null,
    });
    const resolveFields = status === 'resolved'
        ? `, resolved_at = NOW(), resolved_by = $4` : '';
    const params = [status, JSON.stringify(timeline), eventId];
    if (status === 'resolved')
        params.push(update?.updated_by || null);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".crisis_events SET status = $1, timeline = $2, updated_at = NOW()${resolveFields}
     WHERE event_id = $3 AND deleted_at IS NULL RETURNING *`, params);
    const row = (0, db_1.getFirstRow)(r);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.crisis_status_changed', tenantId, sourceService: 'crisis-management',
        entityType: 'crisis_event', entityId: eventId, severity: 'info',
        payload: { from: existing.status, to: status },
    }), { tenantId, operation: 'eventBus:bcp.crisis_status_changed' });
    return row;
}
async function addTimelineEntry(tenantId, eventId, entry) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const existing = await getCrisisById(tenantId, eventId);
    if (!existing)
        return undefined;
    const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
    timeline.push({ timestamp: new Date().toISOString(), ...entry });
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".crisis_events SET timeline = $1, updated_at = NOW()
     WHERE event_id = $2 AND deleted_at IS NULL RETURNING *`, [JSON.stringify(timeline), eventId]);
    return (0, db_1.getFirstRow)(r);
}
async function resolveCrisis(tenantId, eventId, resolvedBy, postCrisisReview) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const existing = await getCrisisById(tenantId, eventId);
    if (!existing)
        return undefined;
    const timeline = Array.isArray(existing.timeline) ? existing.timeline : [];
    timeline.push({
        timestamp: new Date().toISOString(),
        type: 'resolved',
        message: 'Crisis resolved',
        by: resolvedBy,
    });
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".crisis_events
     SET status = 'resolved', resolved_at = NOW(), resolved_by = $1,
         post_crisis_review = $2, timeline = $3, updated_at = NOW()
     WHERE event_id = $4 AND deleted_at IS NULL RETURNING *`, [resolvedBy, postCrisisReview || null, JSON.stringify(timeline), eventId]);
    const row = (0, db_1.getFirstRow)(r);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.crisis_resolved', tenantId, sourceService: 'crisis-management',
        entityType: 'crisis_event', entityId: eventId, severity: 'info',
        payload: { title: existing.title, resolvedBy },
    }), { tenantId, operation: 'eventBus:bcp.crisis_resolved' });
    return row;
}
async function getCrisisDashboard(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [activeRes, totalRes, avgRes, bySevRes, byTypeRes, recentRes] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL AND status NOT IN ('resolved','post_review')`, []),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL`, []),
        (0, database_port_1.safeQuery)(`SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - declared_at))/3600) AS avg_hours FROM "${schema}".crisis_events WHERE resolved_at IS NOT NULL AND declared_at IS NOT NULL AND deleted_at IS NULL`, []),
        (0, database_port_1.safeQuery)(`SELECT severity, COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL GROUP BY severity`, []),
        (0, database_port_1.safeQuery)(`SELECT crisis_type, COUNT(*) AS cnt FROM "${schema}".crisis_events WHERE deleted_at IS NULL GROUP BY crisis_type`, []),
        (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".crisis_events WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`, []),
    ]);
    const bySeverity = {};
    for (const row of bySevRes.rows)
        bySeverity[row.severity] = Number(row.cnt);
    const byType = {};
    for (const row of byTypeRes.rows)
        byType[row.crisis_type] = Number(row.cnt);
    return {
        activeCrises: Number(activeRes.rows[0]?.cnt || 0),
        totalEvents: Number(totalRes.rows[0]?.cnt || 0),
        avgResolutionHours: avgRes.rows[0]?.avg_hours ? Math.round(Number(avgRes.rows[0].avg_hours) * 10) / 10 : null,
        bySeverity, byType,
        recentEvents: recentRes.rows,
    };
}
//# sourceMappingURL=crisis-management.service.js.map
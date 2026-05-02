"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSecurityEvent = logSecurityEvent;
exports.getSecurityEvents = getSecurityEvents;
exports.getRecentFailedLogins = getRecentFailedLogins;
exports.getSecurityEventSummary = getSecurityEventSummary;
const db_1 = require("@dos/db");
const publish_with_dsoc_1 = require("../events/publish-with-dsoc");
const resilience_1 = require("@dos/platform-core/resilience");
async function logSecurityEvent(tenantId, userId, eventType, opts) {
    await (0, db_1.safeQuery)(`INSERT INTO security_events (tenant_id, user_id, event_type, ip, user_agent, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`, [tenantId, userId, eventType, opts?.ip ?? null, opts?.userAgent ?? null, JSON.stringify(opts?.metadata ?? {})]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    await (0, publish_with_dsoc_1.publish)('dauth.security_event', tenantId, {
        userId,
        eventType,
        occurredAt: new Date().toISOString(),
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
async function getSecurityEvents(tenantId, userId, opts) {
    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;
    if (userId) {
        conditions.push(`user_id = $${idx++}`);
        params.push(userId);
    }
    if (opts?.eventType) {
        conditions.push(`event_type = $${idx++}`);
        params.push(opts.eventType);
    }
    if (opts?.since) {
        conditions.push(`created_at >= $${idx++}`);
        params.push(opts.since);
    }
    const limit = opts?.limit ?? 100;
    const { rows } = await (0, db_1.safeQuery)(`SELECT event_id, tenant_id, user_id, event_type, ip, user_agent, metadata, created_at
     FROM security_events
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC LIMIT ${limit}`, params);
    return rows.map((r) => ({
        eventId: r.event_id,
        tenantId: r.tenant_id,
        userId: r.user_id,
        eventType: r.event_type,
        ip: r.ip ?? '',
        userAgent: r.user_agent ?? '',
        metadata: r.metadata ?? {},
        createdAt: r.created_at?.toISOString?.() ?? '',
    }));
}
async function getRecentFailedLogins(tenantId, since) {
    return getSecurityEvents(tenantId, undefined, { eventType: 'login_failure', since });
}
async function getSecurityEventSummary(tenantId, since) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT event_type, COUNT(*) AS cnt FROM security_events
     WHERE tenant_id = $1 AND created_at >= $2
     GROUP BY event_type`, [tenantId, since]);
    const summary = {};
    for (const r of rows) {
        summary[r.event_type] = parseInt(r.cnt, 10);
    }
    return summary;
}
//# sourceMappingURL=security-event.service.js.map
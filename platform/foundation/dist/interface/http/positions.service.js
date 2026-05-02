"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPositions = listPositions;
exports.getPosition = getPosition;
exports.getReportingTree = getReportingTree;
exports.getPositionHolders = getPositionHolders;
exports.createPosition = createPosition;
exports.updatePosition = updatePosition;
exports.assignUserToPosition = assignUserToPosition;
exports.unassignUserFromPosition = unassignUserFromPosition;
exports.deletePosition = deletePosition;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
const foundation_publishers_1 = require("../../infrastructure/messaging/foundation.publishers");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listPositions(tenantId, opts = {}) {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 25;
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (opts.bu_id) {
        params.push(opts.bu_id);
        conditions.push(`bu_id = $${params.length}`);
    }
    if (opts.search) {
        params.push(`%${opts.search}%`);
        conditions.push(`(title_en ILIKE $${params.length} OR title_ar ILIKE $${params.length} OR code ILIKE $${params.length})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    return track('foundation.position.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const countRes = await c.query(`SELECT COUNT(*) AS count FROM dos.positions ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listRes = await c.query(`SELECT * FROM dos.positions ${where} ORDER BY created_at DESC LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return { data: listRes.rows, total: parseInt(countRes.rows[0]?.count || '0', 10) };
    }));
}
async function getPosition(tenantId, id) {
    return track('foundation.position.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.positions WHERE position_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
// W3.F3.3 — reporting tree: returns positions with manager + holder snapshot.
async function getReportingTree(tenantId) {
    return track('foundation.position.reportingTree', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT p.position_id, p.title_en, p.title_ar, p.code, p.bu_id,
                p.grade, p.level, p.reports_to, p.status,
                m.title_en AS reports_to_title_en,
                m.title_ar AS reports_to_title_ar
           FROM dos.positions p
           LEFT JOIN dos.positions m ON m.position_id = p.reports_to AND m.tenant_id = p.tenant_id AND m.deleted_at IS NULL
          WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
          ORDER BY p.level NULLS LAST, p.title_en`, [tenantId]);
        return r.rows;
    }));
}
async function getPositionHolders(tenantId, positionId) {
    return track('foundation.position.holders', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT u.user_id, u.email, u.display_name, u.first_name, u.last_name, pa.assigned_at
           FROM dos.position_assignments pa
           JOIN dos.users u ON u.user_id = pa.user_id
          WHERE pa.position_id = $1 AND pa.tenant_id = $2 AND pa.deleted_at IS NULL AND u.deleted_at IS NULL
          ORDER BY pa.assigned_at DESC`, [positionId, tenantId]);
        return r.rows;
    }));
}
async function createPosition(tenantId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.position.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.positions
           (position_id, tenant_id, title_en, title_ar, code, bu_id, grade, level, reports_to, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, 'active'), $11, $12, NOW(), NOW())
         RETURNING *`, [id, tenantId, input.title_en, input.title_ar ?? null, input.code ?? null, input.bu_id ?? null,
            input.grade ?? null, input.level ?? null, input.reports_to ?? null,
            input.status ?? null, input.description ?? null, actorId]);
        return r.rows[0];
    }));
}
async function updatePosition(tenantId, id, input) {
    return track('foundation.position.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        // Capture the previous reports_to so we can emit
        // foundation.org.manager.changed when it actually moves.
        const before = (await c.query(`SELECT reports_to FROM dos.positions WHERE position_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId])).rows[0]?.reports_to;
        const r = await c.query(`UPDATE dos.positions
         SET title_en = COALESCE($3, title_en), title_ar = COALESCE($4, title_ar),
             code = COALESCE($5, code), bu_id = COALESCE($6, bu_id),
             grade = COALESCE($7, grade), level = COALESCE($8, level),
             reports_to = COALESCE($9, reports_to), status = COALESCE($10, status),
             description = COALESCE($11, description), updated_at = NOW()
         WHERE position_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`, [id, tenantId, input.title_en ?? null, input.title_ar ?? null, input.code ?? null, input.bu_id ?? null,
            input.grade ?? null, input.level ?? null, input.reports_to ?? null,
            input.status ?? null, input.description ?? null]);
        const updated = r.rows[0] ?? null;
        // J-1 emit point: only when reports_to actually changed.
        if (updated && input.reports_to !== undefined && before !== updated.reports_to) {
            await (0, foundation_publishers_1.publish)('foundation.org.manager.changed', {
                eventType: 'foundation.org.manager.changed',
                tenantId,
                entityId: id,
                payload: {
                    positionId: id,
                    oldManagerPositionId: before ?? null,
                    newManagerPositionId: updated.reports_to ?? null,
                },
            });
        }
        return updated;
    }));
}
// J-1: position-holder lifecycle. Foundation owns this; OpenFGA subscribes.
async function assignUserToPosition(tenantId, positionId, userId, opts = {}) {
    const assignmentId = (0, node_crypto_1.randomUUID)();
    await (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        await c.query(`INSERT INTO dos.position_assignments
         (assignment_id, position_id, user_id, tenant_id, is_primary)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))`, [assignmentId, positionId, userId, tenantId, opts.isPrimary ?? null]);
    });
    await (0, foundation_publishers_1.publish)('foundation.position.holder.assigned', {
        eventType: 'foundation.position.holder.assigned',
        tenantId,
        entityId: positionId,
        userId,
        payload: { positionId, userId, tenantId, assignmentId, isPrimary: opts.isPrimary ?? true },
    });
    return { assignmentId };
}
async function unassignUserFromPosition(tenantId, positionId, userId) {
    const result = await (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        return c.query(`UPDATE dos.position_assignments
          SET ended_at = NOW()
        WHERE position_id = $1 AND user_id = $2 AND tenant_id = $3 AND ended_at IS NULL
       RETURNING assignment_id`, [positionId, userId, tenantId]);
    });
    if (result.rows.length > 0) {
        await (0, foundation_publishers_1.publish)('foundation.position.holder.unassigned', {
            eventType: 'foundation.position.holder.unassigned',
            tenantId,
            entityId: positionId,
            userId,
            payload: { positionId, userId, tenantId },
        });
    }
    return { removed: result.rows.length };
}
async function deletePosition(tenantId, id) {
    return track('foundation.position.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.positions SET deleted_at = NOW(), updated_at = NOW()
         WHERE position_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING position_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
//# sourceMappingURL=positions.service.js.map
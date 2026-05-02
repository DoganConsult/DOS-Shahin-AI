"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCommittees = listCommittees;
exports.getCommittee = getCommittee;
exports.listMembers = listMembers;
exports.createCommittee = createCommittee;
exports.addMember = addMember;
exports.removeMember = removeMember;
exports.updateCommittee = updateCommittee;
exports.deleteCommittee = deleteCommittee;
exports.listMeetings = listMeetings;
exports.createMeeting = createMeeting;
const node_crypto_1 = require("node:crypto");
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
async function listCommittees(tenantId, status) {
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const params = [tenantId];
    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }
    return track('foundation.committee.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.committees WHERE ${conditions.join(' AND ')} ORDER BY name_en`, params);
        return r.rows;
    }));
}
async function getCommittee(tenantId, id) {
    return track('foundation.committee.getById', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.committees WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [id, tenantId]);
        return r.rows[0] ?? null;
    }));
}
async function listMembers(tenantId, committeeId) {
    return track('foundation.committee.members', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT cm.*, u.email, u.display_name, u.first_name, u.last_name
           FROM dos.committee_members cm
           JOIN dos.users u ON u.user_id = cm.user_id
          WHERE cm.committee_id = $1 AND cm.tenant_id = $2 AND cm.deleted_at IS NULL AND u.deleted_at IS NULL
          ORDER BY cm.role_in_committee, u.display_name`, [committeeId, tenantId]);
        return r.rows;
    }));
}
async function createCommittee(tenantId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.committee.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.committees
           (committee_id, tenant_id, name_en, name_ar, code, committee_type, charter, status, description, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'active'), $9, $10, NOW(), NOW())
         RETURNING *`, [id, tenantId, input.name_en, input.name_ar ?? null, input.code ?? null,
            input.committee_type ?? 'standing', input.charter ?? null,
            input.status ?? null, input.description ?? null, actorId]);
        return r.rows[0];
    }));
}
async function addMember(tenantId, committeeId, userId, roleInCommittee) {
    const memberId = (0, node_crypto_1.randomUUID)();
    return track('foundation.committee.addMember', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.committee_members
           (member_id, committee_id, user_id, tenant_id, role_in_committee, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`, [memberId, committeeId, userId, tenantId, roleInCommittee ?? 'member']);
        return r.rows[0];
    }));
}
async function removeMember(tenantId, committeeId, memberOrUserId) {
    return track('foundation.committee.removeMember', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        // Accept either member_id (uuid) or user_id (varchar). FE contract
        // uses /:committeeId/members/:userId; legacy callers pass member_id.
        const r = await c.query(`UPDATE dos.committee_members SET deleted_at = NOW()
          WHERE (member_id::text = $1 OR user_id = $1)
            AND committee_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
          RETURNING member_id`, [memberOrUserId, committeeId, tenantId]);
        return r.rows.length > 0;
    }));
}
// W4.F4.1 — committee update / delete / meetings.
async function updateCommittee(tenantId, id, input) {
    return track('foundation.committee.update', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.committees
            SET name_en        = COALESCE($3, name_en),
                name_ar        = COALESCE($4, name_ar),
                code           = COALESCE($5, code),
                committee_type = COALESCE($6, committee_type),
                charter        = COALESCE($7, charter),
                status         = COALESCE($8, status),
                description    = COALESCE($9, description),
                updated_at     = NOW()
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING *`, [id, tenantId, input.name_en ?? null, input.name_ar ?? null, input.code ?? null,
            input.committee_type ?? null, input.charter ?? null, input.status ?? null, input.description ?? null]);
        return r.rows[0] ?? null;
    }));
}
async function deleteCommittee(tenantId, id) {
    return track('foundation.committee.delete', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.committees SET deleted_at = NOW(), updated_at = NOW()
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          RETURNING committee_id`, [id, tenantId]);
        return r.rows.length > 0;
    }));
}
async function listMeetings(tenantId, committeeId) {
    return track('foundation.committee.meetings.list', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.committee_meetings
          WHERE committee_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          ORDER BY scheduled_at DESC`, [committeeId, tenantId]);
        return r.rows;
    }));
}
async function createMeeting(tenantId, committeeId, input, actorId) {
    const id = (0, node_crypto_1.randomUUID)();
    return track('foundation.committee.meetings.create', async () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.committee_meetings
           (meeting_id, committee_id, tenant_id, title, agenda, scheduled_at, location, status, minutes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'scheduled'), $9, $10)
         RETURNING *`, [id, committeeId, tenantId, input.title, input.agenda ?? null, input.scheduled_at,
            input.location ?? null, input.status ?? null, input.minutes ?? null, actorId]);
        return r.rows[0];
    }));
}
//# sourceMappingURL=committees.service.js.map
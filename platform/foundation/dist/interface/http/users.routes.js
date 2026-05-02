"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../../ports/auth.port");
const middleware_port_1 = require("../../ports/middleware.port");
const database_port_1 = require("../../ports/database.port");
const middleware_port_2 = require("../../ports/middleware.port");
const foundation_schemas_1 = require("../../schemas/foundation.schemas");
const csv_util_1 = require("./csv.util");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('foundation'));
router.use((0, middleware_port_1.auditMiddleware)('foundation'));
router.use(middleware_port_1.scopeContext);
function getCount(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function sendMissing(res, error) {
    res.status(400).json({ success: false, error });
}
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    await (0, database_port_1.safeQuery)('SELECT 1');
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS count FROM "${schema}".users WHERE deleted_at IS NULL`);
    const listResult = await (0, database_port_1.safeQuery)(`SELECT u.*, d.name_en AS department_name
       FROM "${schema}".users u
       LEFT JOIN "${schema}".departments d ON d.id = u.department_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`);
    res.json({
        success: true,
        users: listResult.rows,
        count: getCount(countResult.rows[0]?.count, listResult.rows.length),
    });
});
router.get('/export', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const search = req.query.search?.trim() || null;
    const status = req.query.status || null;
    const role = req.query.role || null;
    const departmentId = req.query.department_id || null;
    const result = await (0, database_port_1.safeQuery)(`SELECT u.user_id, u.id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.department_id, d.name_en AS department_name,
              u.created_at, u.updated_at
       FROM "${schema}".users u
       LEFT JOIN "${schema}".departments d ON d.id = u.department_id
       WHERE u.deleted_at IS NULL
         AND ($1::text IS NULL OR (u.email ILIKE '%'||$1||'%' OR u.first_name ILIKE '%'||$1||'%' OR u.last_name ILIKE '%'||$1||'%'))
         AND ($2::text IS NULL OR u.status = $2)
         AND ($3::text IS NULL OR u.role = $3)
         AND ($4::text IS NULL OR u.department_id::text = $4)
       ORDER BY u.created_at DESC`, [search, status, role, departmentId]);
    (0, csv_util_1.sendCsv)(res, 'foundation-users', ['user_id', 'email', 'first_name', 'last_name', 'role', 'status', 'department_id', 'department_name', 'created_at', 'updated_at'], result.rows);
});
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const { email, first_name, last_name, role, department_id } = req.body ?? {};
    if (!email) {
        sendMissing(res, 'email required');
        return;
    }
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".users (email, first_name, last_name, role, department_id, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', NOW(), NOW())
       RETURNING *`, [email, first_name ?? null, last_name ?? null, role ?? 'viewer', department_id ?? null]);
    res.status(201).json(result.rows[0]);
});
router.put('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const existsResult = await (0, database_port_1.safeQuery)(`SELECT user_id FROM "${schema}".users WHERE id = $1 OR user_id = $1 LIMIT 1`, [req.params.id]);
    if (!existsResult.rows[0]) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }
    const { role, department_id, first_name, last_name, email, status } = req.body ?? {};
    const updateResult = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".users
       SET role = COALESCE($2, role),
           department_id = COALESCE($3, department_id),
           first_name = COALESCE($4, first_name),
           last_name = COALESCE($5, last_name),
           email = COALESCE($6, email),
           status = COALESCE($7, status),
           updated_at = NOW()
       WHERE id = $1 OR user_id = $1
       RETURNING *`, [req.params.id, role ?? null, department_id ?? null, first_name ?? null, last_name ?? null, email ?? null, status ?? null]);
    res.json(updateResult.rows[0]);
});
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".users
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 OR user_id = $1
       RETURNING id`, [req.params.id]);
    if (!result.rows[0]) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
    }
    res.json({ success: true, message: 'User deleted' });
});
router.post('/bulk/assign-role', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const { user_ids, role } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0 || !role) {
        sendMissing(res, 'user_ids and role required');
        return;
    }
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const client = await (0, database_port_1.getClient)();
    try {
        await client.query('BEGIN');
        const result = await client.query(`UPDATE "${schema}".users
         SET role = $2, updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`, [user_ids, role]);
        await client.query('COMMIT');
        res.json({ success: true, updated: result.rows.length });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
});
router.post('/bulk/deactivate', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const { user_ids } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        sendMissing(res, 'user_ids required');
        return;
    }
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const client = await (0, database_port_1.getClient)();
    try {
        await client.query('BEGIN');
        const result = await client.query(`UPDATE "${schema}".users
         SET status = 'inactive', updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`, [user_ids]);
        await client.query('COMMIT');
        res.json({ success: true, updated: result.rows.length });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
});
router.post('/bulk/assign-department', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const { user_ids, department_id } = req.body ?? {};
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        sendMissing(res, 'user_ids required');
        return;
    }
    const schema = (0, database_port_1.tenantSchema)(req.tenantId);
    const client = await (0, database_port_1.getClient)();
    try {
        await client.query('BEGIN');
        const result = await client.query(`UPDATE "${schema}".users
         SET department_id = $2, updated_at = NOW()
         WHERE id = ANY($1::text[])
         RETURNING id`, [user_ids, department_id ?? null]);
        await client.query('COMMIT');
        res.json({ success: true, updated: result.rows.length });
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
});
exports.default = router;
//# sourceMappingURL=users.routes.js.map
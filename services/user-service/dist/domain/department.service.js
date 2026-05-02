"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartments = getDepartments;
exports.getDepartmentById = getDepartmentById;
exports.createDepartment = createDepartment;
exports.updateDepartment = updateDepartment;
exports.deleteDepartment = deleteDepartment;
const db_1 = require("@dos/db");
const module_sdk_1 = require("@dos/module-sdk");
const metrics_1 = require("../observability/metrics");
async function getDepartments(tenantId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const countResult = await c.query(`SELECT COUNT(*)::int AS count FROM dos.departments
          WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]);
            const listResult = await c.query(`SELECT * FROM dos.departments
          WHERE tenant_id = $1 AND deleted_at IS NULL
          ORDER BY name_en ASC`, [tenantId]);
            const rawCount = countResult.rows[0]?.count;
            const count = Number.isFinite(Number(rawCount)) ? Number(rawCount) : listResult.rows.length;
            return { count, rows: listResult.rows };
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('dept.list', Date.now() - start);
    }
}
async function getDepartmentById(tenantId, deptId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT * FROM dos.departments
          WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
          LIMIT 1`, [deptId, tenantId]);
            return result.rows[0] || null;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('dept.getById', Date.now() - start);
    }
}
async function createDepartment(tenantId, payload) {
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`INSERT INTO dos.departments
           (tenant_id, name_en, name_ar, code, bu_id, head_user_id, parent_id, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
         RETURNING *`, [
                tenantId,
                payload.name_en,
                payload.name_ar ?? null,
                payload.code ?? null,
                payload.bu_id ?? null,
                payload.head_user_id ?? null,
                payload.parent_id ?? null,
            ]);
            return result.rows[0];
        });
        metrics_1.userMetrics.deptCreated(tenantId);
        module_sdk_1.logger.info('[DepartmentService] Department created', { tenantId, name_en: payload.name_en });
        return row;
    }
    finally {
        metrics_1.userMetrics.observeDb('dept.create', Date.now() - start);
    }
}
async function updateDepartment(tenantId, deptId, payload) {
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.departments
         SET name_en      = COALESCE($3, name_en),
             name_ar      = COALESCE($4, name_ar),
             code         = COALESCE($5, code),
             bu_id        = COALESCE($6, bu_id),
             head_user_id = COALESCE($7, head_user_id),
             parent_id    = COALESCE($8, parent_id),
             status       = COALESCE($9, status),
             updated_at   = NOW()
         WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING *`, [
                deptId,
                tenantId,
                payload.name_en ?? null,
                payload.name_ar ?? null,
                payload.code ?? null,
                payload.bu_id ?? null,
                payload.head_user_id ?? null,
                payload.parent_id ?? null,
                payload.status ?? null,
            ]);
            return result.rows[0] || null;
        });
        if (row)
            metrics_1.userMetrics.deptUpdated(tenantId);
        return row;
    }
    finally {
        metrics_1.userMetrics.observeDb('dept.update', Date.now() - start);
    }
}
async function deleteDepartment(tenantId, deptId) {
    const start = Date.now();
    try {
        const deleted = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.departments
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE department_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING department_id`, [deptId, tenantId]);
            return result.rows.length > 0;
        });
        if (deleted)
            metrics_1.userMetrics.deptDeleted(tenantId);
        return { deleted };
    }
    finally {
        metrics_1.userMetrics.observeDb('dept.delete', Date.now() - start);
    }
}
//# sourceMappingURL=department.service.js.map
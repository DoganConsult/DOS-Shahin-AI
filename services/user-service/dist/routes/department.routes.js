"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departmentRouter = void 0;
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const department_service_1 = require("../domain/department.service");
const user_schemas_1 = require("../schemas/user.schemas");
const user_errors_1 = require("../domain/contracts/user-errors");
const rate_limiter_1 = require("../middleware/rate-limiter");
const ownership_1 = require("../middleware/ownership");
const router = (0, express_1.Router)();
exports.departmentRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
router.use((0, http_1.auditMiddleware)('department'));
router.get('/', (0, http_1.asyncHandler)(async (req, res) => {
    const result = await (0, department_service_1.getDepartments)(req.tenantId);
    res.json({ success: true, departments: result.rows, count: result.count });
}));
router.get('/:id', (0, http_1.asyncHandler)(async (req, res) => {
    const dept = await (0, department_service_1.getDepartmentById)(req.tenantId, req.params.id);
    if (!dept)
        throw new user_errors_1.UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
    res.json({ success: true, data: dept });
}));
router.post('/', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.createDepartmentBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const dept = await (0, department_service_1.createDepartment)(req.tenantId, req.body);
    (0, http_1.setAuditData)(res, { action: 'department.create', entityType: 'department', entityId: String(dept.dept_id ?? dept.id), afterState: dept });
    res.status(201).json({ success: true, data: dept });
}));
router.put('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.validate)({ body: user_schemas_1.updateDepartmentBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const updated = await (0, department_service_1.updateDepartment)(req.tenantId, req.params.id, req.body);
    if (!updated)
        throw new user_errors_1.UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
    (0, http_1.setAuditData)(res, { action: 'department.update', entityType: 'department', entityId: String(updated.dept_id ?? updated.id), afterState: updated });
    res.json({ success: true, data: updated });
}));
router.delete('/:id', rate_limiter_1.writeRateLimiter, (0, ownership_1.requireAdmin)(), (0, http_1.asyncHandler)(async (req, res) => {
    const result = await (0, department_service_1.deleteDepartment)(req.tenantId, req.params.id);
    if (!result.deleted)
        throw new user_errors_1.UserServiceError('DEPARTMENT_NOT_FOUND', undefined, { deptId: req.params.id });
    (0, http_1.setAuditData)(res, { action: 'department.delete', entityType: 'department', entityId: req.params.id });
    res.json({ success: true, message: 'Department deleted' });
}));
//# sourceMappingURL=department.routes.js.map
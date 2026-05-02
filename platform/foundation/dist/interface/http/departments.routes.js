"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_port_1 = require("../../ports/auth.port");
const middleware_port_1 = require("../../ports/middleware.port");
const department_service_1 = require("../../application/org/department.service");
const middleware_port_2 = require("../../ports/middleware.port");
const foundation_schemas_1 = require("../../schemas/foundation.schemas");
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('foundation'));
router.use((0, middleware_port_1.auditMiddleware)('foundation'));
router.use(middleware_port_1.scopeContext);
function sendMissing(res, error) {
    res.status(400).json({ success: false, error });
}
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), async (req, res) => {
    const result = await (0, department_service_1.getDepartments)(req.tenantId);
    res.json({
        success: true,
        departments: result.rows,
        count: result.count,
    });
});
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), async (req, res) => {
    const dept = await (0, department_service_1.getDepartmentById)(req.tenantId, req.params.id);
    if (!dept) {
        res.status(404).json({ success: false, error: 'Department not found' });
        return;
    }
    res.json(dept);
});
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const body = req.body ?? {};
    if (!body.name_en) {
        sendMissing(res, 'name_en required');
        return;
    }
    if (!body.bu_id) {
        sendMissing(res, 'bu_id required');
        return;
    }
    const newDept = await (0, department_service_1.createDepartment)(req.tenantId, body);
    res.status(201).json(newDept);
});
router.put('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    if (!req.body || Object.keys(req.body).length === 0) {
        sendMissing(res, 'update payload required');
        return;
    }
    const updated = await (0, department_service_1.updateDepartment)(req.tenantId, req.params.id, req.body);
    if (!updated) {
        res.status(404).json({ success: false, error: 'Department not found' });
        return;
    }
    res.json(updated);
});
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_2.validate)({ body: foundation_schemas_1.genericFoundationSchema }), async (req, res) => {
    const result = await (0, department_service_1.deleteDepartment)(req.tenantId, req.params.id);
    if (!result.deleted) {
        res.status(404).json({ success: false, error: 'Department not found' });
        return;
    }
    res.json({
        success: true,
        message: 'Department deleted'
    });
});
exports.default = router;
//# sourceMappingURL=departments.routes.js.map
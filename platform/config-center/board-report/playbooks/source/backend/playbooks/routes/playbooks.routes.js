"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const playbooks_ports_1 = require("../ports/playbooks.ports");
const service = __importStar(require("../services/playbooks.service"));
const playbooks_schemas_1 = require("../schemas/playbooks.schemas");
const zod_1 = require("zod");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const genericRouteSchema = zod_1.z.any();
const router = (0, express_1.Router)();
// §6: /api/playbooks/templates
router.post('/templates', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.manage'), (0, playbooks_ports_1.validate)({ body: playbooks_schemas_1.CreateTemplateSchema }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    const template = await service.createTemplate(req.tenantId, req.user.id, req.body);
    (0, playbooks_ports_1.setAuditData)(res, { action: 'create', entityType: 'playbook_template', entityId: template.id, afterState: template });
    res.status(201).json({ data: template });
}));
router.get('/templates/:id', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.read'), (0, playbooks_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    const detailed = await service.getTemplateDetailed(req.tenantId, req.params.id);
    res.json({ data: detailed });
}));
router.post('/templates/:id/steps', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.manage'), (0, playbooks_ports_1.validate)({ body: playbooks_schemas_1.CreateStepSchema }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    const step = await service.addStep(req.tenantId, req.user.id, req.params.id, req.body);
    (0, playbooks_ports_1.setAuditData)(res, { action: 'create', entityType: 'playbook_step', entityId: step.id, afterState: step });
    res.status(201).json({ data: step });
}));
// §6: /api/playbooks/executions
router.post('/templates/:id/execute', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.execute'), (0, playbooks_ports_1.validate)({ body: playbooks_schemas_1.ExecutePlaybookSchema }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    const execution = await service.executePlaybook(req.tenantId, req.user.id, req.params.id, req.body.triggerSourceEntity);
    (0, playbooks_ports_1.setAuditData)(res, { action: 'create', entityType: 'playbook_execution', entityId: execution.id, afterState: execution });
    res.status(201).json({ data: execution });
}));
router.post('/executions/:id/log', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.execute'), (0, playbooks_ports_1.validate)({ body: playbooks_schemas_1.LogStepSchema }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    const log = await service.logExecutionStep(req.tenantId, req.params.id, req.user.id, req.body);
    (0, playbooks_ports_1.setAuditData)(res, { action: 'create', entityType: 'playbook_execution_log', entityId: log.id, afterState: log });
    res.status(201).json({ data: log });
}));
router.post('/executions/:id/complete', playbooks_ports_1.authenticate, (0, playbooks_ports_1.requirePermission)('playbooks.execute'), (0, playbooks_ports_1.validate)({ body: genericRouteSchema }), (0, playbooks_ports_1.asyncHandler)(async (req, res) => {
    (0, playbooks_ports_1.setAuditData)(res, { action: 'update', entityType: 'playbook_execution', entityId: req.params.id, afterState: { status: 'completed' } });
    await service.completeExecution(req.tenantId, req.params.id, req.user.id);
    res.json({ data: { success: true } });
}));
exports.default = router;
//# sourceMappingURL=playbooks.routes.js.map
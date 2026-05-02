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
const zod_1 = require("zod");
const executive_ports_1 = require("../ports/executive.ports");
const service = __importStar(require("../services/executive.service"));
const executive_ai_service_1 = require("../services/executive-ai.service");
const executive_schemas_1 = require("../schemas/executive.schemas");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const genericRouteSchema = zod_1.z.any();
const router = (0, express_1.Router)();
// §6: /api/executive/briefs
router.get('/briefs', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.read'), (0, executive_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listBriefs(req.tenantId);
    res.json({ data });
}));
router.post('/briefs', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.brief.manage'), (0, executive_ports_1.validate)({ body: executive_schemas_1.CreateBriefSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const brief = await service.createBrief(req.tenantId, req.user.id, req.body);
    (0, executive_ports_1.setAuditData)(res, { action: 'create', entityType: 'executive_brief', entityId: brief.id, afterState: brief });
    res.status(201).json({ data: brief });
}));
router.patch('/briefs/:id/approve', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.brief.approve'), (0, executive_ports_1.validate)({ body: executive_schemas_1.ApproveBriefSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const brief = await service.approveBrief(req.tenantId, req.params.id, req.user.id, req.body.status);
    (0, executive_ports_1.setAuditData)(res, { action: 'update', entityType: 'executive_brief', entityId: req.params.id, afterState: brief });
    res.json({ data: brief });
}));
// §6: /api/executive/objectives
router.get('/objectives', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.read'), (0, executive_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listObjectives(req.tenantId);
    res.json({ data });
}));
router.post('/objectives', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.objective.manage'), (0, executive_ports_1.validate)({ body: executive_schemas_1.CreateObjectiveSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const obj = await service.createObjective(req.tenantId, req.user.id, req.body);
    (0, executive_ports_1.setAuditData)(res, { action: 'create', entityType: 'executive_objective', entityId: obj.id, afterState: obj });
    res.status(201).json({ data: obj });
}));
router.patch('/objectives/:id', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.objective.manage'), (0, executive_ports_1.validate)({ body: executive_schemas_1.UpdateObjectiveSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const obj = await service.updateObjective(req.tenantId, req.params.id, req.user.id, req.body);
    (0, executive_ports_1.setAuditData)(res, { action: 'update', entityType: 'executive_objective', entityId: req.params.id, afterState: obj });
    res.json({ data: obj });
}));
// §6: /api/executive/appetite
router.get('/appetite', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.read'), (0, executive_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listAppetites(req.tenantId);
    res.json({ data });
}));
router.post('/appetite', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.appetite.manage'), (0, executive_ports_1.validate)({ body: executive_schemas_1.CreateAppetiteSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const appetite = await service.createAppetite(req.tenantId, req.user.id, req.body);
    (0, executive_ports_1.setAuditData)(res, { action: 'create', entityType: 'executive_appetite', entityId: appetite.id, afterState: appetite });
    res.status(201).json({ data: appetite });
}));
router.post('/appetite/evaluate', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.appetite.manage'), (0, executive_ports_1.validate)({ body: genericRouteSchema }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const result = await service.evaluateAppetiteBreaches(req.tenantId);
    (0, executive_ports_1.setAuditData)(res, { action: 'create', entityType: 'executive_appetite_evaluation', afterState: result });
    res.json({ data: result });
}));
// §6: /api/executive/diagnostics
router.get('/diagnostics', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.read'), (0, executive_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.runDiagnostics(req.tenantId);
    res.json({ data });
}));
// W5: /api/executive/insights — serves <app-ai-insight-panel> module='executive'
router.get('/insights', executive_ports_1.authenticate, (0, executive_ports_1.requirePermission)('executive.read'), (0, executive_ports_1.asyncHandler)(async (req, res) => {
    const recommendations = await (0, executive_ai_service_1.getAiRecommendations)(req.tenantId, (req.query ?? {}));
    res.json({ recommendations, module: 'executive', generatedAt: new Date().toISOString() });
}));
exports.default = router;
//# sourceMappingURL=executive.routes.js.map
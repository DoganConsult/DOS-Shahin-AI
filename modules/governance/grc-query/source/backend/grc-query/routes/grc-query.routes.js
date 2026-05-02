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
const grc_query_ports_1 = require("../ports/grc-query.ports");
const service = __importStar(require("../services/grc-query.service"));
const grc_query_ai_service_1 = require("../services/grc-query-ai.service");
const grc_query_schemas_1 = require("../schemas/grc-query.schemas");
const zod_1 = require("zod");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const genericRouteSchema = zod_1.z.any();
const router = (0, express_1.Router)();
// §6: /api/grc-query/search
router.post('/search', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.read'), (0, grc_query_ports_1.validate)({ body: grc_query_schemas_1.UnifiedSearchSchema }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const result = await service.unifiedSearch(req.tenantId, req.user.id, req.body.query, req.body.limit, req.body.modules);
    res.json({ data: result });
}));
// §6: /api/grc-query/federated
router.post('/federated', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.read'), (0, grc_query_ports_1.validate)({ body: grc_query_schemas_1.FederatedSearchSchema }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const result = await service.federatedSearch(req.tenantId, req.user.id, req.body.queryDslJson, req.body.limit, req.body.modules);
    res.json({ data: result });
}));
// §6: /api/grc-query/nlq
router.post('/nlq', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.ai.use'), (0, grc_query_ports_1.validate)({ body: grc_query_schemas_1.NlqSearchSchema }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const result = await service.nlqSearch(req.tenantId, req.user.id, req.body.prompt, req.body.limit);
    res.json({ data: result });
}));
// §6: /api/grc-query/saved
router.get('/saved', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.read'), (0, grc_query_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listSavedQueries(req.tenantId, req.user.id);
    res.json({ data });
}));
router.post('/saved', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.manage'), (0, grc_query_ports_1.validate)({ body: grc_query_schemas_1.SaveQuerySchema }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const query = await service.saveQuery(req.tenantId, req.user.id, req.body.name, req.body.queryDslJson, req.body.isPublic);
    (0, grc_query_ports_1.setAuditData)(res, { action: 'create', entityType: 'saved_query', entityId: query.id, afterState: query });
    res.status(201).json({ data: query });
}));
router.delete('/saved/:id', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.manage'), (0, grc_query_ports_1.validate)({ body: genericRouteSchema }), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    (0, grc_query_ports_1.setAuditData)(res, { action: 'delete', entityType: 'saved_query', entityId: req.params.id });
    await service.deleteSavedQuery(req.tenantId, req.user.id, req.params.id);
    res.status(204).end();
}));
// W5: /insights — serves <app-ai-insight-panel> module='grc-query'
router.get('/insights', grc_query_ports_1.authenticate, (0, grc_query_ports_1.requirePermission)('grc-query.read'), (0, grc_query_ports_1.asyncHandler)(async (req, res) => {
    const recommendations = await (0, grc_query_ai_service_1.getAiRecommendations)(req.tenantId, (req.query ?? {}));
    res.json({ recommendations, module: 'grc-query', generatedAt: new Date().toISOString() });
}));
exports.default = router;
//# sourceMappingURL=grc-query.routes.js.map
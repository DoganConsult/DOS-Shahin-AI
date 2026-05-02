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
const attestation_ports_1 = require("../ports/attestation.ports");
const service = __importStar(require("../services/attestation.service"));
const attestation_schemas_1 = require("../schemas/attestation.schemas");
const genericPayloadSchema = zod_1.z.record(zod_1.z.unknown());
const router = (0, express_1.Router)();
// §6: /api/attestation/campaigns
router.get('/campaigns', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.read'), (0, attestation_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.listCampaigns(req.tenantId);
    res.json({ data });
}));
router.post('/campaigns', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.campaign.manage'), (0, attestation_ports_1.validate)({ body: attestation_schemas_1.CreateCampaignSchema }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const campaign = await service.createCampaign(req.tenantId, req.user.id, req.body);
    res.status(201).json({ data: campaign });
}));
router.patch('/campaigns/:id/transition', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.campaign.manage'), (0, attestation_ports_1.validate)({ body: attestation_schemas_1.TransitionCampaignSchema }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const campaign = await service.transitionCampaign(req.tenantId, req.params.id, req.body.targetStatus, req.user.id);
    res.json({ data: campaign });
}));
// §6: /api/attestation/records
router.post('/records', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.record.manage'), (0, attestation_ports_1.validate)({ body: attestation_schemas_1.CreateRecordSchema }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const record = await service.createRecord(req.tenantId, req.body);
    res.status(201).json({ data: record });
}));
// §7 SoD enforced: reviewer != attestor
router.patch('/records/:id/review', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.record.review'), (0, attestation_ports_1.validate)({ body: attestation_schemas_1.ReviewRecordSchema }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const record = await service.reviewRecord(req.tenantId, req.params.id, req.user.id, req.body);
    res.json({ data: record });
}));
// §6: /api/attestation/diagnostics
router.get('/diagnostics', attestation_ports_1.authenticate, (0, attestation_ports_1.requirePermission)('attestation.read'), (0, attestation_ports_1.validate)({ query: zod_1.z.record(zod_1.z.unknown()) }), (0, attestation_ports_1.asyncHandler)(async (req, res) => {
    const data = await service.runDiagnostics(req.tenantId);
    res.json({ data });
}));
exports.default = router;
//# sourceMappingURL=attestation.routes.js.map
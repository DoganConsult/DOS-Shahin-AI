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
exports.inheritanceRouter = void 0;
/**
 * GET /api/foundation/inheritance/:scopeType/:scopeId
 *
 * Returns the ancestor chain (and any inherited items) for an org / BU /
 * department scope. Foundation owns the chain; consumers (DAuth for SoD
 * tightening, governance for policy stacking, DOS for SLA) decide how to
 * apply the items.
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
const express_1 = require("express");
const auth_adapter_1 = require("../../infrastructure/auth.adapter");
const middleware_port_1 = require("../../ports/middleware.port");
const svc = __importStar(require("./inheritance.service"));
const router = (0, express_1.Router)();
exports.inheritanceRouter = router;
router.use(auth_adapter_1.authenticate);
router.use(auth_adapter_1.requireTenantId);
const VALID_SCOPES = new Set(['organization', 'business_unit', 'department']);
router.get('/:scopeType/:scopeId', (0, auth_adapter_1.requireAnyPermission)('admin', 'org_admin', 'governance_read', 'member'), (0, middleware_port_1.asyncHandler)(async (req, res) => {
    const scopeType = req.params.scopeType;
    if (!VALID_SCOPES.has(scopeType)) {
        res.status(400).json({
            success: false,
            error: `Invalid scopeType '${scopeType}'. Allowed: organization, business_unit, department`,
        });
        return;
    }
    res.json({
        success: true,
        data: await svc.getInheritance(req.tenantId, scopeType, req.params.scopeId),
    });
}));
//# sourceMappingURL=inheritance.routes.js.map
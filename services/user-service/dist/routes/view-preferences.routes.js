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
exports.viewPreferencesRouter = void 0;
/**
 * View preferences — per-user / per-tenant / per-module saved view configs.
 * Phase 14.2 — backs FE `switchView()` / `saveViewPreset()` / `shareView()`.
 *
 * Endpoints (all auth + tenant-scoped):
 *   GET    /api/users/me/view-preferences              — list my prefs (optionally filter by module)
 *   GET    /api/users/me/view-preferences/:module/:view — read a single view
 *   PUT    /api/users/me/view-preferences/:module/:view — upsert
 *   DELETE /api/users/me/view-preferences/:module/:view — delete
 *   GET    /api/users/view-preferences/shared          — list tenant-shared presets (is_shared=true)
 */
const express_1 = require("express");
const auth_adapter_1 = require("../adapters/auth.adapter");
const http_1 = require("@dos/platform-core/http");
const zod_1 = require("zod");
const viewPref = __importStar(require("../domain/view-preference.service"));
const user_errors_1 = require("../domain/contracts/user-errors");
exports.viewPreferencesRouter = (0, express_1.Router)();
exports.viewPreferencesRouter.use(auth_adapter_1.authenticate);
exports.viewPreferencesRouter.use(auth_adapter_1.requireTenantId);
const upsertBody = zod_1.z.object({
    config: zod_1.z.record(zod_1.z.unknown()).default({}).describe('Arbitrary view configuration object'),
    isShared: zod_1.z.boolean().optional().describe('Share this preset with the tenant (requires admin)'),
});
function hasShareAuthority(req) {
    const roles = req.user?.roles;
    const primary = req.user?.role;
    const candidates = new Set([...(roles ?? []), ...(primary ? [primary] : [])]);
    return candidates.has('admin') || candidates.has('user_admin');
}
exports.viewPreferencesRouter.get('/me/view-preferences', (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.tenantId;
    const moduleFilter = typeof req.query.module === 'string' ? req.query.module : undefined;
    const rows = await viewPref.listForUser(tenantId, userId, moduleFilter);
    res.json({ success: true, data: rows });
}));
exports.viewPreferencesRouter.get('/me/view-preferences/:module/:view', (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.tenantId;
    const row = await viewPref.getOne(tenantId, userId, req.params.module, req.params.view);
    if (!row)
        throw new user_errors_1.UserServiceError('VIEW_PREF_NOT_FOUND');
    res.json({ success: true, data: row });
}));
exports.viewPreferencesRouter.put('/me/view-preferences/:module/:view', (0, http_1.validate)({ body: upsertBody }), (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.tenantId;
    const { config, isShared } = req.body;
    const row = await viewPref.upsert(tenantId, userId, req.params.module, req.params.view, { config, isShared: isShared ?? null }, { canShare: hasShareAuthority(req) });
    res.status(200).json({ success: true, data: row });
}));
exports.viewPreferencesRouter.delete('/me/view-preferences/:module/:view', (0, http_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const tenantId = req.tenantId;
    const deleted = await viewPref.remove(tenantId, userId, req.params.module, req.params.view);
    res.json({ success: true, deleted });
}));
exports.viewPreferencesRouter.get('/view-preferences/shared', (0, http_1.asyncHandler)(async (req, res) => {
    const tenantId = req.tenantId;
    const moduleFilter = typeof req.query.module === 'string' ? req.query.module : undefined;
    const rows = await viewPref.listShared(tenantId, moduleFilter);
    res.json({ success: true, data: rows });
}));
exports.default = exports.viewPreferencesRouter;
//# sourceMappingURL=view-preferences.routes.js.map
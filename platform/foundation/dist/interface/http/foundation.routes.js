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
const express_1 = require("express");
const auth_port_1 = require("../../ports/auth.port");
const middleware_port_1 = require("../../ports/middleware.port");
const foundation_schemas_1 = require("../../schemas/foundation.schemas");
const common_schemas_1 = require("../../schemas/common.schemas");
const ctrl = __importStar(require("./controllers/foundation.controller"));
const router = (0, express_1.Router)();
router.use((0, middleware_port_1.moduleStack)('foundation'));
router.use((0, middleware_port_1.auditMiddleware)('foundation'));
router.use(middleware_port_1.scopeContext);
router.get('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.validate)({ query: foundation_schemas_1.foundationListQuery }), (0, middleware_port_1.asyncHandler)(ctrl.listNodes));
router.get('/tree', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.asyncHandler)(ctrl.getTree));
router.get('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(ctrl.getById));
router.get('/:id/children', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.read'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(ctrl.getChildNodes));
router.post('/', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_1.validate)({ body: foundation_schemas_1.foundationNodeCreateBody }), (0, middleware_port_1.asyncHandler)(ctrl.create));
router.patch('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.write'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam, body: foundation_schemas_1.foundationNodeUpdateBody }), (0, middleware_port_1.asyncHandler)(ctrl.update));
router.post('/:id/transition', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.approve'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(ctrl.transitionStatus));
router.delete('/:id', auth_port_1.authenticate, (0, auth_port_1.requirePermission)('foundation.record.delete'), (0, middleware_port_1.validate)({ params: common_schemas_1.idParam }), (0, middleware_port_1.asyncHandler)(ctrl.remove));
exports.default = router;
//# sourceMappingURL=foundation.routes.js.map
"use strict";
// Host adapter: loads the extracted Foundation platform module and composes the
// /api/foundation aggregator using the factory with host-owned identity routers
// (user/team/role/department) injected as deps. Re-exports individual routers
// with the names server.ts expects. All route and service logic lives in
// platform/foundation/. No forking allowed (platform-neutral rule, 2026-05-01).
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
exports.foundationRouter = exports.delegationRouter = exports.accessReviewRouter = exports.bulkInviteRouter = exports.userLifecycleRouter = exports.foundationGovernanceRouter = exports.sodCheckRouter = exports.ownershipMappingRouter = exports.committeeManagementRouter = exports.orgHierarchyRouter = exports.locationsRouter = exports.positionsRouter = exports.businessUnitsRouter = exports.organizationsRouter = void 0;
const path = __importStar(require("path"));
const service_bootstrap_1 = require("@dos/service-bootstrap");
const user_routes_1 = require("../../routes/user.routes");
const team_routes_1 = require("../../routes/team.routes");
const role_routes_1 = require("../../routes/role.routes");
const department_routes_1 = require("../../routes/department.routes");
// Foundation is a platform module — canonical location: <platform-root>/platform/foundation
// __dirname at runtime → <platform-root>/services/user-service/dist/domain/foundation
// 5 ups reaches <platform-root>, then + platform/foundation/dist.
// Override with `FOUNDATION_MODULE_DIST` env var for ops/CI flexibility.
const FOUNDATION_DIST_DEFAULT = path.resolve(__dirname, '../../../../..', 'platform', 'foundation', 'dist');
const MOD_BASE = process.env.FOUNDATION_MODULE_DIST
    ? path.resolve(process.env.FOUNDATION_MODULE_DIST)
    : FOUNDATION_DIST_DEFAULT;
const primary = (0, service_bootstrap_1.loadModuleExports)('foundation', `${MOD_BASE}/index`);
if (!primary || typeof primary.createFoundationAggregatorRouter !== 'function') {
    const reason = primary?._loadError ?? 'createFoundationAggregatorRouter missing from foundation dist';
    // Strict-mode contract: in production we refuse to boot user-service with
    // empty Foundation routers (which would silently 404). Set
    // MOUNT_FILTER_MODE=compatibility only for non-prod debugging.
    if ((process.env.MOUNT_FILTER_MODE || 'strict').toLowerCase() === 'strict') {
        throw new Error(`[user-service] Foundation module failed to load from ${MOD_BASE}: ${reason}. ` +
            `Build the canonical Foundation module (pnpm --filter @dos/module-foundation build) ` +
            `or set FOUNDATION_MODULE_DIST to the correct dist path.`);
    }
}
const moduleExports = (() => {
    if (primary && typeof primary.createFoundationAggregatorRouter === 'function') {
        return primary;
    }
    // Per-router degradation — if the bundle failed we still expose empty
    // routers so the host boots and /api/foundation/modules surfaces the
    // error rather than crash-looping.
    return {
        createFoundationAggregatorRouter: (_deps) => (0, service_bootstrap_1.loadModuleRoute)('foundation/aggregator', `${MOD_BASE}/interface/http/foundation-aggregator.routes`),
        organizationsRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/organizations', `${MOD_BASE}/interface/http/organizations.routes`),
        businessUnitsRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/business-units', `${MOD_BASE}/interface/http/business-units.routes`),
        positionsRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/positions', `${MOD_BASE}/interface/http/positions.routes`),
        locationsRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/locations', `${MOD_BASE}/interface/http/locations.routes`),
        orgHierarchyRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/org-hierarchy', `${MOD_BASE}/interface/http/org-hierarchy.routes`),
        committeeManagementRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/committee', `${MOD_BASE}/interface/http/committee-management.routes`),
        ownershipMappingRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/ownership-mapping', `${MOD_BASE}/interface/http/ownership-mapping.routes`),
        sodCheckRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/sod-check', `${MOD_BASE}/interface/http/sod-check.routes`),
        foundationGovernanceRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/governance', `${MOD_BASE}/interface/http/foundation-governance.routes`),
        userLifecycleRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/user-lifecycle', `${MOD_BASE}/interface/http/user-lifecycle.routes`),
        bulkInviteRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/bulk-invite', `${MOD_BASE}/interface/http/bulk-invite.routes`),
        accessReviewRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/access-review', `${MOD_BASE}/interface/http/access-review.routes`),
        delegationRouter: (0, service_bootstrap_1.loadModuleRoute)('foundation/delegation', `${MOD_BASE}/interface/http/delegation.routes`),
        _loadError: primary?._loadError ?? 'module exports did not include factory',
    };
})();
exports.organizationsRouter = moduleExports.organizationsRouter;
exports.businessUnitsRouter = moduleExports.businessUnitsRouter;
exports.positionsRouter = moduleExports.positionsRouter;
exports.locationsRouter = moduleExports.locationsRouter;
exports.orgHierarchyRouter = moduleExports.orgHierarchyRouter;
exports.committeeManagementRouter = moduleExports.committeeManagementRouter;
exports.ownershipMappingRouter = moduleExports.ownershipMappingRouter;
exports.sodCheckRouter = moduleExports.sodCheckRouter;
exports.foundationGovernanceRouter = moduleExports.foundationGovernanceRouter;
exports.userLifecycleRouter = moduleExports.userLifecycleRouter;
exports.bulkInviteRouter = moduleExports.bulkInviteRouter;
exports.accessReviewRouter = moduleExports.accessReviewRouter;
exports.delegationRouter = moduleExports.delegationRouter;
// /api/foundation aggregator — composed with host-owned identity routers.
exports.foundationRouter = typeof moduleExports.createFoundationAggregatorRouter === 'function'
    ? moduleExports.createFoundationAggregatorRouter({
        userRouter: user_routes_1.userRouter,
        teamRouter: team_routes_1.teamRouter,
        roleRouter: role_routes_1.roleRouter,
        departmentRouter: department_routes_1.departmentRouter,
    })
    : (0, service_bootstrap_1.loadModuleRoute)('foundation/aggregator-fallback', `${MOD_BASE}/routes/foundation-aggregator.routes`);
//# sourceMappingURL=index.js.map
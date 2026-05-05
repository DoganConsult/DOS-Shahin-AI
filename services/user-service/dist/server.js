"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const service_bootstrap_1 = require("@dos/service-bootstrap");
const runtime_config_1 = require("@dos/runtime-config");
const event_backbone_1 = require("@dos/event-backbone");
const module_sdk_1 = require("@dos/module-sdk");
const db_1 = require("@dos/db");
const user_routes_1 = require("./routes/user.routes");
const team_routes_1 = require("./routes/team.routes");
const role_routes_1 = require("./routes/role.routes");
const department_routes_1 = require("./routes/department.routes");
const view_preferences_routes_1 = __importDefault(require("./routes/view-preferences.routes"));
const invitations_routes_1 = require("./routes/invitations.routes");
const audit_trail_routes_1 = require("./routes/audit-trail.routes");
const profiles_routes_1 = require("./routes/profiles.routes");
const role_profile_routes_1 = require("./routes/role-profile.routes");
const privacy_ops_routes_1 = require("./routes/privacy-ops.routes");
const health_foundation_1 = require("./routes/health.foundation");
const foundation_1 = require("./domain/foundation");
const consumer_1 = require("./events/consumer");
const SERVICE_CODE = 'user-service';
async function checkDatabase() {
    try {
        const { query } = await import('@dos/db');
        const result = await query('SELECT 1 AS ok');
        return !!result && result.rows[0]?.ok === 1;
    }
    catch (err) {
        module_sdk_1.logger.warn('[user-service.health] Database check failed', { err: err?.message });
        return false;
    }
}
async function checkRedis() {
    try {
        const { isRedisHealthy } = await import('@dos/db');
        const res = await isRedisHealthy();
        return res.connected === true;
    }
    catch (err) {
        module_sdk_1.logger.warn('[user-service.health] Redis check failed', { err: err?.message });
        return false;
    }
}
async function checkCriticalTables() {
    try {
        const { query } = await import('@dos/db');
        const result = await query(`SELECT COUNT(*)::int AS n
         FROM information_schema.tables
        WHERE (table_schema = 'dos'    AND table_name IN ('teams','departments','user_role_assignments'))
           OR (table_schema = 'public' AND table_name IN ('users','user_view_preferences'))`);
        const count = result.rows[0]?.n ?? 0;
        return count >= 5;
    }
    catch (err) {
        module_sdk_1.logger.warn('[user-service.health] Schema check failed', { err: err?.message });
        return false;
    }
}
async function main() {
    const config = (0, runtime_config_1.loadServiceConfig)(SERVICE_CODE);
    // Initialize the shared @dos/db Redis client on startup. Without this,
    // isRedisHealthy() in checkRedis() returns {connected: false} because
    // the module-level client is never opened — matching the pattern used
    // by onboarding-service/server.ts:96. Rate limiter and cache helpers
    // also depend on the shared client being connected.
    const redisReady = await (0, db_1.connectRedis)();
    if (!redisReady) {
        module_sdk_1.logger.warn(`[${SERVICE_CODE}] Redis connection not ready at boot — cache/rate-limit will use in-memory fallback`);
    }
    const eventBus = (0, event_backbone_1.createEventBackbone)({
        redisUrl: config.redis.url,
        serviceCode: SERVICE_CODE,
        logger: module_sdk_1.logger,
    });
    (0, module_sdk_1.setEventBus)(eventBus);
    // P8.1 — bind the foundation module's domain-event publisher to the
    // shared event-backbone so emits flow through the platform outbox.
    // Also bind database + auth ports so foundation route handlers can
    // execute SQL via @dos/db and enforce real authentication via @dos/dauth-shared.
    try {
        const path = await import('path');
        // Foundation is a platform module living at <platform-root>/platform/foundation
        // (platform-neutral rule, 2026-05-01 — single canonical location, no relocation).
        // Post Phase-0 consolidation services live at <platform-root>/services/<svc>/.
        // __dirname at runtime → <platform-root>/services/user-service/dist
        // 3 ups reaches <platform-root>, then + platform/foundation/dist.
        const foundationDist = process.env.FOUNDATION_MODULE_DIST
            ? path.resolve(process.env.FOUNDATION_MODULE_DIST)
            : path.resolve(__dirname, '../../..', 'platform', 'foundation', 'dist');
        const foundationMod = require(`${foundationDist}/index`);
        if (typeof foundationMod.bindFoundationPublisher === 'function') {
            foundationMod.bindFoundationPublisher(eventBus);
        }
        if (typeof foundationMod.bindFoundationPorts === 'function') {
            const dbMod = await import('@dos/db');
            foundationMod.bindFoundationPorts({
                database: {
                    getClient: dbMod.getClient,
                    getPool: dbMod.getPool,
                    query: dbMod.query,
                    safeQuery: dbMod.safeQuery,
                    tenantSchema: dbMod.tenantSchema,
                    withTenantClient: dbMod.withTenantClient,
                },
                logger: module_sdk_1.logger,
            });
        }
        // Bind real DAuth authentication so passthrough no-op is replaced.
        try {
            const authAdapter = require(`${foundationDist}/infrastructure/auth.adapter`);
            if (typeof authAdapter.bindDauthShared === 'function') {
                const ok = await authAdapter.bindDauthShared();
                if (!ok)
                    module_sdk_1.logger.warn(`[${SERVICE_CODE}] foundation auth port left as passthrough (dauth-shared unavailable)`);
            }
        }
        catch (authErr) {
            module_sdk_1.logger.warn(`[${SERVICE_CODE}] foundation auth port bind failed: ${authErr?.message ?? authErr}`);
        }
    }
    catch (err) {
        module_sdk_1.logger.warn(`[${SERVICE_CODE}] foundation ports bind failed: ${err?.message ?? err}`);
    }
    const { start } = await (0, service_bootstrap_1.createServiceServer)({
        serviceCode: SERVICE_CODE,
        port: config.port,
        routes: [
            // View preferences mount ABOVE /api/users so `/api/users/me/view-preferences/...`
            // is matched before the user-CRUD `/api/users/:id` pattern.
            { path: '/api/users', router: view_preferences_routes_1.default },
            { path: '/api/users', router: user_routes_1.userRouter },
            { path: '/api/teams', router: team_routes_1.teamRouter },
            { path: '/api/roles', router: role_routes_1.roleRouter },
            { path: '/api/departments', router: department_routes_1.departmentRouter },
            // Foundation module routes
            { path: '/api/organizations', router: foundation_1.organizationsRouter },
            { path: '/api/business-units', router: foundation_1.businessUnitsRouter },
            { path: '/api/positions', router: foundation_1.positionsRouter },
            { path: '/api/locations', router: foundation_1.locationsRouter },
            { path: '/api/org-hierarchy', router: foundation_1.orgHierarchyRouter },
            { path: '/api/committees', router: foundation_1.committeeManagementRouter },
            { path: '/api/ownership-mappings', router: foundation_1.ownershipMappingRouter },
            // F1.16 singular alias mount.
            { path: '/api/ownership-mapping', router: foundation_1.ownershipMappingRouter },
            { path: '/api/sod', router: foundation_1.sodCheckRouter },
            { path: '/api/governance', router: foundation_1.foundationGovernanceRouter },
            { path: '/api/user-lifecycle', router: foundation_1.userLifecycleRouter },
            { path: '/api/bulk-invite', router: foundation_1.bulkInviteRouter },
            { path: '/api/access-reviews', router: foundation_1.accessReviewRouter },
            // F1.17 singular alias mount.
            { path: '/api/access-review', router: foundation_1.accessReviewRouter },
            { path: '/api/delegations', router: foundation_1.delegationRouter },
            // F1.15 — FE calls /api/governance/delegations; gateway routes this
            // specific prefix to user-service (more specific than /api/governance
            // which goes to governance-policy-service). Mount the delegation
            // router here too so the route resolves.
            { path: '/api/governance/delegations', router: foundation_1.delegationRouter },
            // F1.20 — committees module: canonical /api/committees plus
            // /api/governance/committees (FE governance module calls both).
            { path: '/api/governance/committees', router: foundation_1.committeeManagementRouter },
            // Foundation Zero-Blocker mounts — FE contracts against these exact prefixes.
            { path: '/api/invitations', router: invitations_routes_1.invitationsRouter },
            { path: '/api/audit-trail', router: audit_trail_routes_1.auditTrailRouter },
            { path: '/api/profiles', router: profiles_routes_1.profilesRouter },
            // Wave F-Build — canonical role-profile surface (sole URA writer).
            { path: '/api/role-profile', router: role_profile_routes_1.roleProfileRouter },
            { path: '/api/privacy-ops', router: privacy_ops_routes_1.privacyOpsRouter },
            // V2b — Foundation aggregator: Shahin calls /api/foundation/users,
            // /api/foundation/teams, /api/foundation/dashboard etc. against the
            // same handlers as the top-level /api/users, /api/teams routes.
            { path: '/api/foundation', router: foundation_1.foundationRouter },
            // Foundation DNA readiness probe — consumed by PlatformReadinessService
            // in @dos/access-store to flip Foundation's nav state between
            // 'backend-offline' and enabled. No auth required.
            { path: '/api/health/foundation', router: health_foundation_1.healthFoundationRouter },
        ],
        healthChecks: {
            database: checkDatabase,
            redis: checkRedis,
            schema: checkCriticalTables,
        },
    });
    await (0, consumer_1.startConsumer)();
    await start();
}
main().catch(err => {
    module_sdk_1.logger.error(`[${SERVICE_CODE}] Failed to start`, { err: err?.message });
    // Fatal startup failure — intentional console output before process exit.
    console.error(`Failed to start ${SERVICE_CODE}:`, err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
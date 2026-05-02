"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindFoundationPorts = bindFoundationPorts;
exports.registerFoundation = registerFoundation;
exports.onInstall = onInstall;
exports.onActivate = onActivate;
exports.onMigrate = onMigrate;
exports.onUninstall = onUninstall;
const ports_1 = require("./ports");
const foundation_aggregator_routes_1 = require("./interface/http/foundation-aggregator.routes");
const foundation_health_routes_1 = require("./interface/http/foundation-health.routes");
const foundation_bootstrap_service_1 = require("./application/bootstrap/foundation-bootstrap.service");
const carbon_only_boot_probe_1 = require("./application/bootstrap/carbon-only-boot-probe");
const logger_port_1 = require("./ports/logger.port");
const module_manifest_json_1 = __importDefault(require("./module.manifest.json"));
function bindFoundationPorts(bindings = {}) {
    if (bindings.database)
        (0, ports_1.bindDatabasePort)(bindings.database);
    if (bindings.logger)
        (0, ports_1.bindLoggerPort)(bindings.logger);
    if (bindings.middleware)
        (0, ports_1.bindMiddlewarePort)(bindings.middleware);
    if (bindings.response)
        (0, ports_1.bindResponsePort)(bindings.response);
    if (bindings.resilience)
        (0, ports_1.bindResiliencePort)(bindings.resilience);
    if (bindings.lifecycle)
        (0, ports_1.bindLifecyclePort)(bindings.lifecycle);
    if (bindings.blueprint)
        (0, ports_1.bindBlueprintPort)(bindings.blueprint);
    if (bindings.ai)
        (0, ports_1.bindAiPort)(bindings.ai);
}
function registerFoundation(options = {}) {
    bindFoundationPorts(options);
    // Fail-fast guard — the aggregator mounts host-owned identity routers
    // (`/users`, `/roles`, `/departments`); without them the router would
    // silently 404 and mask a host-wiring regression.
    const deps = options.aggregatorDeps;
    if (!deps || !deps.userRouter || !deps.roleRouter || !deps.departmentRouter) {
        const missing = ['userRouter', 'roleRouter', 'departmentRouter'].filter((k) => !deps || !deps[k]);
        throw new Error(`[foundation] registerFoundation: missing aggregatorDeps.{${missing.join(',')}} — host must inject identity routers before mounting`);
    }
    const router = (0, foundation_aggregator_routes_1.createFoundationAggregatorRouter)(deps);
    // Canonical module manifest schema (platform/contracts/module/module.manifest.schema.json)
    // forbids unknown root fields. Runtime hosting hints (routeBase, eventNamespace, etc.)
    // live under metadata.runtime, where additionalProperties is allowed.
    const mountPath = options.mountPath ?? module_manifest_json_1.default.metadata?.runtime?.routeBase ?? '/api/foundation';
    if (options.app) {
        options.app.use(mountPath, router);
        options.app.use(`${mountPath}/health`, foundation_health_routes_1.foundationHealthRouter);
    }
    logger_port_1.logger.info('foundation.registered', { mountPath, version: module_manifest_json_1.default.version });
    return {
        moduleCode: module_manifest_json_1.default.moduleCode,
        routeBase: mountPath,
        router,
        healthRouter: foundation_health_routes_1.foundationHealthRouter,
        manifest: module_manifest_json_1.default,
    };
}
async function onInstall(ctx = {}) {
    logger_port_1.logger.info('foundation.onInstall', { tenantId: ctx.tenantId });
    if (ctx.tenantId) {
        await (0, foundation_bootstrap_service_1.bootstrapFoundationDefaults)({ tenantId: ctx.tenantId, actorId: 'system' }).catch((err) => {
            logger_port_1.logger.error('foundation.onInstall.bootstrap.failed', { tenantId: ctx.tenantId, err: String(err) });
        });
    }
}
async function onActivate(ctx = {}) {
    logger_port_1.logger.info('foundation.onActivate', { tenantId: ctx.tenantId });
    // Layer 7 of Carbon-only enforcement: refuse to activate if catalog
    // or runtime registry has drifted away from IBM-Carbon-only invariants.
    // Runs once per service start, before HTTP traffic begins.
    await (0, carbon_only_boot_probe_1.runCarbonOnlyBootProbe)();
}
async function onMigrate(ctx = {}) {
    logger_port_1.logger.info('foundation.onMigrate', { tenantId: ctx.tenantId, toVersion: ctx.toVersion });
}
async function onUninstall(ctx = {}) {
    logger_port_1.logger.info('foundation.onUninstall', { tenantId: ctx.tenantId });
}
exports.default = registerFoundation;
//# sourceMappingURL=bootstrap.js.map
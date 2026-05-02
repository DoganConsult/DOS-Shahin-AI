"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadModuleRoute = loadModuleRoute;
exports.loadModuleExports = loadModuleExports;
exports.getModuleLoadResults = getModuleLoadResults;
exports.modulesDiagnosticRouter = modulesDiagnosticRouter;
const express_1 = require("express");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'module-loader' });
const loadedModules = [];
/**
 * Safely load a module route file with error visibility.
 * Replaces the silent `try { require(...) } catch { Router() }` pattern.
 */
function loadModuleRoute(name, modulePath) {
    try {
        // Runtime module path — dynamic require is intentional for the plugin-loader pattern.
        let mod = require(modulePath);
        mod = mod.default || mod.router || mod;
        // Express routers are functions (with .use/.get/etc). If what came back
        // is not a middleware function, treat it as a load failure so the
        // aggregator doesn't crash at Router.use().
        if (typeof mod !== 'function') {
            const message = `module at '${modulePath}' did not export a Router (got ${typeof mod})`;
            loadedModules.push({ name, path: modulePath, loaded: false, error: message });
            logger.error({ module: name, path: modulePath, error: message }, 'Module route load FAILED — empty router substituted (404 risk)');
            maybeFailFast(name, modulePath, message);
            return (0, express_1.Router)();
        }
        loadedModules.push({ name, path: modulePath, loaded: true });
        return mod;
    }
    catch (err) {
        const message = err?.message || 'Unknown error';
        loadedModules.push({ name, path: modulePath, loaded: false, error: message });
        // R4: production must not silently degrade module routes to 404. Log at
        // error in every environment and, when MOUNT_FILTER_MODE=strict, throw
        // so the service refuses to boot with a partial route table.
        logger.error({ module: name, path: modulePath, error: message }, 'Module route load FAILED — empty router substituted (404 risk)');
        maybeFailFast(name, modulePath, message);
        return (0, express_1.Router)();
    }
}
/**
 * R4: when MOUNT_FILTER_MODE=strict, fail service boot rather than silently
 * mounting an empty router (which manifests as 404s on routes that should
 * exist). Default mode 'compatibility' keeps the legacy behaviour for
 * gradual rollout.
 */
function maybeFailFast(name, modulePath, message) {
    const mode = (process.env.MOUNT_FILTER_MODE || 'compatibility').toLowerCase();
    if (mode === 'strict') {
        throw new Error(`[module-loader] STRICT mode: module '${name}' at '${modulePath}' failed to load: ${message}`);
    }
}
/**
 * Dynamically load the full CommonJS export surface of a module. Used by
 * host services that need to call a factory (e.g. createXxxRouter(deps)) or
 * consume multiple named exports rather than a single Router default.
 *
 * Records load outcome in the same diagnostics table as loadModuleRoute.
 */
function loadModuleExports(name, modulePath) {
    try {
        // Runtime module path — dynamic require is intentional for the plugin-loader pattern.
        const mod = require(modulePath);
        loadedModules.push({ name, path: modulePath, loaded: true });
        return mod;
    }
    catch (err) {
        const message = err?.message || 'Unknown error';
        loadedModules.push({ name, path: modulePath, loaded: false, error: message });
        logger.error({ module: name, path: modulePath, error: message }, 'Module exports load FAILED — empty object returned');
        maybeFailFast(name, modulePath, message);
        return {};
    }
}
/**
 * Returns diagnostics about loaded/failed module routes.
 * Mount as GET /api/{service}/modules for ops visibility.
 */
function getModuleLoadResults() {
    const loaded = loadedModules.filter(m => m.loaded).length;
    const failed = loadedModules.filter(m => !m.loaded).length;
    return {
        total: loadedModules.length,
        loaded,
        failed,
        modules: loadedModules,
    };
}
/**
 * Express route handler for the /modules diagnostic endpoint.
 */
function modulesDiagnosticRouter() {
    const router = (0, express_1.Router)();
    router.get('/', (_req, res) => {
        res.json(getModuleLoadResults());
    });
    return router;
}
//# sourceMappingURL=module-loader.js.map
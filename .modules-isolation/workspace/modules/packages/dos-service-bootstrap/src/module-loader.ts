import { Router } from 'express';
import pino from 'pino';

const logger = pino({ name: 'module-loader' });

export interface ModuleLoadResult {
  name: string;
  path: string;
  loaded: boolean;
  error?: string;
}

const loadedModules: ModuleLoadResult[] = [];

/**
 * Safely load a module route file with error visibility.
 * Replaces the silent `try { require(...) } catch { Router() }` pattern.
 */
export function loadModuleRoute(name: string, modulePath: string): any {
  try {
    // Runtime module path — dynamic require is intentional for the plugin-loader pattern.
    let mod = require(modulePath) as Record<string, unknown>;
    mod = (mod.default as Record<string, unknown>) || (mod.router as Record<string, unknown>) || mod;
    // Express routers are functions (with .use/.get/etc). If what came back
    // is not a middleware function, treat it as a load failure so the
    // aggregator doesn't crash at Router.use().
    if (typeof mod !== 'function') {
      const message = `module at '${modulePath}' did not export a Router (got ${typeof mod})`;
      loadedModules.push({ name, path: modulePath, loaded: false, error: message });
      logger.error({ module: name, path: modulePath, error: message }, 'Module route load FAILED — empty router substituted (404 risk)');
      maybeFailFast(name, modulePath, message);
      return Router();
    }
    loadedModules.push({ name, path: modulePath, loaded: true });
    return mod;
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    loadedModules.push({ name, path: modulePath, loaded: false, error: message });
    // R4: production must not silently degrade module routes to 404. Log at
    // error in every environment and, when MOUNT_FILTER_MODE=strict, throw
    // so the service refuses to boot with a partial route table.
    logger.error({ module: name, path: modulePath, error: message }, 'Module route load FAILED — empty router substituted (404 risk)');
    maybeFailFast(name, modulePath, message);
    return Router();
  }
}

/**
 * R4: when MOUNT_FILTER_MODE=strict, fail service boot rather than silently
 * mounting an empty router (which manifests as 404s on routes that should
 * exist). Default mode 'compatibility' keeps the legacy behaviour for
 * gradual rollout.
 */
function maybeFailFast(name: string, modulePath: string, message: string): void {
  const mode = (process.env.MOUNT_FILTER_MODE || 'compatibility').toLowerCase();
  if (mode === 'strict') {
    throw new Error(
      `[module-loader] STRICT mode: module '${name}' at '${modulePath}' failed to load: ${message}`,
    );
  }
}

/**
 * Dynamically load the full CommonJS export surface of a module. Used by
 * host services that need to call a factory (e.g. createXxxRouter(deps)) or
 * consume multiple named exports rather than a single Router default.
 *
 * Records load outcome in the same diagnostics table as loadModuleRoute.
 */
export function loadModuleExports<T = any>(name: string, modulePath: string): T | Record<string, never> {
  try {
    // Runtime module path — dynamic require is intentional for the plugin-loader pattern.
    const mod = require(modulePath) as T;
    loadedModules.push({ name, path: modulePath, loaded: true });
    return mod;
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    loadedModules.push({ name, path: modulePath, loaded: false, error: message });
    logger.error({ module: name, path: modulePath, error: message }, 'Module exports load FAILED — empty object returned');
    maybeFailFast(name, modulePath, message);
    return {} as Record<string, never>;
  }
}

/**
 * Returns diagnostics about loaded/failed module routes.
 * Mount as GET /api/{service}/modules for ops visibility.
 */
export function getModuleLoadResults(): {
  total: number;
  loaded: number;
  failed: number;
  modules: ModuleLoadResult[];
} {
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
export function modulesDiagnosticRouter(): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(getModuleLoadResults());
  });
  return router;
}

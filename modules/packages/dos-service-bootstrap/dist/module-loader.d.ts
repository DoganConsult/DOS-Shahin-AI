import { Router } from 'express';
export interface ModuleLoadResult {
    name: string;
    path: string;
    loaded: boolean;
    error?: string;
}
/**
 * Safely load a module route file with error visibility.
 * Replaces the silent `try { require(...) } catch { Router() }` pattern.
 */
export declare function loadModuleRoute(name: string, modulePath: string): any;
/**
 * Dynamically load the full CommonJS export surface of a module. Used by
 * host services that need to call a factory (e.g. createXxxRouter(deps)) or
 * consume multiple named exports rather than a single Router default.
 *
 * Records load outcome in the same diagnostics table as loadModuleRoute.
 */
export declare function loadModuleExports<T = any>(name: string, modulePath: string): T | Record<string, never>;
/**
 * Returns diagnostics about loaded/failed module routes.
 * Mount as GET /api/{service}/modules for ops visibility.
 */
export declare function getModuleLoadResults(): {
    total: number;
    loaded: number;
    failed: number;
    modules: ModuleLoadResult[];
};
/**
 * Express route handler for the /modules diagnostic endpoint.
 */
export declare function modulesDiagnosticRouter(): Router;
//# sourceMappingURL=module-loader.d.ts.map
export type { ModuleRegistrationContract, ProductManifest } from '@dos/contracts';
export type { ModuleManifest } from '@dos/types';
export interface ModuleRegistry {
    register(manifest: import('@dos/types').ModuleManifest): void;
    getManifest(moduleCode: string): import('@dos/types').ModuleManifest | undefined;
    getAllManifests(): import('@dos/types').ModuleManifest[];
    isRegistered(moduleCode: string): boolean;
}
export declare function setModuleRegistry(registry: ModuleRegistry): void;
export declare function getModuleRegistry(): ModuleRegistry;
/**
 * Register a module with the platform.
 * Accepts either a ModuleManifest directly (most common) or a ModuleRegistrationContract with lifecycle hooks.
 */
export declare function registerModule(manifestOrContract: import('@dos/types').ModuleManifest | import('@dos/contracts').ModuleRegistrationContract): void;
/**
 * Get all registered module manifests.
 */
export declare function getAllManifests(): import('@dos/types').ModuleManifest[];
/**
 * Get a specific module manifest by its code.
 */
export declare function getModuleManifest(moduleCode: string): import('@dos/types').ModuleManifest | undefined;
/**
 * Check if a module is registered.
 */
export declare function isModuleRegistered(moduleCode: string): boolean;

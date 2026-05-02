export type { ModuleRegistrationContract, ProductManifest } from '@dos/contracts';
export type { ModuleManifest } from '@dos/types';

export interface ModuleRegistry {
  register(manifest: import('@dos/types').ModuleManifest): void;
  getManifest(moduleCode: string): import('@dos/types').ModuleManifest | undefined;
  getAllManifests(): import('@dos/types').ModuleManifest[];
  isRegistered(moduleCode: string): boolean;
}

const GLOBAL_REGISTRY_KEY = Symbol.for('__dos_sdk_module_registry__');

export function setModuleRegistry(registry: ModuleRegistry): void {
  (globalThis as any)[GLOBAL_REGISTRY_KEY] = registry;
}

export function getModuleRegistry(): ModuleRegistry {
  const reg = (globalThis as any)[GLOBAL_REGISTRY_KEY] as ModuleRegistry | undefined;
  if (!reg) {
    throw new Error('[DOS-SDK] ModuleRegistry not initialized. Call setModuleRegistry() during platform startup.');
  }
  return reg;
}

/**
 * Register a module with the platform.
 * Accepts either a ModuleManifest directly (most common) or a ModuleRegistrationContract with lifecycle hooks.
 */
export function registerModule(
  manifestOrContract: import('@dos/types').ModuleManifest | import('@dos/contracts').ModuleRegistrationContract,
): void {
  // If it's a contract with a nested manifest, extract it
  const manifest = 'manifest' in manifestOrContract 
    ? manifestOrContract.manifest 
    : manifestOrContract;
  getModuleRegistry().register(manifest);
}

/**
 * Get all registered module manifests.
 */
export function getAllManifests(): import('@dos/types').ModuleManifest[] {
  return getModuleRegistry().getAllManifests();
}

/**
 * Get a specific module manifest by its code.
 */
export function getModuleManifest(moduleCode: string): import('@dos/types').ModuleManifest | undefined {
  return getModuleRegistry().getManifest(moduleCode);
}

/**
 * Check if a module is registered.
 */
export function isModuleRegistered(moduleCode: string): boolean {
  return getModuleRegistry().isRegistered(moduleCode);
}

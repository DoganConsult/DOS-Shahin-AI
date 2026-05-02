"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setModuleRegistry = setModuleRegistry;
exports.getModuleRegistry = getModuleRegistry;
exports.registerModule = registerModule;
exports.getAllManifests = getAllManifests;
exports.getModuleManifest = getModuleManifest;
exports.isModuleRegistered = isModuleRegistered;
const GLOBAL_REGISTRY_KEY = Symbol.for('__dos_sdk_module_registry__');
function setModuleRegistry(registry) {
    globalThis[GLOBAL_REGISTRY_KEY] = registry;
}
function getModuleRegistry() {
    const reg = globalThis[GLOBAL_REGISTRY_KEY];
    if (!reg) {
        throw new Error('[DOS-SDK] ModuleRegistry not initialized. Call setModuleRegistry() during platform startup.');
    }
    return reg;
}
/**
 * Register a module with the platform.
 * Accepts either a ModuleManifest directly (most common) or a ModuleRegistrationContract with lifecycle hooks.
 */
function registerModule(manifestOrContract) {
    // If it's a contract with a nested manifest, extract it
    const manifest = 'manifest' in manifestOrContract
        ? manifestOrContract.manifest
        : manifestOrContract;
    getModuleRegistry().register(manifest);
}
/**
 * Get all registered module manifests.
 */
function getAllManifests() {
    return getModuleRegistry().getAllManifests();
}
/**
 * Get a specific module manifest by its code.
 */
function getModuleManifest(moduleCode) {
    return getModuleRegistry().getManifest(moduleCode);
}
/**
 * Check if a module is registered.
 */
function isModuleRegistered(moduleCode) {
    return getModuleRegistry().isRegistered(moduleCode);
}
//# sourceMappingURL=manifest.js.map
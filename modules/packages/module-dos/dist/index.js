"use strict";
/**
 * @dos/module-dos — module-facing orchestrator surface.
 *
 * Modules call getTenant / publishEvent / subscribeEvent / registerModule /
 * isModuleRegistered / listProducts through this shim. The product shell
 * binds the actual DOSPort at bootstrap.
 *
 * Enforced by `modules-cannot-import-dos-direct` in .dependency-cruiser.cjs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindModuleDOS = bindModuleDOS;
exports.resetModuleDOS = resetModuleDOS;
exports.getTenant = getTenant;
exports.publishPlatformEvent = publishPlatformEvent;
exports.subscribePlatformEvent = subscribePlatformEvent;
exports.registerPlatformModule = registerPlatformModule;
exports.isPlatformModuleRegistered = isPlatformModuleRegistered;
exports.listPlatformProducts = listPlatformProducts;
let bound = null;
function bindModuleDOS(port) {
    bound = port;
}
function resetModuleDOS() {
    bound = null;
}
function requirePort() {
    if (!bound) {
        throw new Error('[@dos/module-dos] not bound. Product shell must call bindModuleDOS(port) during bootstrap before any module uses the orchestrator.');
    }
    return bound;
}
async function getTenant(tenantId) {
    return requirePort().getTenant(tenantId);
}
async function publishPlatformEvent(event) {
    await requirePort().publishEvent(event);
}
function subscribePlatformEvent(eventType, subscriberId, handler) {
    requirePort().subscribeEvent(eventType, subscriberId, handler);
}
function registerPlatformModule(descriptor) {
    requirePort().registerModule(descriptor);
}
function isPlatformModuleRegistered(moduleCode) {
    return requirePort().isModuleRegistered(moduleCode);
}
async function listPlatformProducts() {
    return requirePort().listProducts();
}
//# sourceMappingURL=index.js.map
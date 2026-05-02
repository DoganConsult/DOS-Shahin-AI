"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLifecycleRegistry = setLifecycleRegistry;
exports.getLifecycleRegistry = getLifecycleRegistry;
exports.registerLifecycleDefinition = registerLifecycleDefinition;
let _registry = null;
function setLifecycleRegistry(registry) {
    _registry = registry;
}
function getLifecycleRegistry() {
    if (!_registry) {
        throw new Error('[DOS-SDK] LifecycleRegistry not initialized. Call setLifecycleRegistry() during platform startup.');
    }
    return _registry;
}
function registerLifecycleDefinition(definition) {
    getLifecycleRegistry().register(definition);
}
//# sourceMappingURL=lifecycle.js.map
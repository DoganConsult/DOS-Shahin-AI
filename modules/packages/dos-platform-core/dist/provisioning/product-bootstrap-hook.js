"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProductBootstrapHook = registerProductBootstrapHook;
exports.getProductBootstrapHook = getProductBootstrapHook;
exports.listProductBootstrapHooks = listProductBootstrapHooks;
const _hooks = new Map();
function registerProductBootstrapHook(hook) {
    _hooks.set(hook.productKey, hook);
}
function getProductBootstrapHook(productKey) {
    return _hooks.get(productKey);
}
function listProductBootstrapHooks() {
    return [..._hooks.values()];
}
//# sourceMappingURL=product-bootstrap-hook.js.map
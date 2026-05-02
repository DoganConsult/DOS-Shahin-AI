"use strict";
// ─── Product-level contracts ────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProduct = registerProduct;
exports.getProduct = getProduct;
exports.getAllProducts = getAllProducts;
// ─── Product registry ───────────────────────────────────────────────────────
const _productRegistry = new Map();
function registerProduct(definition) {
    _productRegistry.set(definition.code, definition);
}
function getProduct(code) {
    return _productRegistry.get(code);
}
function getAllProducts() {
    return [..._productRegistry.values()];
}
//# sourceMappingURL=index.js.map
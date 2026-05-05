"use strict";
/**
 * UI Capability Registry — Dynamic binding
 * ------------------------------------------
 *
 * NO hardcoded entries. The capability registry is populated at bootstrap
 * from the DB (dos.dynamic_ui_component_registry + dos.ui_capability_registry)
 * via the workspace-runtime resolver or /api/ui-os/capabilities endpoint.
 *
 * Migration from static:
 *   - Old: UI_CAPABILITY_REGISTRY = Object.freeze([28 hardcoded entries])
 *   - New: mutable Map populated from resolver at bootstrap
 *
 * Architecture (governed flow):
 *   Module Publisher → DB → Resolver → Bootstrap → registerCapabilities()
 *   → isAllowedComponentKey() / getUiCapability() at render time
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UI_CAPABILITY_REGISTRY = void 0;
exports.registerCapabilities = registerCapabilities;
exports.registerCapability = registerCapability;
exports.getUiCapability = getUiCapability;
exports.isRegisteredComponentKey = isRegisteredComponentKey;
exports.isAllowedComponentKey = isAllowedComponentKey;
exports.listDomainCapabilities = listDomainCapabilities;
exports.listCoreCapabilities = listCoreCapabilities;
exports.listAllCapabilities = listAllCapabilities;
const component_keys_js_1 = require("./component-keys.js");
// ── Runtime registry (populated from DB at bootstrap) ─────────────────────
const _registry = new Map();
/**
 * Populate the capability registry from the resolver bootstrap response.
 * Called once at app init by the bootstrap service.
 * Also syncs to the component-keys approved set.
 */
function registerCapabilities(entries) {
    _registry.clear();
    for (const entry of entries) {
        _registry.set(entry.componentKey, entry);
        (0, component_keys_js_1.registerComponentKey)(entry.componentKey);
    }
}
/**
 * Register a single capability at runtime (e.g. lazy-loaded module
 * registering a domain widget after bootstrap).
 */
function registerCapability(entry) {
    _registry.set(entry.componentKey, entry);
    (0, component_keys_js_1.registerComponentKey)(entry.componentKey);
}
// ── Query functions (API unchanged) ───────────────────────────────────────
function getUiCapability(componentKey) {
    return _registry.get(componentKey);
}
function isRegisteredComponentKey(componentKey) {
    return _registry.has(componentKey);
}
/**
 * Combined allowlist gate: a key is renderable iff it appears in either
 * the component-keys approved set OR the capability registry.
 * Both are populated from DB at bootstrap — zero hardcoded keys.
 */
function isAllowedComponentKey(componentKey) {
    if (_registry.has(componentKey))
        return true;
    return (0, component_keys_js_1.isApprovedComponentKey)(componentKey);
}
function listDomainCapabilities() {
    return Array.from(_registry.values()).filter(e => e.category === 'domain');
}
function listCoreCapabilities() {
    return Array.from(_registry.values()).filter(e => e.category === 'core' || e.category === 'layout');
}
function listAllCapabilities() {
    return Array.from(_registry.values());
}
/**
 * @deprecated Static array removed. Use listAllCapabilities() instead.
 */
exports.UI_CAPABILITY_REGISTRY = [];
//# sourceMappingURL=capability-registry.js.map
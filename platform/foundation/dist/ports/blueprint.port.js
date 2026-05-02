"use strict";
/**
 * Blueprint port — outbound interface for tenant blueprint / packs adapter.
 * The Foundation module is standalone; the host wires a real implementation
 * (e.g. from the packs module) and injects it. The default stubs are inert
 * no-ops so the module can build and run in isolation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPolicyDecision = exports.getBundleItems = exports.getTenantBlueprint = void 0;
exports.bindBlueprintPort = bindBlueprintPort;
let _getTenantBlueprint = async () => null;
let _getBundleItems = async () => [];
let _logPolicyDecision = async () => { };
function bindBlueprintPort(impl) {
    if (impl.getTenantBlueprint)
        _getTenantBlueprint = impl.getTenantBlueprint;
    if (impl.getBundleItems)
        _getBundleItems = impl.getBundleItems;
    if (impl.logPolicyDecision)
        _logPolicyDecision = impl.logPolicyDecision;
}
const getTenantBlueprint = (id) => _getTenantBlueprint(id);
exports.getTenantBlueprint = getTenantBlueprint;
const getBundleItems = (tenantId, code) => _getBundleItems(tenantId, code);
exports.getBundleItems = getBundleItems;
const logPolicyDecision = (tenantId, payload) => _logPolicyDecision(tenantId, payload);
exports.logPolicyDecision = logPolicyDecision;
//# sourceMappingURL=blueprint.port.js.map
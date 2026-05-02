"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbacAdapters = getAbacAdapters;
exports.resetAbacFactory = resetAbacFactory;
/**
 * ABAC adapter factory. Same shape as the token-verifier / identity factory:
 * returns `{ primary, shadow }`. Shadow adapter runs in parallel and its
 * verdict is attached to the decision ledger under `engineResults.<name>`,
 * never overriding the primary.
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
const native_abac_adapter_1 = require("./native/native-abac.adapter");
const cerbos_adapter_1 = require("./cerbos/cerbos.adapter");
let cached = null;
function getAbacAdapters() {
    if (cached)
        return cached;
    const native = new native_abac_adapter_1.NativeAbacAdapter();
    let cerbos = null;
    if (dauth_config_1.DAUTH_CONFIG.cerbos.shadow || dauth_config_1.DAUTH_CONFIG.cerbos.enforce) {
        try {
            cerbos = new cerbos_adapter_1.CerbosAbacAdapter();
        }
        catch (err) {
            observability_1.logger.error('[DAuth:ABAC] Cerbos adapter unavailable — falling back to native', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (dauth_config_1.DAUTH_CONFIG.cerbos.enforce && cerbos) {
        cached = {
            primary: cerbos,
            shadow: dauth_config_1.DAUTH_CONFIG.cerbos.shadow ? native : undefined,
        };
    }
    else if (dauth_config_1.DAUTH_CONFIG.cerbos.shadow && cerbos) {
        cached = { primary: native, shadow: cerbos };
    }
    else {
        cached = { primary: native };
    }
    return cached;
}
/** Reset factory cache — for tests and hot config reloads. */
function resetAbacFactory() {
    cached = null;
}
//# sourceMappingURL=abac.factory.js.map
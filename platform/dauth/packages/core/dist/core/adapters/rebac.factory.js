"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRebacAdapters = getRebacAdapters;
exports.resetRebacFactory = resetRebacFactory;
/**
 * ReBAC adapter factory — same shape as ABAC factory.
 * Primary + optional shadow. Defaults to native only.
 */
const observability_1 = require("@dos/platform-core/observability");
const dauth_config_1 = require("../dauth.config");
const native_rebac_adapter_1 = require("./native/native-rebac.adapter");
const openfga_adapter_1 = require("./openfga/openfga.adapter");
let cached = null;
function getRebacAdapters() {
    if (cached)
        return cached;
    const native = new native_rebac_adapter_1.NativeRebacAdapter();
    let openfga = null;
    if (dauth_config_1.DAUTH_CONFIG.openfga.shadow || dauth_config_1.DAUTH_CONFIG.openfga.enforce) {
        try {
            openfga = new openfga_adapter_1.OpenFgaRebacAdapter();
        }
        catch (err) {
            observability_1.logger.error('[DAuth:ReBAC] OpenFGA adapter unavailable — falling back to native', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (dauth_config_1.DAUTH_CONFIG.openfga.enforce && openfga) {
        cached = { primary: openfga, shadow: dauth_config_1.DAUTH_CONFIG.openfga.shadow ? native : undefined };
    }
    else if (dauth_config_1.DAUTH_CONFIG.openfga.shadow && openfga) {
        cached = { primary: native, shadow: openfga };
    }
    else {
        cached = { primary: native };
    }
    return cached;
}
function resetRebacFactory() {
    cached = null;
}
//# sourceMappingURL=rebac.factory.js.map
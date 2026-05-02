"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initRebacFactory = initRebacFactory;
exports.getRebacAdapter = getRebacAdapter;
exports.resetRebacFactory = resetRebacFactory;
const native_rebac_adapter_1 = require("./adapters/native-rebac.adapter");
const openfga_rebac_adapter_1 = require("./adapters/openfga-rebac.adapter");
const state = { native: null, openfga: null, cached: null };
function initRebacFactory(opts = {}) {
    state.native = new native_rebac_adapter_1.NativeRebacAdapter();
    if (opts.openfga) {
        try {
            state.openfga = new openfga_rebac_adapter_1.OpenFgaRebacAdapter(opts.openfga);
        }
        catch (err) {
            state.openfga = null;
            if (opts.onMissingConfig) {
                opts.onMissingConfig(`OpenFGA adapter construction failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }
    else {
        state.openfga = null;
    }
    state.cached = null;
}
function getRebacAdapter() {
    if (state.cached)
        return state.cached;
    if (!state.native) {
        throw new Error('[@dos/auth] initRebacFactory() must be called before getRebacAdapter(). ' +
            'Wire it at bootstrap.');
    }
    const shadow = readBool('DAUTH_OPENFGA_SHADOW');
    const enforce = readBool('DAUTH_OPENFGA_ENFORCE');
    if (enforce && state.openfga) {
        state.cached = { primary: state.openfga, shadow: shadow ? state.native : undefined };
    }
    else if (shadow && state.openfga) {
        state.cached = { primary: state.native, shadow: state.openfga };
    }
    else {
        state.cached = { primary: state.native };
    }
    return state.cached;
}
function resetRebacFactory() {
    state.native = null;
    state.openfga = null;
    state.cached = null;
}
function readBool(key) {
    const v = process.env[key];
    if (!v)
        return false;
    return v === '1' || v.toLowerCase() === 'true';
}
//# sourceMappingURL=rebac-factory.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeRebacAdapter = void 0;
class NativeRebacAdapter {
    name = 'native';
    // Accepts the request signature to keep the interface contract — does not
    // inspect it. The input is documented for readers but deliberately ignored
    // here to keep the pass-through semantics explicit.
    async check(_request) {
        return {
            allowed: true,
            source: 'native',
            trace: 'native-passthrough (OpenFGA enforce disabled)',
        };
    }
    async currentModelVersion() {
        return null;
    }
}
exports.NativeRebacAdapter = NativeRebacAdapter;
//# sourceMappingURL=native-rebac.adapter.js.map
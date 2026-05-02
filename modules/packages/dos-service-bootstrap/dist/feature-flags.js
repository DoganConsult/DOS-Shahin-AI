"use strict";
// OpenFeature client wired to the native flagd daemon at 127.0.0.1:8013.
// Configure once at boot, query anywhere via getFlag()/getFlagBool().
//
// Configure via env:
//   FLAGD_HOST              — defaults to 127.0.0.1
//   FLAGD_PORT              — defaults to 8013 (gRPC eval)
//   FLAGD_DISABLED=1        — bypass flagd, every getFlag returns the default
//
// flagd config + initial flag set lives at /etc/flagd/flags.json (see
// ops/bootstrap/install-prod-grade.sh).
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlagString = exports.getFlagBool = void 0;
exports.initFeatureFlags = initFeatureFlags;
exports.getClient = getClient;
exports.getFlag = getFlag;
const server_sdk_1 = require("@openfeature/server-sdk");
const flagd_provider_1 = require("@openfeature/flagd-provider");
let _client = null;
let _initPromise = null;
async function initFeatureFlags(serviceCode) {
    if (_client)
        return _client;
    if (process.env.FLAGD_DISABLED === '1')
        return null;
    if (_initPromise)
        return _initPromise;
    _initPromise = (async () => {
        try {
            const provider = new flagd_provider_1.FlagdProvider({
                host: process.env.FLAGD_HOST ?? '127.0.0.1',
                port: parseInt(process.env.FLAGD_PORT ?? '8013', 10),
                tls: false,
            });
            await server_sdk_1.OpenFeature.setProviderAndWait(provider);
            _client = server_sdk_1.OpenFeature.getClient(serviceCode);
            return _client;
        }
        catch {
            // flagd unreachable — fall back to defaults so the service still boots.
            _client = null;
            return null;
        }
    })();
    return _initPromise;
}
function getClient() {
    return _client;
}
async function getFlag(key, defaultValue, ctx) {
    if (!_client)
        return defaultValue;
    const c = ctx ?? {};
    if (typeof defaultValue === 'boolean') {
        return (await _client.getBooleanValue(key, defaultValue, c));
    }
    if (typeof defaultValue === 'string') {
        return (await _client.getStringValue(key, defaultValue, c));
    }
    if (typeof defaultValue === 'number') {
        return (await _client.getNumberValue(key, defaultValue, c));
    }
    return (await _client.getObjectValue(key, defaultValue, c));
}
const getFlagBool = (key, def = false, ctx) => getFlag(key, def, ctx);
exports.getFlagBool = getFlagBool;
const getFlagString = (key, def = '', ctx) => getFlag(key, def, ctx);
exports.getFlagString = getFlagString;
//# sourceMappingURL=feature-flags.js.map
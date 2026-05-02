"use strict";
/**
 * DAuth port registry.
 *
 * Holds the singleton `DAuthPort` instance built by the runtime service
 * (auth-service) at bootstrap. Other platform modules and products call
 * `getDAuthPort()` to obtain the typed surface and never reach into
 * DAuth's internals.
 *
 * `setDAuthPort()` is invoked exactly once on bootstrap. Tests can call
 * `resetDAuthPort()` between cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDAuthPort = getDAuthPort;
exports.tryGetDAuthPort = tryGetDAuthPort;
exports.setDAuthPort = setDAuthPort;
exports.resetDAuthPort = resetDAuthPort;
let current = null;
function getDAuthPort() {
    if (!current) {
        throw new Error('[DAuth] DAuthPort has not been instantiated. Call setDAuthPort() ' +
            'in the auth-service bootstrap before consumers query the port.');
    }
    return current;
}
/** Returns null if the port has not been bound — for callers that want to opt-in to a default fallback. */
function tryGetDAuthPort() {
    return current;
}
function setDAuthPort(port) {
    current = port;
}
function resetDAuthPort() {
    current = null;
}
//# sourceMappingURL=dauth-port.registry.js.map
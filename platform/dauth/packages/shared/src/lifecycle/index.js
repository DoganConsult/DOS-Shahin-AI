"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLifecycleAuthPort = setLifecycleAuthPort;
exports.getLifecycleAuthPort = getLifecycleAuthPort;
exports.evaluateLifecycleTransition = evaluateLifecycleTransition;
let _lifecycleAuthPort = null;
function setLifecycleAuthPort(port) {
    _lifecycleAuthPort = port;
}
function getLifecycleAuthPort() {
    return _lifecycleAuthPort;
}
async function evaluateLifecycleTransition(tenantId, userId, input) {
    if (_lifecycleAuthPort) {
        return _lifecycleAuthPort.evaluateLifecycleTransition({
            tenantId,
            userId,
            ...input,
            userRoles: input.userRoles || [],
        });
    }
    return {
        allowed: true,
        reason: 'lifecycle-auth-port-not-configured',
        checks: [],
        evaluatedAt: new Date().toISOString(),
        permissionCode: input.permissionCode,
        approvalRequired: false,
    };
}
//# sourceMappingURL=index.js.map
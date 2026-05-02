// @ts-nocheck
import * as auth from '@dos/dauth-shared';
const authExports = auth;
function getAuthExport(name) {
    const candidate = authExports[name];
    if (typeof candidate !== 'function') {
        throw new Error(`@dos/auth is missing runtime export: ${name}`);
    }
    return candidate;
}
export const authenticate = auth.authenticate;
export const requirePermission = auth.requirePermission;
export const requireAnyPermission = auth.requireAnyPermission;
export const registerActor = (...args) => getAuthExport('registerActor')(...args);
export const createDelegationGrant = (...args) => getAuthExport('createDelegationGrant')(...args);
export const revokeDelegationGrant = (...args) => getAuthExport('revokeDelegationGrant')(...args);
export const validateDelegation = (...args) => getAuthExport('validateDelegation')(...args);
export const generateDelegatedToken = (...args) => getAuthExport('generateDelegatedToken')(...args);
export const requireExplicitGrant = (...args) => getAuthExport('requireExplicitGrant')(...args);
export const executeDelegatedAction = (...args) => getAuthExport('executeDelegatedAction')(...args);
export const recordDelegatedAction = (...args) => getAuthExport('recordDelegatedAction')(...args);
export const getActiveGrants = (...args) => getAuthExport('getActiveGrants')(...args);
export const getDelegationHistory = (...args) => getAuthExport('getDelegationHistory')(...args);
export const ACTION_TYPE_TO_SCOPE = (...args) => getAuthExport('ACTION_TYPE_TO_SCOPE')(...args);
//# sourceMappingURL=auth.port.js.map
// @ts-nocheck
import * as auth from '@dos/dauth-shared';

const authExports = auth as Record<string, unknown>;

function getAuthExport(name: string): (...args: any[]) => any {
	const candidate = authExports[name];
	if (typeof candidate !== 'function') {
		throw new Error(`@dos/auth is missing runtime export: ${name}`);
	}
	return candidate as (...args: any[]) => any;
}

export const authenticate = auth.authenticate;
export const requirePermission = auth.requirePermission;
export const requireAnyPermission = auth.requireAnyPermission;
export const registerActor = (...args: any[]) => getAuthExport('registerActor')(...args);
export const createDelegationGrant = (...args: any[]) => getAuthExport('createDelegationGrant')(...args);
export const revokeDelegationGrant = (...args: any[]) => getAuthExport('revokeDelegationGrant')(...args);
export const validateDelegation = (...args: any[]) => getAuthExport('validateDelegation')(...args);
export const generateDelegatedToken = (...args: any[]) => getAuthExport('generateDelegatedToken')(...args);
export const requireExplicitGrant = (...args: any[]) => getAuthExport('requireExplicitGrant')(...args);
export const executeDelegatedAction = (...args: any[]) => getAuthExport('executeDelegatedAction')(...args);
export const recordDelegatedAction = (...args: any[]) => getAuthExport('recordDelegatedAction')(...args);
export const getActiveGrants = (...args: any[]) => getAuthExport('getActiveGrants')(...args);
export const getDelegationHistory = (...args: any[]) => getAuthExport('getDelegationHistory')(...args);
export const ACTION_TYPE_TO_SCOPE = (...args: any[]) => getAuthExport('ACTION_TYPE_TO_SCOPE')(...args);

export type { DelegationScope, DelegationGrant, DelegationAction } from '@dos/dauth-shared';

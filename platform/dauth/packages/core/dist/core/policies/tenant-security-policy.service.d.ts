import type { SecurityPolicyConfig } from '../types/dauth.types';
export declare function getTenantSecurityPolicy(tenantId: string): Promise<SecurityPolicyConfig>;
export declare function updateTenantSecurityPolicy(tenantId: string, patch: Partial<SecurityPolicyConfig>, updatedBy: string): Promise<SecurityPolicyConfig>;
export declare function getSecurityPolicyDefaults(): Promise<SecurityPolicyConfig>;

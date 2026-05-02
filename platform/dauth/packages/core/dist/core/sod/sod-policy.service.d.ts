export interface SodPolicy {
    policyId: string;
    ruleCode: string;
    roleCodeA: string;
    roleCodeB: string;
    conflictLevel: 'critical' | 'high' | 'medium';
    enforcement: 'block' | 'warn' | 'log';
    moduleCode: string | null;
    description: string;
    isActive: boolean;
    temporaryWaiverAllowed: boolean;
    waiverMaxDays: number | null;
}
export declare function getSodPolicies(tenantId: string, moduleCode?: string): Promise<SodPolicy[]>;
export declare function createSodPolicy(tenantId: string, policy: Omit<SodPolicy, 'policyId' | 'isActive'>, createdBy: string): Promise<void>;
export declare function deactivateSodPolicy(tenantId: string, ruleCode: string, deactivatedBy: string): Promise<boolean>;
export declare function grantSodWaiver(tenantId: string, userId: string, ruleCode: string, durationDays: number, grantedBy: string, reason: string): Promise<boolean>;

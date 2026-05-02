export interface DecisionAuthority {
    authorityId: string;
    userId: string;
    authorityCode: string;
    moduleCode: string | null;
    scopeType: string | null;
    scopeId: string | null;
    isActive: boolean;
    validFrom: string;
    validTo: string | null;
}
export declare function getUserDecisionAuthorities(tenantId: string, userId: string): Promise<DecisionAuthority[]>;
export declare function grantDecisionAuthority(tenantId: string, userId: string, authorityCode: string, opts: {
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    validTo?: string;
    grantedBy: string;
}): Promise<void>;
export declare function revokeDecisionAuthority(tenantId: string, userId: string, authorityCode: string, revokedBy: string): Promise<boolean>;
export declare function hasDecisionAuthority(tenantId: string, userId: string, authorityCode: string, moduleCode?: string): Promise<boolean>;

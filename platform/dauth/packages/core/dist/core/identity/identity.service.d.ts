export type PrincipalType = 'human' | 'agent' | 'service_account' | 'external';
export interface PrincipalIdentity {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
    status: 'active' | 'inactive' | 'locked' | 'pending';
    principalType: PrincipalType;
    name?: string;
    language?: string;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
}
export declare function resolvePrincipalMinimal(userId: string): Promise<PrincipalIdentity | null>;
export declare function resolvePrincipalByEmail(email: string): Promise<PrincipalIdentity | null>;
export declare function validateTenantMembership(userId: string, tenantId: string): Promise<boolean>;
export declare function isPrincipalActive(userId: string): Promise<boolean>;
export declare function updateLastLogin(userId: string): Promise<void>;
export interface CreateIdentityInput {
    userId: string;
    email: string;
    passwordHash: string;
    name: string;
    tenantId: string | null;
    role: string;
    userType?: string;
    status?: string;
}
export declare function createIdentity(input: CreateIdentityInput, txClient?: {
    query: (sql: string, params: unknown[]) => Promise<{
        rows: any[];
    }>;
}): Promise<PrincipalIdentity>;

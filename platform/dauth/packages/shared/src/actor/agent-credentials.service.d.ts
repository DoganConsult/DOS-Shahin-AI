/**
 * DAuth — Agent / service-account credential store.
 *
 * Produces cryptographically-random shared secrets; persists only their
 * bcrypt hashes alongside the tenant + actor binding. Verify compares
 * supplied secrets against the stored hash in constant time. Credentials
 * can be rotated (soft-revoke + issue new) or permanently revoked.
 *
 * Law 1: canonical service per concern.
 * Tenant-scoped via withTenantClient; RLS isolates rows between tenants.
 */
export interface AgentCredentialMetadata {
    credentialId: string;
    actorId: string;
    scopes: string[];
    createdAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    lastUsedAt: string | null;
}
export interface IssuedCredential {
    credentialId: string;
    /** Returned ONCE at issue time; the plaintext secret is never stored. */
    secret: string;
    expiresAt: string | null;
}
export interface VerifyResult {
    valid: boolean;
    scopes: string[];
    credentialId?: string;
}
export declare function issueAgentCredential(tenantId: string, actorId: string, scopes?: string[], opts?: {
    ttlDays?: number;
    createdBy?: string;
}): Promise<IssuedCredential>;
export declare function verifyAgentCredential(tenantId: string, actorId: string, secret: string): Promise<VerifyResult>;
export declare function revokeAgentCredential(tenantId: string, credentialId: string): Promise<void>;
export declare function listAgentCredentials(tenantId: string, actorId: string): Promise<AgentCredentialMetadata[]>;
export declare function rotateAgentCredential(tenantId: string, actorId: string, credentialId: string, scopes?: string[], opts?: {
    ttlDays?: number;
    createdBy?: string;
}): Promise<IssuedCredential>;

export declare function revokeSession(userId: string, jti: string, reason: string, revokedBy: string): Promise<void>;
export declare function revokeAllUserSessions(userId: string, reason: string, revokedBy: string): Promise<{
    tokensRevoked: number;
    familiesRevoked: number;
}>;
export declare function revokeSessionsByTenant(tenantId: string, reason: string, revokedBy: string): Promise<number>;

export declare function requestPasswordReset(email: string, tenantId: string): Promise<{
    token: string;
    expiresAt: Date;
} | null>;
export declare function validateResetToken(token: string): Promise<{
    userId: string;
    tenantId: string;
} | null>;
export declare function completePasswordReset(token: string, newPasswordHash: string): Promise<boolean>;
export declare function requestEmailVerification(userId: string, _email: string, _tenantId: string): Promise<{
    token: string;
    expiresAt: Date;
}>;
export declare function verifyEmail(token: string): Promise<boolean>;

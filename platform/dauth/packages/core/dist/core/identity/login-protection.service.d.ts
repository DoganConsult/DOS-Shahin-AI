export declare function recordFailedAttempt(userId: string, tenantId: string, ip: string): Promise<{
    locked: boolean;
    attemptsRemaining: number;
}>;
export declare function recordSuccessfulLogin(userId: string, tenantId: string, ip: string): Promise<void>;
export declare function clearFailedAttempts(userId: string): Promise<void>;
export declare function lockAccount(userId: string, tenantId: string, durationMinutes: number): Promise<void>;
export declare function unlockAccount(userId: string): Promise<void>;
export declare function isAccountLocked(userId: string): Promise<boolean>;
export declare function getFailedAttemptCount(userId: string): Promise<number>;
export declare function recordFailedLogin(email: string, ip?: string): Promise<void>;
export declare function clearLoginFailures(email: string): Promise<void>;
export declare function recordSuccessfulLoginByEmail(email: string, ip?: string): Promise<void>;
export declare function checkLoginThrottle(email: string): Promise<{
    allowed: boolean;
    locked: boolean;
    requireCaptcha: boolean;
    retryAfterSeconds?: number;
    remainingAttempts: number;
}>;
export declare function isAccountLockedByEmail(email: string): Promise<boolean>;

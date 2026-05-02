export type MfaType = 'email' | 'totp';
export interface MfaStatus {
    enabled: boolean;
    mfaType: MfaType | null;
}
export interface MfaChallenge {
    challengeId: string;
    mfaType: MfaType;
    expiresAt: string;
}
export declare function getMfaStatus(userId: string): Promise<MfaStatus>;
export declare function isMfaRequired(userId: string): Promise<boolean>;
export declare function generateEmailCode(): string;
export declare function createEmailChallenge(userId: string, tenantId: string): Promise<{
    code: string;
    expiresAt: Date;
}>;
export declare function verifyEmailChallenge(userId: string, code: string): Promise<boolean>;
export declare function enableMfa(userId: string, mfaType: MfaType, secret?: string): Promise<void>;
export declare function disableMfa(userId: string): Promise<void>;
export declare function enableTotp(userId: string, _tenantId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
}>;
export declare function verifyTotp(userId: string, code: string, _tenantId?: string): Promise<boolean>;

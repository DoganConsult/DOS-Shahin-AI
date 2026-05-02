export interface ConsentRecord {
    userId: string;
    consentType: string;
    granted: boolean;
    grantedAt: string;
    expiresAt?: string;
}
export interface ConsentStatus extends ConsentRecord {
    consented: boolean;
    active: boolean;
}
export interface ConsentLogEntry extends ConsentRecord {
    tenantId: string;
    action: 'granted' | 'revoked' | 'forgotten';
    actorId?: string;
    purpose?: string;
    occurredAt: string;
}
export declare function getConsentStatus(tenantId: string, userId: string, consentType?: string): Promise<ConsentStatus>;
export declare function grantConsent(tenantId: string, userId: string, purpose: string, actorId?: string): Promise<boolean>;
export declare function revokeConsent(tenantId: string, userId: string, actorId?: string): Promise<boolean>;
export declare function rightToForget(tenantId: string, userId: string, actorId?: string): Promise<{
    forgotten: boolean;
    deletedConsents: number;
}>;
export declare function getConsentLog(tenantId: string, userId?: string): Promise<ConsentLogEntry[]>;
export declare function recordConsent(record: Omit<ConsentRecord, 'grantedAt'>): Promise<ConsentRecord>;
export declare function hasConsent(userId: string, consentType: string): Promise<boolean>;
export declare function getUserConsents(userId: string): Promise<ConsentRecord[]>;
export declare const pdplConsentService: {
    recordConsent: typeof recordConsent;
    hasConsent: typeof hasConsent;
    getUserConsents: typeof getUserConsents;
    getConsentStatus: typeof getConsentStatus;
    grantConsent: typeof grantConsent;
    revokeConsent: typeof revokeConsent;
    rightToForget: typeof rightToForget;
    getConsentLog: typeof getConsentLog;
};

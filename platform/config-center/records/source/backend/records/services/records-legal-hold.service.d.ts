export type HoldStatus = "active" | "released" | "expired";
export interface LegalHold {
    holdId: string;
    tenantId: string;
    title: string;
    description: string;
    legalMatter: string;
    status: HoldStatus;
    placedBy: string;
    reviewedBy: string | null;
    scope: {
        recordIds?: string[];
        recordTypes?: string[];
        classifications?: string[];
        dateRange?: {
            from?: string;
            to?: string;
        };
    };
    affectedRecordCount: number;
    placedAt: string;
    expiresAt: string | null;
    releasedAt: string | null;
    releaseReason: string | null;
}
export interface HoldNotification {
    notificationId: string;
    holdId: string;
    recipientId: string;
    notificationType: "placed" | "released" | "expiring" | "reminder";
    message: string;
    sentAt: string;
}
export declare function buildHoldScopeQuery(scope: LegalHold["scope"], startIdx: number): {
    conditions: string[];
    params: unknown[];
    nextIdx: number;
};
export declare function isHoldExpired(expiresAt: string | null): boolean;
export declare function buildHoldNotificationMessage(notificationType: HoldNotification["notificationType"], holdTitle: string, legalMatter: string): string;
export declare function placeHold(tenantId: string, data: {
    title: string;
    description?: string;
    legalMatter: string;
    placedBy: string;
    scope: LegalHold["scope"];
    expiresAt?: string;
}): Promise<LegalHold>;
export declare function releaseHold(tenantId: string, holdId: string, reviewedBy: string, reason: string): Promise<LegalHold>;
export declare function getActiveHolds(tenantId: string): Promise<LegalHold[]>;
export declare function sendHoldNotification(tenantId: string, holdId: string, recipientId: string, notificationType: HoldNotification["notificationType"]): Promise<HoldNotification>;
export declare function getHoldReport(tenantId: string): Promise<{
    totalActive: number;
    totalReleased: number;
    recordsUnderHold: number;
    holdsByMatter: {
        legalMatter: string;
        holdId: string;
        placedAt: string;
        affectedCount: number;
    }[];
}>;

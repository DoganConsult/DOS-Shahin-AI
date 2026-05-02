export interface NudgeRecord {
    nudgeId: string;
    tenantId: string;
    userId: string;
    title: string;
    body?: string;
    route?: string | null;
    createdAt: string;
}
export declare function getActiveNudges(tenantId: string, userId: string, currentRoute?: string): Promise<NudgeRecord[]>;
export declare function dismissNudge(tenantId: string, nudgeId: string): Promise<void>;

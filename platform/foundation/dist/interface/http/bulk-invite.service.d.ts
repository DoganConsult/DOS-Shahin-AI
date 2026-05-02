export interface BulkInviteRecord {
    email: string;
    role?: string;
    department_id?: string;
    display_name?: string;
}
export interface BulkInviteResultItem {
    email: string;
    status: 'invited' | 'skipped' | 'failed';
    error?: string;
}
export interface BulkInviteOutcome {
    batch_id: string;
    total: number;
    invited: number;
    skipped: number;
    failed: number;
    details: BulkInviteResultItem[];
}
export declare const BULK_INVITE_MAX = 500;
export declare function runBulkInvite(tenantId: string, invites: BulkInviteRecord[]): Promise<BulkInviteOutcome>;

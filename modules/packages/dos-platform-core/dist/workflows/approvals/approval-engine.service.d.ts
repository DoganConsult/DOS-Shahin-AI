export interface ApprovalChainStep {
    stepId: string;
    roleCode?: string;
    userId?: string;
    order: number;
    metadata?: Record<string, unknown>;
}
export interface ApprovalChainConfig {
    entityType: string;
    entityId: string;
    requestedBy: string;
    steps: ApprovalChainStep[];
    metadata?: Record<string, unknown>;
}
export interface ApprovalChainRecord extends ApprovalChainConfig {
    approvalChainId: string;
    tenantId: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
    createdAt: string;
}
export interface ApprovalRequestRecord {
    approvalId: string;
    tenantId: string;
    approvalChainId: string;
    stepId: string;
    status: 'pending' | 'approved' | 'rejected' | string;
    decidedBy?: string;
    decidedAt?: string;
    metadata?: Record<string, unknown>;
}
export interface ApprovalStepLog {
    approvalId: string;
    stepId: string;
    action: string;
    actorId: string;
    at: string;
    note?: string;
    metadata?: Record<string, unknown>;
}
export declare function createApprovalChain(tenantId: string, config: ApprovalChainConfig): Promise<ApprovalChainRecord>;
export declare function submitForApproval(_tenantId: string, _approvalChainId: string): Promise<void>;
export declare function approveStep(_tenantId: string, _approvalId: string, _actorId: string, _note?: string): Promise<void>;
export declare function rejectStep(_tenantId: string, _approvalId: string, _actorId: string, _note?: string): Promise<void>;
export declare function delegateApproval(_tenantId: string, _approvalId: string, _toUserId: string, _actorId: string): Promise<void>;
export declare function escalateApproval(_tenantId: string, _approvalId: string, _reason?: string): Promise<void>;
export declare function checkAndEscalateOverdue(_tenantId: string): Promise<number>;

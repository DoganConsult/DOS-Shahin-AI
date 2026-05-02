import type { ApprovalRequest } from '@dos/types';
/**
 * Initiate an approval request. Reads TenantConfig.approvalRouting,
 * resolves the approver chain (role-based → actual users), and creates
 * an approval_requests record.
 *
 * Requirements: 17.1, 17.2, 17.3
 */
export declare function initiateApproval(tenantId: string, input: {
    entityType: string;
    entityId: string;
    action: string;
    requestedBy: string;
    routeId: string;
    context?: Record<string, unknown>;
}): Promise<ApprovalRequest>;
/**
 * List approval requests for a tenant with optional filters.
 * Requirements: 17.5
 */
export declare function listApprovalRequests(tenantId: string, filters?: {
    status?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
}): Promise<ApprovalRequest[]>;
/**
 * Get pending approvals for a specific user.
 * Requirements: 17.5
 */
export declare function getPendingApprovals(tenantId: string, userId: string): Promise<ApprovalRequest[]>;
/**
 * Get approval request detail by ID.
 * Requirements: 17.5
 */
export declare function getApprovalDetail(tenantId: string, approvalId: string): Promise<ApprovalRequest>;
/**
 * Submit a decision (approve, reject, or delegate) for an approval request.
 * On approve: advances chain or completes. On reject: sets status rejected.
 * On delegate: reassigns current step.
 *
 * Requirements: 17.4, 17.6, 17.7
 */
export declare function submitDecision(tenantId: string, approvalId: string, decision: {
    approverId: string;
    decision: 'approved' | 'rejected' | 'delegated';
    reason?: string;
    delegateTo?: string;
}): Promise<void>;

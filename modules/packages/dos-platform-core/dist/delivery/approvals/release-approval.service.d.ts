export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export interface ReleaseApproval {
    approvalId: string;
    releaseId: string;
    approvalRole: string;
    requiredBy: string;
    approvedBy: string | null;
    status: ApprovalStatus;
    comments: string | null;
    requestedAt: string;
    resolvedAt: string | null;
}
export declare function requestApproval(input: {
    releaseId: string;
    approvalRole: string;
    requiredBy: string;
}): Promise<ReleaseApproval>;
export declare function approveRelease(approvalId: string, approvedBy: string, comments?: string): Promise<ReleaseApproval | null>;
export declare function rejectApproval(approvalId: string, rejectedBy: string, comments: string): Promise<ReleaseApproval | null>;
export declare function withdrawApproval(approvalId: string): Promise<void>;
export declare function getApproval(approvalId: string): Promise<ReleaseApproval | null>;
export declare function listApprovalsByRelease(releaseId: string): Promise<ReleaseApproval[]>;
export declare function listPendingApprovals(releaseId: string): Promise<ReleaseApproval[]>;
export declare function isFullyApproved(releaseId: string): Promise<boolean>;
export declare function hasRejection(releaseId: string): Promise<boolean>;

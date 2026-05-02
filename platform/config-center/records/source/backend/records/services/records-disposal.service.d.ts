export type DisposalMethod = "shredding" | "deletion" | "degaussing" | "incineration" | "transfer";
export type DisposalStatus = "pending_approval" | "approved" | "rejected" | "completed" | "cancelled";
export interface DisposalRequest {
    requestId: string;
    recordId: string;
    title: string;
    requestedBy: string;
    disposalMethod: DisposalMethod;
    justification: string;
    status: DisposalStatus;
    approvalChain: DisposalApproval[];
    certificateId: string | null;
    scheduledAt: string | null;
    completedAt: string | null;
    createdAt: string;
}
export interface DisposalApproval {
    approverId: string;
    decision: "approved" | "rejected";
    comments: string;
    decidedAt: string;
}
export interface DisposalCertificate {
    certificateId: string;
    requestId: string;
    recordId: string;
    recordTitle: string;
    disposalMethod: DisposalMethod;
    disposedBy: string;
    approvedBy: string[];
    disposedAt: string;
    witnessNote: string | null;
    issuedAt: string;
}
export declare function canRequestDisposal(status: string, legalHold: boolean): {
    allowed: boolean;
    reason?: string;
};
export declare function generateCertificateId(recordId: string, disposedAt: Date): string;
export declare function requestDisposal(tenantId: string, data: {
    recordId: string;
    requestedBy: string;
    disposalMethod: DisposalMethod;
    justification: string;
    scheduledAt?: string;
}): Promise<DisposalRequest>;
export declare function approveDisposal(tenantId: string, requestId: string, approverId: string, comments?: string): Promise<DisposalRequest>;
export declare function rejectDisposal(tenantId: string, requestId: string, approverId: string, reason: string): Promise<DisposalRequest>;
export declare function executeDisposal(tenantId: string, requestId: string, executedBy: string, witnessNote?: string): Promise<DisposalCertificate>;
export declare function batchDisposal(tenantId: string, recordIds: string[], requestedBy: string, disposalMethod: DisposalMethod): Promise<{
    requested: number;
    skipped: number;
}>;

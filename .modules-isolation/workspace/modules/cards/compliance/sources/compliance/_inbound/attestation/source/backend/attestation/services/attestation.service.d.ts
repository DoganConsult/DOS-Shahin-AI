import { AttestationCampaignContract, AttestationRecordContract, AttestationDiagnosticsContract } from '../contracts/attestation.contract';
export declare function createCampaign(tenantId: string, ownerId: string, data: {
    title: string;
    description?: string;
    campaignType?: string;
    dueDate?: string;
    scopeJson?: Record<string, unknown>;
    frequency?: string;
}): Promise<AttestationCampaignContract>;
export declare function transitionCampaign(tenantId: string, campaignId: string, targetStatus: string, userId: string): Promise<AttestationCampaignContract>;
export declare function listCampaigns(tenantId: string): Promise<AttestationCampaignContract[]>;
export declare function createRecord(tenantId: string, data: {
    campaignId: string;
    attestorUserId: string;
    entityType: string;
    entityId: string;
}): Promise<AttestationRecordContract>;
export declare function reviewRecord(tenantId: string, recordId: string, reviewerId: string, data: {
    reviewStatus: string;
    reviewComment?: string;
}): Promise<AttestationRecordContract>;
export declare function runDiagnostics(tenantId: string): Promise<AttestationDiagnosticsContract>;

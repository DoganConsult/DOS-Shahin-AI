export interface AttestationCampaignContract {
    campaignId: string;
    title: string;
    description: string | null;
    campaignType: string;
    status: string;
    ownerId: string;
    dueDate: string | null;
    scopeJson: Record<string, unknown>;
    frequency: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}
export interface AttestationRecordContract {
    recordId: string;
    campaignId: string;
    attestorUserId: string;
    entityType: string;
    entityId: string;
    attestationStatus: string;
    attestorComment: string | null;
    reviewerId: string | null;
    reviewComment: string | null;
    reviewStatus: string | null;
    signedAt: string | null;
    reviewedAt: string | null;
    createdAt: string;
}
export interface AttestationDiagnosticsContract {
    totalCampaigns: number;
    activeCampaigns: number;
    pendingRecords: number;
    overdueCampaigns: number;
    healthStatus: 'healthy' | 'degraded' | 'critical';
}

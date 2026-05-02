export interface PrivacyClearanceResult {
    cleared: boolean;
    reason: string;
    quarantined: boolean;
    dpiaId?: string;
    dataClassification?: string;
    riskScore?: number;
    ledgerId?: string;
}
export interface QuarantineLedgerRecord {
    ledger_id: string;
    entity_type: string;
    entity_id: string;
    quarantine_status: string;
    reason: string;
    dpia_id: string | null;
    quarantined_at: string;
    released_at: string | null;
    released_by: string | null;
    release_reason: string | null;
    fga_synced: boolean;
    metadata: Record<string, unknown>;
}
export interface PrivacyImpactScore {
    overall: number;
    dataVolume: number;
    sensitivityLevel: number;
    crossBorderRisk: number;
    retentionRisk: number;
    thirdPartyRisk: number;
    recommendation: 'low' | 'medium' | 'high' | 'critical';
}
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted' | 'pii' | 'phi' | 'pci';
export declare function enforcePrivacyByDesign(tenantId: string, entityType: 'asset' | 'vendor' | 'system' | 'process', entityId: string, containsPersonalData: boolean, dataClassification?: DataClassification): Promise<PrivacyClearanceResult>;
export declare function releaseFromQuarantine(tenantId: string, entityType: string, entityId: string, releasedBy: string, releaseReason: string, dpiaId?: string): Promise<QuarantineLedgerRecord | null>;
export declare function reQuarantine(tenantId: string, entityType: string, entityId: string, reason: string): Promise<QuarantineLedgerRecord | null>;
export declare function getQuarantineStatus(tenantId: string, entityType: string, entityId: string): Promise<QuarantineLedgerRecord | null>;
export declare function getQuarantineHistory(tenantId: string, entityType?: string, entityId?: string, limit?: number): Promise<QuarantineLedgerRecord[]>;
export declare function checkDataTransferCompliance(tenantId: string, sourceCountry: string, destinationCountry: string, dataClassification: DataClassification): Promise<{
    allowed: boolean;
    reason: string;
    requiresSCC: boolean;
    requiresDPIA: boolean;
}>;
export declare function computePrivacyImpactScore(params: {
    recordCount: number;
    dataClassification: DataClassification;
    crossBorderTransfer: boolean;
    retentionDays: number;
    thirdPartySharing: boolean;
    automatedDecisionMaking: boolean;
}): PrivacyImpactScore;
export declare function getPrivacyDashboardMetrics(tenantId: string): Promise<{
    totalQuarantined: number;
    totalReleased: number;
    activeDPIAs: number;
    expiredDPIAs: number;
    pendingDPIAs: number;
    quarantinesByType: Array<{
        entity_type: string;
        count: number;
    }>;
    recentActions: QuarantineLedgerRecord[];
}>;
export declare function checkFgaClearance(entityType: string, entityId: string): Promise<boolean>;

export declare function getVendorLinks(tenantId: string, assetId: string): Promise<any[]>;
export declare function createVendorLink(tenantId: string, userId: string, assetId: string, vendorId: string, linkType?: string, notes?: string, contractRef?: string): Promise<any>;
export declare function deleteVendorLink(tenantId: string, linkId: string): Promise<void>;
export declare function getEvidenceLinks(tenantId: string, assetId: string): Promise<any[]>;
export declare function createEvidenceLink(tenantId: string, userId: string, assetId: string, evidenceTaskId: string, linkType?: string, notes?: string): Promise<any>;
export declare function deleteEvidenceLink(tenantId: string, linkId: string): Promise<void>;
export declare function getControlLinks(tenantId: string, assetId: string): Promise<any[]>;
export declare function createControlLink(tenantId: string, userId: string, assetId: string, controlId: string, linkPurpose?: string, assetType?: string): Promise<any>;
export declare function getRiskLinks(tenantId: string, assetId: string): Promise<any[]>;
export declare function createRiskLink(tenantId: string, userId: string, assetId: string, riskId: string, linkType?: string, notes?: string): Promise<any>;
export declare function getAllLinksForAsset(tenantId: string, assetId: string): Promise<{
    vendors: any[];
    evidence: any[];
    controls: any[];
    risks: any[];
    summary: {
        vendorCount: number;
        evidenceCount: number;
        controlCount: number;
        riskCount: number;
        totalLinks: number;
    };
}>;

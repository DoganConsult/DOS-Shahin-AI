export interface ResolvedAuthority {
    code: string;
    name_en: string;
    name_ar: string;
    enforcement: string;
    priority: number;
    regulation_type: string;
    reason_en: string;
    reason_ar: string;
}
export interface ResolvedFramework {
    code: string;
    name: string;
    version: string;
    mandatory_for_sectors: string[];
    /** Optional: e.g. "Issued by NCA" for explainability in onboarding summary */
    reason_en?: string;
    reason_ar?: string;
}
export interface ResolvedRisk {
    risk_title_en: string;
    risk_title_ar: string;
    risk_category: string;
    sector_impact: string;
    sector_likelihood: string;
}
export interface RegulatoryResolution {
    sectorCode: string;
    sectorNameEn: string;
    sectorNameAr: string;
    authorities: ResolvedAuthority[];
    frameworks: ResolvedFramework[];
    controlCount: number;
    evidenceTaskCount: number;
    modules: string[];
    risks: ResolvedRisk[];
}
export declare function resolveRegulatoryProfile(sectorCode: string, tenantId?: string): Promise<RegulatoryResolution>;
/**
 * Resolve regulatory profile by sector_id (e.g. SEC-KSA-FIN-BANK).
 * Looks up the primary ISIC code via sector_isic_map, then delegates
 * to resolveRegulatoryProfile() which uses the ISIC-based chain.
 */
export declare function resolveRegulatoryProfileBySectorId(sectorId: string): Promise<RegulatoryResolution>;
/**
 * Resolve regulatory profile across multiple sectors (for conglomerates).
 * Merges authorities, frameworks, controls, and risks from all sectors
 * while deduplicating.
 */
export declare function resolveMultiSectorProfile(sectorCodes: string[], tenantId?: string): Promise<RegulatoryResolution>;
/**
 * Resolve regulatory profile for a tenant using its stored sector list.
 * Falls back to single-sector resolution if tenant_sectors is empty.
 */
export declare function resolveRegulatoryProfileForTenant(tenantId: string): Promise<RegulatoryResolution>;
export interface SearchResult {
    controlCode: string;
    controlTitle: string;
    frameworkCode: string;
    domainName: string;
    criticality: string;
    rank: number;
}
/**
 * Full-text search across all regulatory controls.
 * Uses PostgreSQL tsvector for fast, ranked search results.
 */
export declare function searchControls(searchQuery: string, limit?: number, frameworkFilter?: string): Promise<SearchResult[]>;

export interface OrgScope {
    userId: string;
    tenantId: string;
    primaryPosition: {
        position_id: string;
        title_en: string;
        title_ar: string | null;
        code: string | null;
        level: number | null;
    } | null;
    /** Ordered from leaf (user's BU) to root. */
    businessUnits: Array<{
        bu_id: string;
        name_en: string;
        code: string | null;
        depth: number;
    }>;
    /** Ordered from leaf (user's org) to root. */
    organizations: Array<{
        organization_id: string;
        name_en: string;
        code: string | null;
        org_type: string | null;
        depth: number;
    }>;
    /** All position ids the user holds (primary first). */
    allPositionIds: string[];
}
export declare function getOrgScope(tenantId: string, userId: string): Promise<OrgScope>;

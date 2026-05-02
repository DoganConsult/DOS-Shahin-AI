interface PersonInput {
    userId: string;
    fullName: string;
    businessFunction: string;
    [key: string]: any;
}
interface StaffingRecommendation {
    roleCode: string;
    roleNameEn: string;
    roleNameAr: string | null;
    roleCategory: string;
    recommendedFte: number;
    isMandatory: boolean;
    priority: number;
    shahinTitleEn: string | null;
    shahinTitleAr: string | null;
    descriptionEn: string | null;
    sortOrder: number;
}
interface BusinessFunction {
    functionCode: string;
    functionNameEn: string;
    functionNameAr: string | null;
    descriptionEn: string | null;
    descriptionAr: string | null;
    category: string;
    isCore: boolean;
    minOrgSize: string;
    typicalSizeMin: number | null;
    typicalSizeMax: number | null;
    isGrcCritical: boolean;
    requiredForSectors: string[];
    sortOrder: number;
}
interface ResponsibilitySuggestion {
    personId: string;
    fullName: string;
    suggestedRoles: Array<{
        roleCode: string;
        roleName: string;
        confidence: number;
        reason: string;
    }>;
}
interface AutoSuggestionResult {
    suggestions: ResponsibilitySuggestion[];
    staffingGaps: Array<{
        roleCode: string;
        roleName: string;
        isMandatory: boolean;
        status: 'unassigned' | 'understaffed';
    }>;
    status: 'complete' | 'partial';
}
export declare function computeAutoSuggestions(_tenantId: string, persons: PersonInput[], enabledModules: string[], employeeBand?: string, sectorCode?: string): Promise<AutoSuggestionResult>;
export declare function getStaffingForOrgSize(rangeCode: string, sectorCode: string): Promise<StaffingRecommendation[]>;
export declare function getBusinessFunctions(rangeCode?: string): Promise<BusinessFunction[]>;
export {};

export type CompanySize = 'small' | 'medium' | 'large' | 'enterprise';
export interface CompanyProfileInput {
    companyName?: string;
    industrySector?: string;
    country?: string;
    orgType?: string;
    employeeCount?: number;
    employeeBand?: string;
    metadata?: Record<string, unknown>;
}
export interface CompanyProfileRecord extends CompanyProfileInput {
    tenantId: string;
    updatedAt: string;
}
export type CompanyProfileValidation = {
    valid: boolean;
    errors: string[];
};
export declare function validateCompanyProfile(profile: CompanyProfileInput): CompanyProfileValidation;
export declare function classifyCompanySize(employeeCountOrBand: number | string | undefined): CompanySize;
export declare function createCompanyProfile(tenantId: string, profile: CompanyProfileInput): Promise<CompanyProfileRecord>;
export declare function getCompanyProfile(tenantId: string): Promise<CompanyProfileRecord | null>;
export declare function detectApplicableFrameworks(industrySector: string | undefined): Promise<string[]>;
export declare function recommendRolesForSize(employeeCount: number | undefined, frameworks?: string[]): string[];

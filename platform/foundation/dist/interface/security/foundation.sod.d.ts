export interface FoundationSodRule {
    ruleCode: string;
    severity: 'critical' | 'high' | 'medium';
    conflictingRoles: string[];
    conflictingActions: string[];
    descriptionEn: string;
    descriptionAr: string;
}
export declare const FOUNDATION_SOD_RULES: FoundationSodRule[];

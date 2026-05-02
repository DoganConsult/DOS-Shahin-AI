export interface ASSETSodRule {
    ruleCode: string;
    severity: 'critical' | 'high' | 'medium';
    conflictingRoles: string[];
    conflictingActions: string[];
    descriptionEn: string;
    descriptionAr: string;
}
export declare const ASSET_SOD_RULES: ASSETSodRule[];

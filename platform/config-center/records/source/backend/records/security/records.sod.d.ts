interface RECORDS_SodRule {
    ruleCode: string;
    severity: 'critical' | 'high' | 'medium';
    conflictingRoles: string[];
    conflictingActions: string[];
    descriptionEn: string;
    descriptionAr: string;
}
export declare const RECORDS_SOD_RULES: RECORDS_SodRule[];
export {};

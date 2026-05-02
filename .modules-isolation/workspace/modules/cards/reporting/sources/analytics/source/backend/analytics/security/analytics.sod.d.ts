interface ANALYTICS_SodRule {
    ruleCode: string;
    severity: 'critical' | 'high' | 'medium';
    conflictingRoles: string[];
    conflictingActions: string[];
    descriptionEn: string;
    descriptionAr: string;
}
export declare const ANALYTICS_SOD_RULES: ANALYTICS_SodRule[];
export {};

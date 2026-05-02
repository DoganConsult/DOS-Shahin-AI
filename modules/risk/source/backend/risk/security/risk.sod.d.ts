export interface RiskSodRule {
    ruleCode: string;
    severity: 'critical' | 'high' | 'medium';
    conflictingRoles: string[];
    conflictingActions: string[];
    descriptionEn: string;
    descriptionAr: string;
}
export declare const RISK_SOD_RULES: RiskSodRule[];

export interface ComplianceRule {
    id: string;
    name: string;
    priority?: number;
    conditions: unknown;
    event: {
        type: string;
        params?: Record<string, unknown>;
    };
}
export interface RuleResult {
    ruleId: string;
    ruleName: string;
    triggered: boolean;
    eventType: string;
    params: Record<string, unknown>;
}
export declare function evaluateComplianceRules(facts: Record<string, unknown>, rules: ComplianceRule[]): Promise<RuleResult[]>;

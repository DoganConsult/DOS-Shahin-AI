export interface SodRule {
    rule_id: string;
    tenant_id: string;
    role_a: string;
    role_b: string;
    severity: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}
export interface SodDecision {
    user_id: string;
    proposed_role: string;
    current_roles: string[];
    has_conflicts: boolean;
    conflicts: SodRule[];
    decision: 'ALLOWED' | 'BLOCKED';
}
export interface CreateSodRuleInput {
    role_a: string;
    role_b: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    status?: 'active' | 'inactive';
}
export declare function checkSod(tenantId: string, userId: string, proposedRole: string): Promise<SodDecision>;
export declare function listSodRules(tenantId: string): Promise<SodRule[]>;
export declare function createSodRule(tenantId: string, input: CreateSodRuleInput, _actorId: string): Promise<SodRule>;
export declare function deleteSodRule(tenantId: string, id: string): Promise<boolean>;

export type SodOutcome = 'block' | 'warn' | 'escalate' | 'allow';
export interface SodViolation {
    roleA: string;
    roleB: string;
    conflictLevel: string;
    moduleCode?: string;
    description?: string;
}
export interface ModuleSodViolation {
    actionA: string;
    actionB: string;
    conflictType: 'hard' | 'soft';
    resolutionStrategy: SodOutcome;
    moduleCode: string;
    description?: string;
}
export interface SodCheckResult {
    passed: boolean;
    outcome: SodOutcome;
    violations: SodViolation[];
    /** Module-level SoD violations (action-pair conflicts). */
    moduleViolations?: ModuleSodViolation[];
}
/** Input for module-defined SoD rules (from module manifests or DB). */
export interface ModuleSodDefinition {
    moduleCode: string;
    actionA: string;
    actionB: string;
    conflictType: 'hard' | 'soft';
    resolutionStrategy: SodOutcome;
    description?: string;
}
/**
 * Evaluate enterprise-level SoD rules for a set of role codes.
 * Returns blocking violations, warnings, and escalation triggers.
 */
export declare function evaluateSod(tenantId: string, roleCodes: string[], options?: {
    moduleCode?: string;
}): Promise<SodCheckResult>;
/**
 * Evaluate module-level SoD rules for a set of actions within a module.
 * Reads from the module_sod_rules table (migration 429) which defines
 * action-pair conflicts with hard/soft conflict types and resolution strategies.
 *
 * @param tenantId - Tenant identifier
 * @param moduleCode - Module to check (e.g. 'risk', 'compliance')
 * @param actionCodes - Actions the user is attempting (or holds permissions for)
 */
export declare function evaluateModuleSod(tenantId: string, moduleCode: string, actionCodes: string[]): Promise<SodCheckResult>;
/**
 * Evaluate SoD from externally provided module definitions (not from DB).
 * Useful when module manifests supply their own SoD rule sets at registration time.
 *
 * @param definitions - Array of module SoD definitions to evaluate against
 * @param actionCodes - Actions the user is attempting
 */
export declare function evaluateModuleSodFromDefinitions(definitions: ModuleSodDefinition[], actionCodes: string[]): SodCheckResult;
/**
 * Self-approval prevention — checks if requester and approver are the same user.
 */
export declare function preventSelfApproval(requestedBy: string, approverId: string): {
    allowed: boolean;
    reason?: string;
};

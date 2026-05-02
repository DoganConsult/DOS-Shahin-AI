"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSod = evaluateSod;
exports.evaluateModuleSod = evaluateModuleSod;
exports.evaluateModuleSodFromDefinitions = evaluateModuleSodFromDefinitions;
exports.preventSelfApproval = preventSelfApproval;
/**
 * DAuth SodEngine — canonical SoD runtime evaluation.
 * §10: DAuth owns runtime SoD evaluation.
 * §10.4: No duplicate SoD detector services, no UI-layer SoD decisions.
 *
 * Outcomes: block, warn, escalate, allow-with-audit-reason.
 *
 * Two evaluation layers:
 * 1. Enterprise SoD (sod_rules) — role-pair conflicts across the tenant.
 * 2. Module SoD (module_sod_rules) — action-pair conflicts within a module,
 *    resolved via resolution_strategy (block/warn/escalate/allow).
 */
const db_1 = require("@dos/db");
// ---------------------------------------------------------------------------
// Enterprise SoD evaluation (role-pair conflicts from sod_rules table)
// ---------------------------------------------------------------------------
/**
 * Evaluate enterprise-level SoD rules for a set of role codes.
 * Returns blocking violations, warnings, and escalation triggers.
 */
async function evaluateSod(tenantId, roleCodes, options) {
    if (roleCodes.length < 2) {
        return { passed: true, outcome: 'allow', violations: [] };
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    const moduleFilter = options?.moduleCode
        ? `AND (module_code IS NULL OR module_code = $2)`
        : '';
    const params = [roleCodes];
    if (options?.moduleCode)
        params.push(options.moduleCode);
    const result = await (0, db_1.safeQuery)(`SELECT role_code_a, role_code_b, conflict_level, module_code, description
     FROM "${schema}".sod_rules
     WHERE is_active = TRUE
     AND role_code_a = ANY($1) AND role_code_b = ANY($1)
     ${moduleFilter}
     ORDER BY conflict_level DESC`, params);
    const violations = result.rows.map((r) => ({
        roleA: r.role_code_a,
        roleB: r.role_code_b,
        conflictLevel: r.conflict_level,
        moduleCode: r.module_code,
        description: r.description,
    }));
    return resolveOutcome(violations);
}
// ---------------------------------------------------------------------------
// Module SoD evaluation (action-pair conflicts from module_sod_rules table)
// ---------------------------------------------------------------------------
/**
 * Evaluate module-level SoD rules for a set of actions within a module.
 * Reads from the module_sod_rules table (migration 429) which defines
 * action-pair conflicts with hard/soft conflict types and resolution strategies.
 *
 * @param tenantId - Tenant identifier
 * @param moduleCode - Module to check (e.g. 'risk', 'compliance')
 * @param actionCodes - Actions the user is attempting (or holds permissions for)
 */
async function evaluateModuleSod(tenantId, moduleCode, actionCodes) {
    if (actionCodes.length < 2) {
        return { passed: true, outcome: 'allow', violations: [], moduleViolations: [] };
    }
    const schema = (0, db_1.tenantSchema)(tenantId);
    const result = await (0, db_1.safeQuery)(`SELECT action_a, action_b, conflict_type, resolution_strategy,
            module_code, description_en
     FROM "${schema}".module_sod_rules
     WHERE active = TRUE
       AND module_code = $1
       AND action_a = ANY($2)
       AND action_b = ANY($2)
     ORDER BY conflict_type ASC`, [moduleCode, actionCodes]);
    const moduleViolations = result.rows.map((r) => ({
        actionA: r.action_a,
        actionB: r.action_b,
        conflictType: r.conflict_type,
        resolutionStrategy: r.resolution_strategy ?? (r.conflict_type === 'hard' ? 'block' : 'warn'),
        moduleCode: r.module_code,
        description: r.description_en,
    }));
    if (moduleViolations.length === 0) {
        return { passed: true, outcome: 'allow', violations: [], moduleViolations: [] };
    }
    // Map module violations to the standard outcome hierarchy
    const hasBlock = moduleViolations.some(v => v.resolutionStrategy === 'block');
    const hasEscalate = moduleViolations.some(v => v.resolutionStrategy === 'escalate');
    const hasWarn = moduleViolations.some(v => v.resolutionStrategy === 'warn');
    let outcome = 'allow';
    let passed = true;
    if (hasBlock) {
        outcome = 'block';
        passed = false;
    }
    else if (hasEscalate) {
        outcome = 'escalate';
        passed = false;
    }
    else if (hasWarn) {
        outcome = 'warn';
        passed = true;
    }
    return { passed, outcome, violations: [], moduleViolations };
}
/**
 * Evaluate SoD from externally provided module definitions (not from DB).
 * Useful when module manifests supply their own SoD rule sets at registration time.
 *
 * @param definitions - Array of module SoD definitions to evaluate against
 * @param actionCodes - Actions the user is attempting
 */
function evaluateModuleSodFromDefinitions(definitions, actionCodes) {
    if (actionCodes.length < 2 || definitions.length === 0) {
        return { passed: true, outcome: 'allow', violations: [], moduleViolations: [] };
    }
    const actionSet = new Set(actionCodes);
    const moduleViolations = definitions
        .filter(d => actionSet.has(d.actionA) && actionSet.has(d.actionB))
        .map(d => ({
        actionA: d.actionA,
        actionB: d.actionB,
        conflictType: d.conflictType,
        resolutionStrategy: d.resolutionStrategy,
        moduleCode: d.moduleCode,
        description: d.description,
    }));
    if (moduleViolations.length === 0) {
        return { passed: true, outcome: 'allow', violations: [], moduleViolations: [] };
    }
    const hasBlock = moduleViolations.some(v => v.resolutionStrategy === 'block');
    const hasEscalate = moduleViolations.some(v => v.resolutionStrategy === 'escalate');
    const hasWarn = moduleViolations.some(v => v.resolutionStrategy === 'warn');
    let outcome = 'allow';
    let passed = true;
    if (hasBlock) {
        outcome = 'block';
        passed = false;
    }
    else if (hasEscalate) {
        outcome = 'escalate';
        passed = false;
    }
    else if (hasWarn) {
        outcome = 'warn';
        passed = true;
    }
    return { passed, outcome, violations: [], moduleViolations };
}
// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
/** Resolve the highest-severity outcome from a set of enterprise violations. */
function resolveOutcome(violations) {
    if (violations.length === 0) {
        return { passed: true, outcome: 'allow', violations: [] };
    }
    const hasBlock = violations.some(v => v.conflictLevel === 'block');
    const hasEscalate = violations.some(v => v.conflictLevel === 'escalate');
    const hasWarn = violations.some(v => v.conflictLevel === 'warn');
    if (hasBlock)
        return { passed: false, outcome: 'block', violations };
    if (hasEscalate)
        return { passed: false, outcome: 'escalate', violations };
    if (hasWarn)
        return { passed: true, outcome: 'warn', violations };
    return { passed: true, outcome: 'allow', violations: [] };
}
/**
 * Self-approval prevention — checks if requester and approver are the same user.
 */
function preventSelfApproval(requestedBy, approverId) {
    if (requestedBy === approverId) {
        return { allowed: false, reason: 'Self-approval is not permitted (§9.1)' };
    }
    return { allowed: true };
}
//# sourceMappingURL=sod-engine.js.map
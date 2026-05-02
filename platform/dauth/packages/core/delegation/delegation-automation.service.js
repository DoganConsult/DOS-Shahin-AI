"use strict";
// ============================================
// DAuth — Delegation Automation Service
// Handles out-of-office auto-delegation, competency-based
// delegation validation, and delegation policy enforcement.
// Owner: DAuth (Law 2 — one canonical owner per concern)
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOooDelegations = processOooDelegations;
exports.delegateWithCompetencyCheck = delegateWithCompetencyCheck;
exports.enforceDelegationPolicy = enforceDelegationPolicy;
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const observability_1 = require("@dos/platform-core/observability");
// ── OOO Delegation Processing ──────────────────────────────────────
/**
 * Scans `user_availability` for users who are currently OOO and
 * activates/expires delegation chains based on `delegation_policies`.
 *
 * Called by the platform scheduler (cron).
 */
async function processOooDelegations(tenantId) {
    const ts = (0, db_1.tenantSchema)(tenantId);
    let activated = 0;
    let expired = 0;
    try {
        // ── Step 1: Expire delegations whose OOO period has ended ───
        const expireResult = await (0, db_1.safeQuery)(`UPDATE ${ts}.delegation_chains dc
       SET status = 'expired', updated_at = NOW()
       FROM ${ts}.user_availability ua
       WHERE dc.from_user_id = ua.user_id
         AND dc.delegation_type = 'ooo_auto'
         AND dc.status = 'active'
         AND ua.status != 'ooo'
         AND ua.available_from <= NOW()
       RETURNING dc.id`);
        expired = expireResult.rowCount ?? 0;
        // ── Step 2: Also expire delegations past their valid_until ──
        const expireStaleResult = await (0, db_1.safeQuery)(`UPDATE ${ts}.delegation_chains
       SET status = 'expired', updated_at = NOW()
       WHERE delegation_type = 'ooo_auto'
         AND status = 'active'
         AND valid_until IS NOT NULL
         AND valid_until < NOW()
       RETURNING id`);
        expired += expireStaleResult.rowCount ?? 0;
        // ── Step 3: Find OOO users who need auto-delegations ────────
        const oooUsers = await (0, db_1.safeQuery)(`SELECT ua.user_id, ua.ooo_until, ua.delegate_to_user_id
       FROM ${ts}.user_availability ua
       WHERE ua.status = 'ooo'
         AND ua.ooo_until > NOW()
         AND ua.delegate_to_user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM ${ts}.delegation_chains dc
           WHERE dc.from_user_id = ua.user_id
             AND dc.to_user_id = ua.delegate_to_user_id
             AND dc.delegation_type = 'ooo_auto'
             AND dc.status = 'active'
         )`);
        // ── Step 4: Activate auto-delegations per policy ────────────
        for (const row of oooUsers.rows) {
            const policies = await (0, db_1.safeQuery)(`SELECT dp.role_id, dp.scope_type, dp.scope_id, dp.max_duration_hours
         FROM ${ts}.delegation_policies dp
         WHERE dp.is_active = true
           AND dp.policy_type = 'ooo_auto'`);
            for (const policy of policies.rows) {
                const maxEnd = policy.max_duration_hours
                    ? new Date(Date.now() + policy.max_duration_hours * 3600_000)
                    : null;
                const validUntil = row.ooo_until;
                const effectiveEnd = maxEnd && maxEnd < validUntil ? maxEnd : validUntil;
                const hasRole = await (0, db_1.safeQuery)(`SELECT 1 FROM ${ts}.user_role_assignments
           WHERE user_id = $1 AND role_id = $2 AND is_active = true`, [row.delegate_to_user_id, policy.role_id]);
                if (hasRole.rows.length === 0)
                    continue;
                const delegationId = (0, uuid_1.v4)();
                await (0, db_1.safeQuery)(`INSERT INTO ${ts}.delegation_chains
             (id, from_user_id, to_user_id, role_id, scope_type, scope_id,
              delegation_type, status, valid_from, valid_until, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'ooo_auto', 'active', NOW(), $7, NOW(), NOW())`, [
                    delegationId,
                    row.user_id,
                    row.delegate_to_user_id,
                    policy.role_id,
                    policy.scope_type ?? 'tenant',
                    policy.scope_id ?? tenantId,
                    effectiveEnd,
                ]);
                activated++;
            }
        }
        // ── Step 5: Audit log ───────────────────────────────────────
        if (activated > 0 || expired > 0) {
            await (0, db_1.safeQuery)(`INSERT INTO ${ts}.authz_decision_log
           (id, tenant_id, user_id, action, allowed, reason, decided_at)
         VALUES ($1, $2, 'system', 'delegation.ooo_batch', true, $3, NOW())`, [(0, uuid_1.v4)(), tenantId, `OOO batch: activated=${activated}, expired=${expired}`]);
        }
        observability_1.logger.info('[DelegationAuto] OOO processing complete', { tenantId, activated, expired });
        return { activated, expired };
    }
    catch (err) {
        observability_1.logger.warn('[DelegationAuto] OOO processing partial failure', {
            tenantId, activated, expired, error: err.message,
        });
        return { activated, expired };
    }
}
// ── Competency-Based Delegation ────────────────────────────────────
/**
 * Creates a delegation from `delegatorUserId` to the best-qualified
 * candidate from `candidateUserIds`, validating that the chosen
 * delegate possesses all `requiredCompetencies`.
 *
 * Iterates candidates in order and selects the first one that
 * meets all competency requirements and passes SoD checks.
 *
 * @param tenantId - Tenant identifier
 * @param delegatorUserId - The user delegating authority
 * @param candidateUserIds - Ordered list of potential delegates
 * @param requiredCompetencies - Competency codes the delegate must hold
 * @param delegationType - Type of delegation (e.g. 'acting', 'ooo_auto')
 * @param validTo - Optional expiration date/string
 * @returns DelegationResult or null if no qualified candidate found
 */
async function delegateWithCompetencyCheck(tenantId, delegatorUserId, candidateUserIds, requiredCompetencies, delegationType = 'acting', validTo) {
    const ts = (0, db_1.tenantSchema)(tenantId);
    for (const candidateId of candidateUserIds) {
        if (candidateId === delegatorUserId)
            continue;
        try {
            // ── 1. Check required competencies ─────────────────────────
            const compResult = await (0, db_1.safeQuery)(`SELECT competency_code FROM ${ts}.user_competencies
         WHERE user_id = $1 AND competency_code = ANY($2) AND is_active = true`, [candidateId, requiredCompetencies]);
            const heldCodes = new Set(compResult.rows.map((r) => r.competency_code));
            const missingCodes = requiredCompetencies.filter(c => !heldCodes.has(c));
            if (missingCodes.length > 0)
                continue;
            // ── 2. Check SoD conflicts ────────────────────────────────
            const delegatorRoles = await (0, db_1.safeQuery)(`SELECT r.code FROM ${ts}.user_role_assignments ura
         JOIN ${ts}.roles r ON r.id = ura.role_id
         WHERE ura.user_id = $1 AND ura.is_active = true`, [delegatorUserId]);
            let hasSodConflict = false;
            for (const roleRow of delegatorRoles.rows) {
                const sodCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM ${ts}.sod_rules sr
           WHERE sr.role_code = $1 AND sr.is_active = true
             AND EXISTS (
               SELECT 1 FROM ${ts}.user_role_assignments ura
               JOIN ${ts}.roles r ON r.id = ura.role_id
               WHERE ura.user_id = $2 AND r.code = sr.conflicting_role_code AND ura.is_active = true
             )`, [roleRow.code, candidateId]);
                if (sodCheck.rows.length > 0) {
                    hasSodConflict = true;
                    break;
                }
            }
            if (hasSodConflict)
                continue;
            // ── 3. Check circular delegation ──────────────────────────
            const circularCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM ${ts}.delegation_chains
         WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'active'`, [candidateId, delegatorUserId]);
            if (circularCheck.rows.length > 0)
                continue;
            // ── 4. Create delegation ──────────────────────────────────
            const delegationId = (0, uuid_1.v4)();
            const validUntil = validTo ? new Date(validTo) : null;
            await (0, db_1.safeQuery)(`INSERT INTO ${ts}.delegation_chains
           (id, from_user_id, to_user_id, delegation_type, status,
            valid_from, valid_until, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'active', NOW(), $5, NOW(), NOW())`, [delegationId, delegatorUserId, candidateId, delegationType, validUntil]);
            // ── 5. Audit ─────────────────────────────────────────────
            await (0, db_1.safeQuery)(`INSERT INTO ${ts}.authz_decision_log
           (id, tenant_id, user_id, action, entity_type, entity_id, allowed, reason, delegated, decided_at)
         VALUES ($1, $2, $3, 'delegation.competency_create', 'delegation', $4, true, $5, true, NOW())`, [(0, uuid_1.v4)(), tenantId, delegatorUserId, delegationId,
                `Competency-checked delegation to ${candidateId} (type: ${delegationType})`]);
            observability_1.logger.info('[DelegationAuto] Competency delegation created', {
                tenantId, delegationId, from: delegatorUserId, to: candidateId,
            });
            return {
                delegationId,
                accepted: true,
                delegateeUserId: candidateId,
                reason: 'Delegation created — all competency and SoD checks passed',
            };
        }
        catch (err) {
            observability_1.logger.warn('[DelegationAuto] Candidate evaluation failed', {
                tenantId, candidateId, error: err.message,
            });
            continue;
        }
    }
    return null;
}
// ── Delegation Policy Enforcement ──────────────────────────────────
/**
 * Checks whether a delegation from a given delegator_role_code to a
 * delegate_actor_type within a scope_type is permitted by the tenant's
 * delegation_policies table.
 *
 * Evaluates: excluded_actions, allowed_actions, requires_competency,
 * max_duration_hours, and scope_type constraints.
 *
 * @param tenantId - Tenant identifier
 * @param delegatorRole - The delegator_role_code to check
 * @param delegateActorType - The delegate_actor_type (human, agent, etc.)
 * @param scopeType - The scope_type (tenant, department, etc.)
 * @param actions - List of actions being delegated
 * @returns DelegationPolicyCheck with allowed status and any violations
 */
async function enforceDelegationPolicy(tenantId, delegatorRole, delegateActorType, scopeType, actions = []) {
    const ts = (0, db_1.tenantSchema)(tenantId);
    const violations = [];
    try {
        // ── 1. Load matching delegation_policies ─────────────────────
        const policyResult = await (0, db_1.safeQuery)(`SELECT id, delegator_role_code, delegate_actor_type, scope_type,
              excluded_actions, allowed_actions, requires_competency,
              max_duration_hours
       FROM ${ts}.delegation_policies
       WHERE delegator_role_code = $1
         AND delegate_actor_type = $2
         AND scope_type = $3
         AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`, [delegatorRole, delegateActorType, scopeType]);
        if (policyResult.rows.length === 0) {
            // No specific policy found — deny by default (Law 11)
            return {
                allowed: false,
                violations: [`No delegation policy for role=${delegatorRole}, actorType=${delegateActorType}, scope=${scopeType}`],
            };
        }
        const policy = policyResult.rows[0];
        // ── 2. Check excluded_actions ────────────────────────────────
        const excludedActions = Array.isArray(policy.excluded_actions)
            ? policy.excluded_actions
            : (policy.excluded_actions ? JSON.parse(policy.excluded_actions) : []);
        if (excludedActions.length > 0 && actions.length > 0) {
            const blocked = actions.filter((a) => excludedActions.includes(a));
            if (blocked.length > 0) {
                violations.push(`Actions excluded by policy: ${blocked.join(', ')}`);
            }
        }
        // ── 3. Check allowed_actions allowlist ────────────────────────
        const allowedActions = Array.isArray(policy.allowed_actions)
            ? policy.allowed_actions
            : (policy.allowed_actions ? JSON.parse(policy.allowed_actions) : []);
        if (allowedActions.length > 0 && actions.length > 0) {
            const notAllowed = actions.filter((a) => !allowedActions.includes(a));
            if (notAllowed.length > 0) {
                violations.push(`Actions not in allowed list: ${notAllowed.join(', ')}`);
            }
        }
        // ── 4. Extract requires_competency flag ──────────────────────
        const requiresCompetency = policy.requires_competency === true;
        // ── 5. Extract max_duration_hours ────────────────────────────
        const maxDurationHours = policy.max_duration_hours
            ? Number(policy.max_duration_hours)
            : undefined;
        // ── 6. Build result ──────────────────────────────────────────
        const allowed = violations.length === 0;
        // ── 7. Audit log ─────────────────────────────────────────────
        await (0, db_1.safeQuery)(`INSERT INTO ${ts}.authz_decision_log
         (id, tenant_id, user_id, action, allowed, reason, decided_at)
       VALUES ($1, $2, 'system', 'delegation.policy_check', $3, $4, NOW())`, [(0, uuid_1.v4)(), tenantId, allowed,
            allowed
                ? `Policy check passed for role=${delegatorRole}, actor=${delegateActorType}, scope=${scopeType}`
                : `Policy violations: ${violations.join('; ')}`]);
        return {
            allowed,
            violations,
            policyId: policy.id,
            maxDurationHours,
            requiresCompetency,
            allowed_actions: allowedActions,
            excluded_actions: excludedActions,
        };
    }
    catch (err) {
        observability_1.logger.warn('[DelegationAuto] Policy enforcement error', {
            tenantId, delegatorRole, error: err.message,
        });
        return {
            allowed: false,
            violations: [`Policy enforcement error: ${err.message ?? 'unknown'}`],
        };
    }
}
//# sourceMappingURL=delegation-automation.service.js.map
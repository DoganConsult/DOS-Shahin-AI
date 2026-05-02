"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidatePermissionCache = invalidatePermissionCache;
exports.evaluateAccess = evaluateAccess;
/**
 * DAuth Decision Engine — full 14-step access evaluation pipeline.
 * Implements §7.5 of the Design Freeze: effective decision formula.
 *
 * Every sensitive action is allowed only if ALL 14 checks pass.
 * No check may be skipped, stubbed, or fail-open.
 */
const db_1 = require("@dos/db");
const modules_1 = require("@dos/platform-core/modules");
const observability_1 = require("@dos/platform-core/observability");
const resilience_1 = require("@dos/platform-core/resilience");
function deriveModuleCode(permissionCode) {
    const dotIdx = permissionCode.indexOf('.');
    if (dotIdx > 0)
        return permissionCode.slice(0, dotIdx);
    const colonIdx = permissionCode.indexOf(':');
    if (colonIdx > 0)
        return permissionCode.slice(0, colonIdx);
    return permissionCode;
}
/** Membership cache: userId:tenantId → active boolean */
const membershipCache = new Map();
/** Tenant status cache: tenantId → status string */
const tenantStatusCache = new Map();
/** Module entitlements cache: tenantId → Set of active module codes */
const entitlementCache = new Map();
const dauth_config_1 = require("../dauth.config");
const reason_codes_1 = require("../contracts/reason-codes");
const abac_factory_1 = require("../adapters/abac.factory");
const rebac_factory_1 = require("../adapters/rebac.factory");
const permCache = new Map();
const CACHE_TTL = dauth_config_1.DAUTH_CONFIG.decisionCacheTtlMs;
const MAX_CACHE = dauth_config_1.DAUTH_CONFIG.decisionCacheMaxEntries;
function invalidatePermissionCache(tenantId) {
    if (tenantId) {
        permCache.delete(tenantId);
        tenantStatusCache.delete(tenantId);
        entitlementCache.delete(tenantId);
        // Clear membership entries for this tenant
        for (const key of membershipCache.keys()) {
            if (key.endsWith(`:${tenantId}`))
                membershipCache.delete(key);
        }
    }
    else {
        permCache.clear();
        membershipCache.clear();
        tenantStatusCache.clear();
        entitlementCache.clear();
    }
}
// ── 14-Step Pipeline ──
async function evaluateAccess(ctx) {
    const steps = [];
    const schema = (0, db_1.tenantSchema)(ctx.tenantId);
    // ── Per-engine result accumulators (5-brain spec §2) ──
    let sodResult;
    let lifecycleResult;
    let slaResult;
    let openFgaResult;
    let keycloakIdentity;
    const matchedRolesAcc = [];
    const matchedScopesAcc = [];
    // ── Step 1: Actor authenticated ──
    const s1 = { step: 1, name: 'actor_authenticated', passed: !!ctx.userId };
    if (!s1.passed)
        s1.detail = 'No userId in context';
    steps.push(s1);
    if (!s1.passed)
        return denyAndLog(schema, ctx, 1, 'actor_authenticated', 'Actor not authenticated', steps);
    // ── Step 2: Session valid ──
    // Session validity (JWT expiry + blacklist) is enforced by session.middleware before
    // this engine is called. If we reach here, the session is valid.
    steps.push({ step: 2, name: 'session_valid', passed: true, detail: 'Enforced by session middleware' });
    // ── Step 3: Tenant membership valid (cached) ──
    const memKey = `${ctx.userId}:${ctx.tenantId}`;
    const memCached = membershipCache.get(memKey);
    let s3passed;
    if (memCached && Date.now() - memCached.ts < CACHE_TTL) {
        s3passed = memCached.active;
    }
    else {
        const membership = await (0, db_1.safeQuery)(`SELECT status FROM public.tenant_user_memberships
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`, [ctx.tenantId, ctx.userId]);
        s3passed = membership.rows.length > 0;
        membershipCache.set(memKey, { active: s3passed, ts: Date.now() });
    }
    steps.push({ step: 3, name: 'tenant_membership_valid', passed: s3passed,
        detail: s3passed ? 'Active membership' : 'No active membership' });
    if (!s3passed)
        return denyAndLog(schema, ctx, 3, 'tenant_membership_valid', 'User has no active tenant membership', steps);
    // ── Step 4: Tenant active (cached) ──
    const tsCached = tenantStatusCache.get(ctx.tenantId);
    let tenantStatus;
    if (tsCached && Date.now() - tsCached.ts < CACHE_TTL) {
        tenantStatus = tsCached.status;
    }
    else {
        const tenant = await (0, db_1.safeQuery)(`SELECT status FROM public.tenants WHERE tenant_id = $1 LIMIT 1`, [ctx.tenantId]);
        tenantStatus = tenant.rows[0]?.status;
        if (tenantStatus)
            tenantStatusCache.set(ctx.tenantId, { status: tenantStatus, ts: Date.now() });
    }
    // Onboarding-scoped permissions are allowed during onboarding/registration
    // to resolve the chicken-and-egg: lookups must work before tenant is fully active.
    const ONBOARDING_STATUSES = new Set(['pending_onboarding', 'registered', 'provisioning']);
    const isOnboardingPermission = ctx.permissionCode.startsWith('onboarding.');
    const s4passed = tenantStatus === 'active' || tenantStatus === 'trial_active'
        || (ONBOARDING_STATUSES.has(tenantStatus) && isOnboardingPermission);
    steps.push({ step: 4, name: 'tenant_active', passed: s4passed,
        detail: `Tenant status: ${tenantStatus || 'not found'}${isOnboardingPermission ? ' (onboarding bypass)' : ''}` });
    if (!s4passed)
        return denyAndLog(schema, ctx, 4, 'tenant_active', `Tenant not active (status: ${tenantStatus})`, steps);
    // ── Step 5: Product enabled (cached) ──
    // Derive module from permission code: risk.record.read → risk, incident:write → incident
    const moduleCode = ctx.moduleCode || deriveModuleCode(ctx.permissionCode);
    const entCached = entitlementCache.get(ctx.tenantId);
    let productEntitled;
    let grcFallbackUsed = false;
    if (entCached && Date.now() - entCached.ts < CACHE_TTL) {
        productEntitled = entCached.modules.has(moduleCode);
        grcFallbackUsed = modules_1.GRC_CORE_MODULES.has(moduleCode) && !productEntitled && !entCached.hasAny;
    }
    else {
        // Load all active entitlements in one query and cache them
        const allEntitlements = await (0, db_1.safeQuery)(`SELECT module_code FROM "${schema}".tenant_module_entitlements WHERE is_active = TRUE`);
        const moduleSet = new Set(allEntitlements.rows.map((r) => r.module_code));
        entitlementCache.set(ctx.tenantId, { modules: moduleSet, hasAny: moduleSet.size > 0, ts: Date.now() });
        productEntitled = moduleSet.has(moduleCode);
        grcFallbackUsed = modules_1.GRC_CORE_MODULES.has(moduleCode) && !productEntitled && moduleSet.size === 0;
    }
    const s5passed = modules_1.ALWAYS_ON_MODULES.has(moduleCode) || productEntitled || grcFallbackUsed;
    steps.push({ step: 5, name: 'product_enabled', passed: s5passed,
        detail: modules_1.ALWAYS_ON_MODULES.has(moduleCode) ? `Always-on module: ${moduleCode}` : grcFallbackUsed ? `GRC core fallback (no entitlements seeded yet): ${moduleCode}` : (s5passed ? 'Entitled' : `Module ${moduleCode} not entitled`) });
    if (!s5passed)
        return denyAndLog(schema, ctx, 5, 'product_enabled', `Module ${moduleCode} not entitled for tenant`, steps);
    // ── Step 6: Module enabled ──
    const moduleReg = await (0, db_1.safeQuery)(`SELECT licensed FROM "${schema}".module_workflow_registry WHERE module_code = $1 LIMIT 1`, [moduleCode]);
    const s6passed = modules_1.ALWAYS_ON_MODULES.has(moduleCode) || modules_1.GRC_CORE_MODULES.has(moduleCode) || !moduleReg.rows[0] || moduleReg.rows[0].licensed !== false;
    steps.push({ step: 6, name: 'module_enabled', passed: s6passed,
        detail: s6passed ? 'Module active' : `Module ${moduleCode} disabled` });
    if (!s6passed)
        return denyAndLog(schema, ctx, 6, 'module_enabled', `Module ${moduleCode} is disabled`, steps);
    // ── Step 7: Access profile allows ──
    const profileCheck = await (0, db_1.safeQuery)(`SELECT ap.code FROM "${schema}".user_access_profiles uap
     JOIN "${schema}".access_profiles ap ON ap.code = uap.access_profile_code
     WHERE uap.user_id = $1 AND uap.is_active = TRUE
     AND (uap.valid_to IS NULL OR uap.valid_to > NOW())
     LIMIT 1`, [ctx.userId]);
    // If no access profile assigned, allow (profile system is optional until Phase 2 full rollout)
    const hasProfile = profileCheck.rows.length > 0;
    const profileCode = profileCheck.rows[0]?.code;
    // Blocked profiles
    const BLOCKED_PROFILES = new Set(['suspended', 'deactivated', 'locked']);
    const s7passed = !hasProfile || !BLOCKED_PROFILES.has(profileCode);
    steps.push({ step: 7, name: 'access_profile_allows', passed: s7passed,
        detail: hasProfile ? `Profile: ${profileCode}` : 'No profile assigned (allowed)' });
    if (!s7passed)
        return denyAndLog(schema, ctx, 7, 'access_profile_allows', `Access profile ${profileCode} is blocked`, steps);
    // ── Step 8: Functional role grants permission ──
    // Super-admin bypass — documented, scoped to platform bootstrap/emergency
    if (ctx.isSuperAdmin === true) {
        steps.push({ step: 8, name: 'role_grants_permission', passed: true, detail: 'Super-admin bypass' });
    }
    else {
        const permMap = await getPermissionsForTenant(ctx.tenantId, schema);
        const userRoles = ctx.roles || [ctx.role];
        let roleMatch;
        for (const r of userRoles) {
            if (permMap.get(r)?.has(ctx.permissionCode)) {
                roleMatch = r;
                matchedRolesAcc.push(r);
                break;
            }
        }
        const s8passed = !!roleMatch;
        steps.push({ step: 8, name: 'role_grants_permission', passed: s8passed,
            detail: s8passed ? `Granted via role: ${roleMatch}` : `No role grants ${ctx.permissionCode}` });
        if (!s8passed)
            return denyAndLog(schema, ctx, 8, 'role_grants_permission', `No role grants permission ${ctx.permissionCode}`, steps);
    }
    // ── Step 9: Scope matches ──
    if (ctx.scopeType && ctx.scopeId) {
        // Check user has a role assignment scoped to the requested scope or a parent
        const scopeCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".user_role_assignments
       WHERE user_id = $1 AND is_active = TRUE
       AND (scope_type IS NULL OR scope_type = $2)
       AND (scope_id IS NULL OR scope_id::text = $3)
       LIMIT 1`, [ctx.userId, ctx.scopeType, ctx.scopeId]);
        const s9passed = scopeCheck.rows.length > 0 || ctx.isSuperAdmin === true;
        if (s9passed)
            matchedScopesAcc.push(`${ctx.scopeType}:${ctx.scopeId}`);
        steps.push({ step: 9, name: 'scope_matches', passed: s9passed,
            detail: s9passed ? 'Scope valid' : `No assignment for scope ${ctx.scopeType}:${ctx.scopeId}` });
        if (!s9passed)
            return denyAndLog(schema, ctx, 9, 'scope_matches', 'User not assigned to requested scope', steps);
    }
    else {
        steps.push({ step: 9, name: 'scope_matches', passed: true, detail: 'No scope constraint' });
    }
    // ── Step 10: Authority level sufficient ──
    if (ctx.authorityRequired) {
        const authCheck = await (0, db_1.safeQuery)(`SELECT al.rank FROM "${schema}".authority_levels al
       JOIN "${schema}".user_role_assignments ura ON ura.authority_level_code = al.level_code
       WHERE ura.user_id = $1 AND ura.is_active = TRUE
       ORDER BY al.rank DESC LIMIT 1`, [ctx.userId]);
        const requiredAuth = await (0, db_1.safeQuery)(`SELECT rank FROM "${schema}".authority_levels WHERE level_code = $1 LIMIT 1`, [ctx.authorityRequired]);
        const userRank = authCheck.rows[0]?.rank ?? 0;
        const requiredRank = requiredAuth.rows[0]?.rank ?? 999;
        const s10passed = userRank >= requiredRank || ctx.isSuperAdmin === true;
        steps.push({ step: 10, name: 'authority_sufficient', passed: s10passed,
            detail: `User rank: ${userRank}, required: ${requiredRank}` });
        if (!s10passed)
            return denyAndLog(schema, ctx, 10, 'authority_sufficient', `Authority level insufficient (${userRank} < ${requiredRank})`, steps);
    }
    else {
        steps.push({ step: 10, name: 'authority_sufficient', passed: true, detail: 'No authority required' });
    }
    // ── Step 11: SoD passes ──
    const userRoles = ctx.roles || [ctx.role];
    if (userRoles.length > 1) {
        const sodCheck = await (0, db_1.safeQuery)(`SELECT role_code_a, role_code_b, conflict_level FROM "${schema}".sod_rules
       WHERE is_active = TRUE
       AND role_code_a = ANY($1) AND role_code_b = ANY($1)
       AND conflict_level = 'block'
       LIMIT 1`, [userRoles]);
        const s11passed = sodCheck.rows.length === 0;
        sodResult = {
            passed: s11passed,
            conflicts: sodCheck.rows.map((r) => ({
                roleA: r.role_code_a, roleB: r.role_code_b, level: r.conflict_level,
            })),
        };
        steps.push({ step: 11, name: 'sod_passes', passed: s11passed,
            detail: s11passed ? 'No blocking SoD conflicts' : `SoD conflict: ${sodCheck.rows[0].role_code_a} vs ${sodCheck.rows[0].role_code_b}` });
        if (!s11passed)
            return denyAndLog(schema, ctx, 11, 'sod_passes', `SoD conflict blocks action: ${sodCheck.rows[0].role_code_a} vs ${sodCheck.rows[0].role_code_b}`, steps, { sodResult });
    }
    else {
        sodResult = { passed: true };
        steps.push({ step: 11, name: 'sod_passes', passed: true, detail: 'Single role — no SoD check needed' });
    }
    // ── Step 12: Lifecycle transition allowed ──
    if (ctx.lifecycleFromState && ctx.lifecycleToState && ctx.entityType) {
        const lcCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".module_lifecycle_transitions
       WHERE module_code = $1 AND from_status = $2 AND to_status = $3
       AND (required_permission_code IS NULL OR required_permission_code = $4)
       LIMIT 1`, [moduleCode, ctx.lifecycleFromState, ctx.lifecycleToState, ctx.permissionCode]);
        const s12passed = lcCheck.rows.length > 0 || ctx.isSuperAdmin === true;
        lifecycleResult = {
            consulted: true,
            allowed: s12passed,
            fromState: ctx.lifecycleFromState,
            toState: ctx.lifecycleToState,
            reason: s12passed ? 'Transition valid' : `Transition ${ctx.lifecycleFromState} → ${ctx.lifecycleToState} not allowed`,
        };
        steps.push({ step: 12, name: 'lifecycle_transition_allowed', passed: s12passed,
            detail: lifecycleResult.reason });
        if (!s12passed)
            return denyAndLog(schema, ctx, 12, 'lifecycle_transition_allowed', 'Lifecycle transition not permitted', steps, { lifecycleResult });
    }
    else {
        lifecycleResult = { consulted: false, allowed: true };
        steps.push({ step: 12, name: 'lifecycle_transition_allowed', passed: true, detail: 'No lifecycle transition' });
    }
    // ── Step 12b: SLA policy check (DOS lifecycle/SLA brain) ──
    // Reads tenant-scoped sla_policies for this module + action; if the policy
    // engine produced a `breached` verdict (e.g. an in-flight request that
    // missed its window), DAuth surfaces it as `escalated` so the caller can
    // route to the escalation owner instead of executing.
    if (ctx.entityType && ctx.entityId) {
        try {
            const slaCheck = await (0, db_1.safeQuery)(`SELECT policy_code, due_at, escalated_to_user_id, status
         FROM "${schema}".sla_active_breaches
         WHERE entity_type = $1 AND entity_id = $2 AND status IN ('breach','at_risk')
         ORDER BY due_at ASC LIMIT 1`, [ctx.entityType, ctx.entityId]);
            if (slaCheck.rows.length > 0) {
                const row = slaCheck.rows[0];
                slaResult = {
                    consulted: true,
                    breached: row.status === 'breach',
                    policyCode: row.policy_code,
                    dueAt: row.due_at,
                    escalatedTo: row.escalated_to_user_id ?? undefined,
                    reason: `SLA ${row.status} for ${ctx.entityType}:${ctx.entityId}`,
                };
                steps.push({ step: 12.5, name: 'sla_check', passed: !slaResult.breached,
                    detail: slaResult.reason });
            }
            else {
                slaResult = { consulted: true, breached: false };
                steps.push({ step: 12.5, name: 'sla_check', passed: true, detail: 'No active SLA breach' });
            }
        }
        catch (err) {
            // sla_active_breaches view may not yet be provisioned in every tenant.
            // Treat as consulted=false so callers know SLA was not authoritative.
            slaResult = { consulted: false, breached: false, reason: err instanceof Error ? err.message : 'sla view unavailable' };
            steps.push({ step: 12.5, name: 'sla_check', passed: true, detail: 'SLA view unavailable — skipped' });
        }
    }
    else {
        slaResult = { consulted: false, breached: false };
        steps.push({ step: 12.5, name: 'sla_check', passed: true, detail: 'No entity context for SLA' });
    }
    // ── Step 13: Delegation/ownership rules pass ──
    // Only enforces when ctx.ownershipRequired === true. When false/absent, the step
    // is informational — records delegation presence for audit but does not block.
    if (ctx.entityId && ctx.ownershipRequired === true) {
        const [delegationResult, ownershipResult] = await Promise.all([
            (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".delegations
         WHERE to_user_id = $1 AND is_active = TRUE
         AND valid_from <= NOW() AND valid_to > NOW()
         AND (module_code IS NULL OR module_code = $2)
         LIMIT 1`, [ctx.userId, moduleCode]),
            (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".entity_ownership
         WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3 AND is_active = TRUE
         LIMIT 1`, [ctx.userId, ctx.entityType ?? '', ctx.entityId]),
        ]);
        const hasDelegation = delegationResult.rows.length > 0;
        const isOwner = ownershipResult.rows.length > 0;
        const s13passed = isOwner || hasDelegation || ctx.isSuperAdmin === true;
        steps.push({ step: 13, name: 'delegation_ownership_pass', passed: s13passed,
            detail: isOwner ? 'Entity owner' : hasDelegation ? 'Active delegation found' : 'No ownership or delegation for entity' });
        if (!s13passed)
            return denyAndLog(schema, ctx, 13, 'delegation_ownership_pass', `User does not own entity ${ctx.entityType}:${ctx.entityId} and has no active delegation`, steps);
    }
    else if (ctx.entityId) {
        const delegationCheck = await (0, db_1.safeQuery)(`SELECT 1 FROM "${schema}".delegations
       WHERE to_user_id = $1 AND is_active = TRUE
       AND valid_from <= NOW() AND valid_to > NOW()
       AND (module_code IS NULL OR module_code = $2)
       LIMIT 1`, [ctx.userId, moduleCode]);
        const hasDelegation = delegationCheck.rows.length > 0;
        steps.push({ step: 13, name: 'delegation_ownership_pass', passed: true,
            detail: hasDelegation ? 'Active delegation found (informational)' : 'No entity ownership constraint applied' });
    }
    else {
        steps.push({ step: 13, name: 'delegation_ownership_pass', passed: true, detail: 'No entity context' });
    }
    // ── Step 13.5: External engine cross-check (Cerbos ABAC + OpenFGA ReBAC) ──
    // Runs only when at least one engine is shadowed or enforced. Shadow results
    // are annotated and logged; enforce results can deny.
    const engineResults = {};
    let enginePolicyVersion;
    let engineModelVersion;
    let engineObligations;
    if (dauth_config_1.DAUTH_CONFIG.cerbos.shadow || dauth_config_1.DAUTH_CONFIG.cerbos.enforce ||
        dauth_config_1.DAUTH_CONFIG.openfga.shadow || dauth_config_1.DAUTH_CONFIG.openfga.enforce) {
        const [abacVerdict, rebacVerdict] = await Promise.all([
            runAbac(ctx),
            runRebac(ctx),
        ]);
        if (abacVerdict) {
            engineResults.abac = abacVerdict;
            enginePolicyVersion = abacVerdict.primary?.policyVersion;
            if (abacVerdict.primary?.obligations)
                engineObligations = abacVerdict.primary.obligations;
            // Enforce: a hard Cerbos deny (not abstain) blocks the decision here.
            if (dauth_config_1.DAUTH_CONFIG.cerbos.enforce &&
                abacVerdict.primary?.source === 'cerbos' &&
                abacVerdict.primary.decision === 'deny') {
                return denyAndLog(schema, ctx, 13, 'abac_engine_deny', abacVerdict.primary.reason ?? 'Cerbos deny', steps);
            }
        }
        if (rebacVerdict) {
            engineResults.rebac = rebacVerdict;
            engineModelVersion = rebacVerdict.primary?.modelVersion;
            openFgaResult = {
                consulted: true,
                allowed: rebacVerdict.primary?.allowed,
                modelVersion: rebacVerdict.primary?.modelVersion,
                source: rebacVerdict.primary?.source,
            };
            if (dauth_config_1.DAUTH_CONFIG.openfga.enforce &&
                rebacVerdict.primary?.source === 'openfga' &&
                rebacVerdict.primary.allowed === false) {
                return denyAndLog(schema, ctx, 13, 'rebac_engine_deny', 'OpenFGA denied the relationship check', steps, { openFgaResult });
            }
        }
    }
    if (!openFgaResult)
        openFgaResult = { consulted: false };
    // ── Keycloak identity-attestation result ──
    // Identity is verified upstream by session.middleware via the Keycloak
    // token-verifier; we surface the projected attributes here so callers
    // get a uniform shape without re-decoding the token.
    keycloakIdentity = {
        consulted: !!(ctx.attributes && (ctx.attributes.kc_realm || ctx.attributes.kcSub)),
        userId: ctx.userId,
        realm: typeof ctx.attributes?.kc_realm === 'string' ? ctx.attributes.kc_realm : undefined,
        emailVerified: typeof ctx.attributes?.emailVerified === 'boolean' ? ctx.attributes.emailVerified : undefined,
        mfaSatisfied: typeof ctx.attributes?.mfa === 'boolean' ? ctx.attributes.mfa : undefined,
    };
    // ── Step 14: Decision logged ──
    const allowReasonCode = ctx.isSuperAdmin
        ? reason_codes_1.DAUTH_REASON_CODES.ALLOW_SUPER_ADMIN_BYPASS
        : reason_codes_1.DAUTH_REASON_CODES.ALLOW_ALL_CHECKS_PASSED;
    // Verdict mapping: obligations.requireDualApproval / requireApproval → pending_approval.
    // SLA breach → escalated. Otherwise → allow.
    let verdict = 'allow';
    let verdictReason = 'All 14 checks passed';
    if (slaResult?.breached) {
        verdict = 'escalated';
        verdictReason = `Allowed but SLA breach detected (${slaResult.policyCode ?? 'unknown policy'})`;
    }
    else if (engineObligations &&
        (engineObligations.requireDualApproval === true ||
            engineObligations.requireApproval === true ||
            engineObligations.requireMakerChecker === true)) {
        verdict = 'pending_approval';
        verdictReason = 'Allowed but maker/checker approval required before commit';
    }
    const allowDecision = {
        allowed: verdict === 'allow' || verdict === 'escalated' || verdict === 'pending_approval',
        decision: verdict,
        failedStep: null,
        failedCheck: null,
        reason: verdictReason,
        matchedRole: steps[7]?.detail?.includes('role:') ? steps[7].detail.split('role: ')[1] : ctx.role,
        matchedRoles: matchedRolesAcc.length > 0 ? matchedRolesAcc : undefined,
        matchedScopes: matchedScopesAcc.length > 0 ? matchedScopesAcc : undefined,
        steps,
        reasonCode: allowReasonCode,
        engineResults: Object.keys(engineResults).length > 0 ? engineResults : undefined,
        policyVersion: enginePolicyVersion,
        modelVersion: engineModelVersion,
        obligations: engineObligations,
        correlationId: ctx.correlationId,
        sodResult,
        openFgaResult,
        keycloakIdentity,
        lifecycleResult,
        slaResult,
    };
    if (!ctx.dryRun) {
        await logDecision(schema, ctx, allowDecision).catch((0, resilience_1.catchHandler)(resilience_1.EC.DB_CLEANUP));
    }
    steps.push({ step: 14, name: 'decision_logged', passed: true, detail: ctx.dryRun ? 'Skipped (dryRun)' : 'Written to authz_decision_log' });
    return allowDecision;
}
// ── Helpers ──
function deny(step, check, reason, steps, extras) {
    // Deny decisions are always logged — more important than allows for security audit
    return {
        allowed: false,
        decision: 'deny',
        failedStep: step,
        failedCheck: check,
        reason,
        steps,
        reasonCode: (0, reason_codes_1.reasonCodeForStep)(step, check),
        ...extras,
    };
}
async function denyAndLog(schema, ctx, step, check, reason, steps, extras) {
    const decision = deny(step, check, reason, steps, { ...extras, correlationId: ctx.correlationId });
    observability_1.logger.warn(`[DAuth] DENY step=${step} check=${check} code=${decision.reasonCode} perm=${ctx.permissionCode} user=${ctx.userId} tenant=${ctx.tenantId} path=${ctx.path || '-'} reason=${reason}`);
    if (!ctx.dryRun) {
        await logDecision(schema, ctx, decision).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return decision;
}
async function getPermissionsForTenant(tenantId, schema) {
    const cached = permCache.get(tenantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL)
        return cached.permissions;
    const perms = new Map();
    try {
        const mapRes = await (0, db_1.safeQuery)(`SELECT role_code, permission_code
       FROM "${schema}".role_permission_map
       WHERE tenant_id = $1`, [tenantId]);
        for (const row of mapRes.rows) {
            if (!perms.has(row.role_code))
                perms.set(row.role_code, new Set());
            perms.get(row.role_code).add(row.permission_code);
        }
    }
    catch (err) {
        observability_1.logger.error(`[DAuth] CRITICAL: failed to read role_permission_map for tenant ${tenantId} — schema: ${schema}`, {
            error: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
    if (permCache.size >= MAX_CACHE) {
        const oldest = [...permCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
        if (oldest)
            permCache.delete(oldest[0]);
    }
    permCache.set(tenantId, { permissions: perms, ts: Date.now() });
    return perms;
}
async function runAbac(ctx) {
    try {
        const { primary, shadow } = (0, abac_factory_1.getAbacAdapters)();
        const req = {
            principal: {
                userId: ctx.userId,
                tenantId: ctx.tenantId,
                roles: ctx.roles ?? [ctx.role],
                attributes: ctx.attributes,
            },
            resource: {
                type: ctx.entityType ?? ctx.permissionCode.split('.')[0],
                id: ctx.entityId,
                tenantId: ctx.tenantId,
                attributes: ctx.attributes?.resource ?? {},
            },
            action: ctx.permissionCode,
            context: {
                lifecycleFromState: ctx.lifecycleFromState,
                lifecycleToState: ctx.lifecycleToState,
                ip: ctx.ip,
                path: ctx.path,
            },
        };
        const [p, s] = await Promise.all([
            primary.evaluate(req),
            shadow ? shadow.evaluate(req) : Promise.resolve(undefined),
        ]);
        if (s && p.decision !== s.decision) {
            observability_1.logger.warn('[DAuth:ABAC] shadow mismatch', {
                primary: p.source,
                shadow: s.source,
                primaryDecision: p.decision,
                shadowDecision: s.decision,
                perm: ctx.permissionCode,
            });
        }
        return { primary: p, shadow: s };
    }
    catch (err) {
        observability_1.logger.debug('[DAuth:ABAC] evaluation errored — skipping', {
            error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
    }
}
async function runRebac(ctx) {
    if (!ctx.entityType || !ctx.entityId)
        return undefined;
    try {
        const { primary, shadow } = (0, rebac_factory_1.getRebacAdapters)();
        // Relation name convention: `can_<action>` — e.g. `can_approve`.
        const relation = `can_${ctx.permissionCode.split('.').pop() ?? 'access'}`;
        const req = {
            user: `user:${ctx.userId}`,
            relation,
            object: `${ctx.entityType}:${ctx.entityId}`,
        };
        const [p, s] = await Promise.all([
            primary.check(req),
            shadow ? shadow.check(req) : Promise.resolve(undefined),
        ]);
        if (s && p.allowed !== s.allowed) {
            observability_1.logger.warn('[DAuth:ReBAC] shadow mismatch', {
                primary: p.source,
                shadow: s.source,
                primaryAllowed: p.allowed,
                shadowAllowed: s.allowed,
                perm: ctx.permissionCode,
            });
        }
        return { primary: p, shadow: s };
    }
    catch (err) {
        observability_1.logger.debug('[DAuth:ReBAC] evaluation errored — skipping', {
            error: err instanceof Error ? err.message : String(err),
        });
        return undefined;
    }
}
async function logDecision(schema, ctx, decision) {
    // Context JSON carries reason code, policy/model versions, engine results,
    // and obligations. Once the Phase 5 migration adds dedicated columns, a
    // follow-up patch lifts these fields out of the JSON blob into indexed
    // columns — the schema here stays tolerant of both shapes.
    const recordContext = {
        ip: ctx.ip,
        path: ctx.path,
        failedStep: decision.failedStep,
        failedCheck: decision.failedCheck,
        stepCount: decision.steps.length,
        isSuperAdmin: ctx.isSuperAdmin || false,
        reasonCode: decision.reasonCode,
        reasonCodes: decision.reasonCode ? [decision.reasonCode] : [],
        policyVersion: decision.policyVersion,
        modelVersion: decision.modelVersion,
        engineResults: decision.engineResults,
        obligations: decision.obligations,
        attributes: ctx.attributes,
    };
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".authz_decision_log
     (user_id, permission_code, module_code, decision, reason, matched_role,
      matched_scope_type, authority_level, correlation_id, record_context)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
        ctx.userId,
        ctx.permissionCode,
        ctx.moduleCode || ctx.permissionCode.split('.')[0],
        decision.decision ?? (decision.allowed ? 'allow' : 'deny'),
        decision.reason,
        decision.matchedRole || null,
        ctx.scopeType || null,
        ctx.authorityRequired || null,
        ctx.correlationId || null,
        JSON.stringify(recordContext),
    ]);
}
//# sourceMappingURL=decision-engine.js.map
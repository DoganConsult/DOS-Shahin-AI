"use strict";
/**
 * Phase G T2 — atomic trial bundle.
 *
 * Given an open transaction client and the freshly-created tenant context,
 * this helper writes 5 rows in the same transaction:
 *
 *   1. dos.tenant_trials                — `trial_pending_verification`
 *   2. dos.tenant_subscriptions         — `trialing` / `no_payment_required` / `manual`
 *   3. dos.tenant_product_entitlements  — `active` source=`trial`
 *   4. dos.tenant_module_entitlements   — N rows, one per allowed module
 *   5. dos.trial_audit_log              — `trial_created`
 *
 * Trial duration + allowed modules + limits ALL come from environment-injected
 * Config OS values — never hardcoded literals. This file is the bridge from
 * the existing /register transaction to the Phase G data model.
 *
 * Source of truth for state names, statuses, and shape:
 *   modules/packages/dos-types/src/trial.ts
 *   platform/dos/migrations/public/20260501_0200_phase_g_trial_lifecycle.sql
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrialSummary = exports.createTrialBundle = exports.resolveTrialConfig = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
function newId(prefix) {
    // 32-char varchar limit on Phase G PKs — prefix + 24 hex chars (~12 bytes).
    return `${prefix}_${node_crypto_1.default.randomBytes(12).toString('hex')}`;
}
function readNumber(env, fallback) {
    const n = Number(env);
    return Number.isFinite(n) && n > 0 ? n : fallback;
}
function readCsv(env, fallback) {
    if (!env || env.trim() === '')
        return fallback;
    return env.split(',').map((s) => s.trim()).filter(Boolean);
}
function resolveTrialConfig() {
    return {
        defaultDays: readNumber(process.env.TRIAL_DEFAULT_DAYS, 14),
        graceDays: readNumber(process.env.TRIAL_GRACE_DAYS, 7),
        allowedModules: readCsv(process.env.TRIAL_ALLOWED_MODULES, [
            // §G: Foundation is platform DNA — listed here only because module
            // entitlement rows are still created with source='platform_dna'.
            // Other modules listed are the trial-allowed Shahin modules.
            'foundation', 'risk', 'compliance', 'controls', 'evidence', 'audit',
            'policy', 'vendor', 'asset', 'incident', 'issues', 'remediation',
            'workflow', 'notification', 'inbox', 'attestation', 'training',
            'privacy', 'bcp', 'dora', 'knowledge', 'reporting', 'analytics',
            'onboarding', 'action', 'ksa-regulatory', 'qiyas', 'agrc-engine',
            'ai-os', 'mcp', 'dynamic-ui',
        ]),
        maxUsers: process.env.TRIAL_MAX_USERS ? readNumber(process.env.TRIAL_MAX_USERS, 10) : undefined,
        aiCredits: process.env.TRIAL_AI_CREDITS ? readNumber(process.env.TRIAL_AI_CREDITS, 1000) : undefined,
    };
}
exports.resolveTrialConfig = resolveTrialConfig;
/**
 * Create the full Phase G trial bundle inside an existing transaction.
 * Caller is responsible for BEGIN/COMMIT/ROLLBACK and for the user/tenant
 * rows that this bundle joins to.
 *
 * Idempotent on (tenant, product) — the unique partial index on
 * dos.tenant_trials prevents double-active rows. If a row already exists
 * we return its identifiers unchanged.
 */
async function createTrialBundle(client, input) {
    const cfg = resolveTrialConfig();
    // Re-use existing active trial if present (idempotent /register).
    const existing = await client.query(`SELECT trial_id, starts_at, ends_at, grace_ends_at
       FROM dos.tenant_trials
      WHERE tenant_id = $1 AND product_code = $2
        AND status IN ('trial_pending_verification','trial_active','trial_expiring','trial_grace')
      LIMIT 1`, [input.tenantId, input.productCode]);
    if (existing.rows.length > 0) {
        const row = existing.rows[0];
        const sub = await client.query(`SELECT subscription_id FROM dos.tenant_subscriptions
        WHERE tenant_id=$1 AND product_code=$2
          AND status IN ('trialing','active','past_due','grace')
        LIMIT 1`, [input.tenantId, input.productCode]);
        const prodEnt = await client.query(`SELECT entitlement_id FROM dos.tenant_product_entitlements
        WHERE tenant_id=$1 AND product_code=$2 AND entitlement_status='active'
        LIMIT 1`, [input.tenantId, input.productCode]);
        const modEnts = await client.query(`SELECT entitlement_id, module_code FROM dos.tenant_module_entitlements
        WHERE tenant_id=$1 AND product_code=$2 AND entitlement_status='active'`, [input.tenantId, input.productCode]);
        const startsAt = new Date(row.starts_at).toISOString();
        const endsAt = new Date(row.ends_at).toISOString();
        const graceEnd = row.grace_ends_at ? new Date(row.grace_ends_at).toISOString() :
            new Date(new Date(row.ends_at).getTime() + cfg.graceDays * 86_400_000).toISOString();
        const days = Math.max(0, Math.ceil((new Date(row.ends_at).getTime() - Date.now()) / 86_400_000));
        return {
            trialId: row.trial_id,
            subscriptionId: sub.rows[0]?.subscription_id ?? '',
            productEntitlementId: prodEnt.rows[0]?.entitlement_id ?? '',
            moduleEntitlementIds: modEnts.rows.map(r => r.entitlement_id),
            trialStartsAt: startsAt,
            trialEndsAt: endsAt,
            graceEndsAt: graceEnd,
            daysRemaining: days,
            allowedModules: modEnts.rows.map(r => r.module_code),
            limits: { default: { maxUsers: cfg.maxUsers, aiCredits: cfg.aiCredits } },
        };
    }
    // Fresh trial.
    const trialId = newId('tri');
    const subscriptionId = newId('sub');
    const prodEntId = newId('pen');
    const now = new Date();
    const endsAt = new Date(now.getTime() + cfg.defaultDays * 86_400_000);
    const graceEnds = new Date(endsAt.getTime() + cfg.graceDays * 86_400_000);
    await client.query(`INSERT INTO dos.tenant_trials
       (trial_id, tenant_id, product_code, plan_code, status,
        starts_at, ends_at, grace_ends_at, created_by_user_id,
        signup_domain, verification_status, source, metadata)
     VALUES ($1,$2,$3,$4,'trial_pending_verification',
             $5,$6,$7,$8,
             $9,'pending',$10,$11)`, [
        trialId, input.tenantId, input.productCode, input.planCode ?? 'trial',
        now.toISOString(), endsAt.toISOString(), graceEnds.toISOString(), input.ownerUserId,
        input.signupDomain ?? null, input.source ?? 'self_registration',
        JSON.stringify({ defaultDays: cfg.defaultDays, graceDays: cfg.graceDays }),
    ]);
    await client.query(`INSERT INTO dos.tenant_subscriptions
       (subscription_id, tenant_id, product_code, plan_code, status,
        billing_status, trial_id, current_period_start, current_period_end,
        grace_ends_at, provider_mode, metadata)
     VALUES ($1,$2,$3,$4,'trialing',
             'no_payment_required',$5,$6,$7,
             $8,'manual',$9)`, [
        subscriptionId, input.tenantId, input.productCode, input.planCode ?? 'trial',
        trialId, now.toISOString(), endsAt.toISOString(),
        graceEnds.toISOString(),
        JSON.stringify({ source: 'phase-g-t2-self-registration' }),
    ]);
    await client.query(`INSERT INTO dos.tenant_product_entitlements
       (entitlement_id, tenant_id, product_code, entitlement_status,
        source, trial_id, subscription_id, starts_at, ends_at, metadata)
     VALUES ($1,$2,$3,'active','trial',$4,$5,$6,$7,$8)`, [
        prodEntId, input.tenantId, input.productCode,
        trialId, subscriptionId,
        now.toISOString(), endsAt.toISOString(),
        JSON.stringify({}),
    ]);
    const moduleEntitlementIds = [];
    const limits = {};
    const trialLimits = {
        maxUsers: cfg.maxUsers,
        aiCredits: cfg.aiCredits,
        watermarkExports: true,
    };
    for (const moduleCode of cfg.allowedModules) {
        const modEntId = newId('men');
        const isDna = moduleCode === 'foundation';
        const source = isDna ? 'platform_dna' : 'trial';
        // Foundation is platform DNA — entitlement row is informational only,
        // never used to gate Foundation visibility.
        await client.query(`INSERT INTO dos.tenant_module_entitlements
         (entitlement_id, tenant_id, product_code, module_code,
          entitlement_status, source, trial_id, subscription_id,
          limits_json, starts_at, ends_at, metadata)
       VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`, [
            modEntId, input.tenantId, input.productCode, moduleCode,
            source, trialId, subscriptionId,
            JSON.stringify(isDna ? {} : trialLimits),
            now.toISOString(), endsAt.toISOString(),
            JSON.stringify({}),
        ]);
        moduleEntitlementIds.push(modEntId);
        if (!isDna)
            limits[moduleCode] = trialLimits;
    }
    await client.query(`INSERT INTO dos.trial_audit_log
       (tenant_id, trial_id, user_id, product_code, action,
        old_status, new_status, reason, metadata_json)
     VALUES ($1,$2,$3,$4,'trial_created',
             NULL,'trial_pending_verification','self-registration',$5)`, [
        input.tenantId, trialId, input.ownerUserId, input.productCode,
        JSON.stringify({
            defaultDays: cfg.defaultDays,
            graceDays: cfg.graceDays,
            allowedModules: cfg.allowedModules,
        }),
    ]);
    return {
        trialId,
        subscriptionId,
        productEntitlementId: prodEntId,
        moduleEntitlementIds,
        trialStartsAt: now.toISOString(),
        trialEndsAt: endsAt.toISOString(),
        graceEndsAt: graceEnds.toISOString(),
        daysRemaining: cfg.defaultDays,
        allowedModules: cfg.allowedModules,
        limits,
    };
}
exports.createTrialBundle = createTrialBundle;
/**
 * Fetch current trial summary for a tenant+product. Used by GET /api/trials/current
 * and consumed by the contract-driven trial banner.
 */
async function getTrialSummary(client, tenantId, productCode) {
    const trialQ = await client.query(`SELECT trial_id, tenant_id, product_code, plan_code, status,
            starts_at, ends_at, grace_ends_at, created_by_user_id,
            signup_domain, verification_status, source, metadata,
            created_at, updated_at
       FROM dos.tenant_trials
      WHERE tenant_id=$1 AND product_code=$2
      ORDER BY created_at DESC
      LIMIT 1`, [tenantId, productCode]);
    if (trialQ.rows.length === 0) {
        return { hasTrial: false, allowedModules: [], limits: {} };
    }
    const trial = trialQ.rows[0];
    const subQ = await client.query(`SELECT subscription_id, tenant_id, product_code, plan_code, status,
            billing_status, trial_id, current_period_start, current_period_end,
            grace_ends_at, provider_mode, metadata, created_at, updated_at
       FROM dos.tenant_subscriptions
      WHERE tenant_id=$1 AND product_code=$2
      ORDER BY created_at DESC
      LIMIT 1`, [tenantId, productCode]);
    const modsQ = await client.query(`SELECT module_code, limits_json, source
       FROM dos.tenant_module_entitlements
      WHERE tenant_id=$1 AND product_code=$2 AND entitlement_status='active'`, [tenantId, productCode]);
    const ends = trial.ends_at ? new Date(trial.ends_at).getTime() : null;
    const grace = trial.grace_ends_at ? new Date(trial.grace_ends_at).getTime() : null;
    const days = ends ? Math.max(0, Math.ceil((ends - Date.now()) / 86_400_000)) : undefined;
    const graceDays = grace ? Math.max(0, Math.ceil((grace - Date.now()) / 86_400_000)) : null;
    const limits = {};
    for (const r of modsQ.rows) {
        if (r.source !== 'platform_dna' && r.limits_json && Object.keys(r.limits_json).length) {
            limits[r.module_code] = r.limits_json;
        }
    }
    // T5 — modules whose trial entitlement was deactivated after suspension.
    // These come back as `'trial-expired'` reason in Dynamic UI; without this
    // separate signal, expired modules look indistinguishable from never-
    // entitled ones (both fall through `/permissions` modules query).
    const expiredQ = await client.query(`SELECT module_code FROM dos.tenant_module_entitlements
      WHERE tenant_id=$1 AND product_code=$2
        AND source='trial'
        AND entitlement_status IN ('expired','suspended','cancelled')`, [tenantId, productCode]);
    return {
        hasTrial: true,
        trial,
        subscription: subQ.rows[0] || undefined,
        daysRemaining: days,
        graceDaysRemaining: graceDays,
        allowedModules: modsQ.rows.map(r => r.module_code),
        limits,
        // Phase G T5 — trial-state-aware fields consumed by AccessStore +
        // workspace-navigation.adapter to emit 'trial-expired' / 'trial-limit-reached'.
        expiredModules: expiredQ.rows.map(r => r.module_code),
        // limitsHit is populated when modules report usage > limit. The
        // resolver will be wired in Phase G T5.1 once each module reports
        // its current counters; for now the array is always empty.
        limitsHit: [],
    };
}
exports.getTrialSummary = getTrialSummary;
//# sourceMappingURL=trial-bundle.js.map
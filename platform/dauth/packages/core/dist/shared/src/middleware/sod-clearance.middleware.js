"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSodClearance = requireSodClearance;
let dbModule = null;
async function loadDb() {
    if (dbModule)
        return dbModule;
    // Lazy-import so the package can be bundled into contexts without @dos/db.
    const mod = (await import('@dos/db'));
    dbModule = mod;
    return dbModule;
}
function failClosed() {
    const v = (process.env.DAUTH_SOD_FAIL_CLOSED || '').toLowerCase();
    return v === '1' || v === 'true';
}
function requireSodClearance(opts) {
    if (!opts.moduleCode || !opts.action) {
        throw new Error('[DAuth] requireSodClearance requires { moduleCode, action }');
    }
    const enforce = opts.enforce !== false;
    return async (req, res, next) => {
        const tenantId = req.tenantId || req.user?.tenantId;
        const userId = req.user?.id || req.userId;
        if (!tenantId || !userId) {
            // Auth gate already ran upstream; if either is missing here the
            // request is malformed — fail closed.
            res.status(401).json({ error: 'Unauthenticated', code: 'DAUTH_SOD_NO_PRINCIPAL' });
            return;
        }
        const userRoles = collectRoles(req);
        const userActions = collectPermissions(req);
        try {
            const verdict = await evaluate({
                tenantId,
                userId,
                userRoles,
                userActions,
                moduleCode: opts.moduleCode,
                action: opts.action,
                conflictingAction: opts.conflictingAction,
            });
            req.sodClearance = verdict;
            if (verdict.outcome === 'block' && enforce) {
                res.status(403).json({
                    error: 'SoD violation',
                    code: 'DAUTH_SOD_BLOCK',
                    ruleCode: verdict.ruleCode,
                    reason: verdict.reason,
                });
                return;
            }
            if (verdict.outcome === 'escalate' && enforce) {
                res.status(409).json({
                    error: 'SoD escalation required',
                    code: 'DAUTH_SOD_ESCALATE',
                    ruleCode: verdict.ruleCode,
                    reason: verdict.reason,
                });
                return;
            }
            next();
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (failClosed()) {
                res.status(503).json({
                    error: 'SoD evaluation unavailable',
                    code: 'DAUTH_SOD_UNAVAILABLE',
                    detail: msg,
                });
                return;
            }
            // Degrade open during shadow rollout. Annotate so the audit
            // ledger sees the failure.
            req.sodClearance = {
                passed: true,
                outcome: 'allow',
                reason: `sod-eval failed (degraded open): ${msg}`,
            };
            next();
        }
    };
}
function collectRoles(req) {
    const acc = [];
    const u = req.user;
    if (u?.role && typeof u.role === 'string')
        acc.push(u.role);
    if (Array.isArray(u?.roles))
        acc.push(...u.roles.filter((r) => typeof r === 'string'));
    if (typeof req.userRole === 'string')
        acc.push(req.userRole);
    return Array.from(new Set(acc));
}
function collectPermissions(req) {
    if (Array.isArray(req.permissions))
        return Array.from(new Set(req.permissions));
    const fromUser = req.user?.permissions;
    if (Array.isArray(fromUser))
        return Array.from(new Set(fromUser));
    return [];
}
async function evaluate(input) {
    const db = await loadDb();
    return db.withTenantClient(input.tenantId, async (client) => {
        // ── 1. Role-pair conflicts in sod_rules ────────────────────────
        if (input.userRoles.length >= 2) {
            const { rows } = await client.query(`SELECT rule_code, role_code_a, role_code_b, conflict_level, enforcement,
                temporary_waiver_allowed, description
         FROM sod_rules
         WHERE is_active = TRUE
           AND role_code_a = ANY($1::text[])
           AND role_code_b = ANY($1::text[])
           AND (module_code IS NULL OR module_code = $2)
         ORDER BY conflict_level DESC
         LIMIT 1`, [input.userRoles, input.moduleCode]);
            if (rows.length > 0) {
                const r = rows[0];
                const blockingLevel = r.conflict_level;
                if (blockingLevel === 'block' || blockingLevel === 'escalate') {
                    if (r.temporary_waiver_allowed) {
                        const waiver = await activeWaiver(client, input.userId, r.rule_code);
                        if (waiver) {
                            return {
                                passed: true,
                                outcome: 'allow-with-audit',
                                ruleCode: r.rule_code,
                                waiverId: waiver.waiver_id,
                                reason: `Waiver ${waiver.waiver_id} active until ${waiver.expires_at}`,
                            };
                        }
                    }
                    return {
                        passed: false,
                        outcome: blockingLevel === 'block' ? 'block' : 'escalate',
                        ruleCode: r.rule_code,
                        reason: r.description || `SoD ${blockingLevel}: ${r.role_code_a} ↔ ${r.role_code_b}`,
                    };
                }
                if (blockingLevel === 'warn') {
                    return {
                        passed: true,
                        outcome: 'warn',
                        ruleCode: r.rule_code,
                        reason: r.description || `SoD warn: ${r.role_code_a} ↔ ${r.role_code_b}`,
                    };
                }
            }
        }
        // ── 2. Action-pair conflicts in module_sod_rules ──────────────
        const candidateActions = new Set([input.action]);
        if (input.conflictingAction)
            candidateActions.add(input.conflictingAction);
        for (const p of input.userActions)
            candidateActions.add(p);
        if (candidateActions.size >= 2) {
            const arr = Array.from(candidateActions);
            const { rows } = await client.query(`SELECT action_a, action_b, conflict_type, resolution_strategy, description_en
         FROM module_sod_rules
         WHERE active = TRUE
           AND module_code = $1
           AND action_a = ANY($2::text[])
           AND action_b = ANY($2::text[])
         ORDER BY conflict_type ASC
         LIMIT 1`, [input.moduleCode, arr]);
            if (rows.length > 0) {
                const r = rows[0];
                const outcome = r.resolution_strategy || 'block';
                if (outcome === 'block' || outcome === 'escalate') {
                    return {
                        passed: false,
                        outcome,
                        reason: r.description_en || `SoD ${outcome}: ${r.action_a} ↔ ${r.action_b}`,
                    };
                }
                return {
                    passed: true,
                    outcome: outcome === 'warn' ? 'warn' : 'allow',
                    reason: r.description_en,
                };
            }
        }
        return { passed: true, outcome: 'allow' };
    });
}
async function activeWaiver(client, userId, ruleCode) {
    try {
        const { rows } = await client.query(`SELECT waiver_id, expires_at FROM sod_waivers
       WHERE user_id = $1 AND rule_code = $2
         AND is_active = TRUE
         AND revoked_at IS NULL
         AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`, [userId, ruleCode]);
        return rows[0] ?? null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=sod-clearance.middleware.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAuthorityKinds = listAuthorityKinds;
exports.listPositionAuthority = listPositionAuthority;
exports.listAuthorityMatrix = listAuthorityMatrix;
exports.setPositionAuthority = setPositionAuthority;
exports.listRules = listRules;
exports.check = check;
exports.recordViolation = recordViolation;
exports.listViolations = listViolations;
exports.resolveViolation = resolveViolation;
/**
 * Foundation — Authority Matrix + SoD Engine (G2).
 *
 * Two responsibilities in one service module (split internally):
 *
 *  AUTHORITY MATRIX
 *    - List authority kinds (catalog)
 *    - Get the authority limits for a position / user
 *    - Resolve "can user X approve action Y at amount Z?"
 *
 *  SoD ENGINE
 *    - Load active rules (platform default + tenant override)
 *    - Check a proposed assignment / approval BEFORE write
 *    - Record violations; track resolution lifecycle
 *
 * Both surfaces are exposed via routes/authority-sod.routes.ts.
 */
const database_port_1 = require("../../ports/database.port");
const metrics_1 = require("../../infrastructure/observability/metrics");
function track(op, fn) {
    const start = Date.now();
    return fn().finally(() => metrics_1.userMetrics.observeDb(op, Date.now() - start));
}
// ---------------------------------------------------------------------------
// AUTHORITY MATRIX
// ---------------------------------------------------------------------------
async function listAuthorityKinds() {
    return track('foundation.authority.kinds', () => (0, database_port_1.withTenantClient)('platform', async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_authority_kinds WHERE is_active = true
         ORDER BY authority_kind`);
        return r.rows;
    }));
}
async function listPositionAuthority(tenantId, positionId) {
    return track('foundation.authority.byPosition', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_position_authority
          WHERE tenant_id = $1 AND position_id = $2 AND is_active = true
            AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
            AND (effective_to   IS NULL OR effective_to   >= CURRENT_DATE)
          ORDER BY authority_kind`, [tenantId, positionId]);
        return r.rows;
    }));
}
async function listAuthorityMatrix(tenantId) {
    return track('foundation.authority.matrix', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_position_authority
          WHERE tenant_id = $1 AND is_active = true
            AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
            AND (effective_to   IS NULL OR effective_to   >= CURRENT_DATE)
          ORDER BY position_id, authority_kind`, [tenantId]);
        const grouped = new Map();
        for (const row of r.rows) {
            const arr = grouped.get(row.position_id) ?? [];
            arr.push(row);
            grouped.set(row.position_id, arr);
        }
        return Array.from(grouped.entries()).map(([position_id, authorities]) => ({ position_id, authorities }));
    }));
}
async function setPositionAuthority(tenantId, input, actorId) {
    return track('foundation.authority.set', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.foundation_position_authority
           (tenant_id, position_id, authority_kind, monetary_limit, monetary_unit,
            qualifications, conditions, effective_from, effective_to,
            is_active, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, true, $10)
         ON CONFLICT (tenant_id, position_id, authority_kind, effective_from)
         DO UPDATE SET
           monetary_limit  = EXCLUDED.monetary_limit,
           monetary_unit   = EXCLUDED.monetary_unit,
           qualifications  = EXCLUDED.qualifications,
           conditions      = EXCLUDED.conditions,
           effective_to    = EXCLUDED.effective_to,
           is_active       = true
         RETURNING *`, [tenantId, input.position_id, input.authority_kind,
            input.monetary_limit ?? null, input.monetary_unit ?? null,
            input.qualifications ?? null, input.conditions ?? {},
            input.effective_from ?? null, input.effective_to ?? null,
            actorId]);
        return r.rows[0];
    }));
}
// ---------------------------------------------------------------------------
// SoD ENGINE
// ---------------------------------------------------------------------------
async function listRules(tenantId) {
    return track('foundation.sod.listRules', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        // Tenant overrides take precedence over platform defaults of the same rule_code.
        const r = await c.query(`SELECT DISTINCT ON (rule_code) *
           FROM dos.foundation_sod_rules
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY rule_code, tenant_id NULLS LAST`, [tenantId]);
        return r.rows;
    }));
}
async function check(tenantId, input) {
    return track('foundation.sod.check', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const rulesRes = await c.query(`SELECT DISTINCT ON (rule_code) *
           FROM dos.foundation_sod_rules
          WHERE is_active = true AND (tenant_id IS NULL OR tenant_id = $1)
          ORDER BY rule_code, tenant_id NULLS LAST`, [tenantId]);
        const rules = rulesRes.rows;
        const out = { passed: true, violations: [], warnings: [] };
        const proposedRoles = input.proposedRoles ?? [];
        for (const rule of rules) {
            const params = rule.parameters ?? {};
            let triggered = false;
            let reason = '';
            switch (rule.rule_kind) {
                case 'mutually_exclusive_roles':
                case 'blocked_role_pair': {
                    const pair = params['role_pair'] ?? [];
                    if (pair.length === 2 && pair.every((r) => proposedRoles.includes(r))) {
                        triggered = true;
                        reason = `User would hold both '${pair[0]}' and '${pair[1]}'`;
                    }
                    break;
                }
                case 'approval_self_block': {
                    if (input.attemptedAction && input.attemptedAction.initiator_id === input.userId) {
                        const applies = params['applies_to'] ?? [];
                        if (applies.includes(input.attemptedAction.authority_kind) || applies.includes('all')) {
                            triggered = true;
                            reason = `User initiated and is approving the same action (${input.attemptedAction.authority_kind})`;
                        }
                    }
                    break;
                }
                case 'time_separation': {
                    const minHours = Number(params['min_hours'] ?? 0);
                    const applies = params['applies_to'] ?? [];
                    if (input.attemptedAction && input.recentDelegations &&
                        (applies.includes(input.attemptedAction.authority_kind) || applies.includes('all'))) {
                        const cutoffMs = Date.now() - minHours * 3600_000;
                        const fresh = input.recentDelegations.find((d) => d.authority_kind === input.attemptedAction.authority_kind &&
                            new Date(d.granted_at).getTime() > cutoffMs);
                        if (fresh) {
                            triggered = true;
                            reason = `Delegation granted at ${fresh.granted_at} is younger than ${minHours}h cooling period`;
                        }
                    }
                    break;
                }
                case 'committee_self_block': {
                    // Stub — caller passes context via attemptedAction.meta if used in committee context.
                    break;
                }
                default:
                    break;
            }
            if (triggered) {
                if (rule.is_enforcing) {
                    out.passed = false;
                    out.violations.push({ rule, reason, severity: rule.severity });
                }
                else {
                    out.warnings.push({ rule, reason });
                }
            }
        }
        return out;
    }));
}
async function recordViolation(tenantId, input) {
    return track('foundation.sod.record', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`INSERT INTO dos.foundation_sod_violations
           (tenant_id, rule_code, user_id, severity, context)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`, [tenantId, input.ruleCode, input.userId, input.severity ?? null, input.context ?? {}]);
        return r.rows[0];
    }));
}
async function listViolations(tenantId, filter = {}) {
    const conds = ['tenant_id = $1'];
    const params = [tenantId];
    if (filter.resolution) {
        params.push(filter.resolution);
        conds.push(`resolution = $${params.length}`);
    }
    if (filter.severity) {
        params.push(filter.severity);
        conds.push(`severity = $${params.length}`);
    }
    if (filter.userId) {
        params.push(filter.userId);
        conds.push(`user_id = $${params.length}`);
    }
    return track('foundation.sod.listViolations', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`SELECT * FROM dos.foundation_sod_violations
          WHERE ${conds.join(' AND ')}
          ORDER BY detected_at DESC LIMIT 500`, params);
        return r.rows;
    }));
}
async function resolveViolation(tenantId, violationId, resolution, note, actorId) {
    return track('foundation.sod.resolve', () => (0, database_port_1.withTenantClient)(tenantId, async (c) => {
        const r = await c.query(`UPDATE dos.foundation_sod_violations
            SET resolution = $3, resolution_note = $4, resolved_at = NOW(), resolved_by = $5
          WHERE id = $1 AND tenant_id = $2 AND resolution = 'open'
          RETURNING *`, [violationId, tenantId, resolution, note ?? null, actorId]);
        return r.rows[0] ?? null;
    }));
}
//# sourceMappingURL=authority-sod.service.js.map
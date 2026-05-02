"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFeatureGate = registerFeatureGate;
exports.getFeatureGate = getFeatureGate;
exports.listFeatureGates = listFeatureGates;
exports.setFeatureGateState = setFeatureGateState;
exports.isFeatureEnabled = isFeatureEnabled;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
async function registerFeatureGate(input) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_feature_gates (
      gate_code, label, state, rollout_percent, allowed_roles, allowed_tenants,
      owner_layer, owner_code, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (gate_code) DO UPDATE SET
      label = EXCLUDED.label,
      state = EXCLUDED.state,
      rollout_percent = EXCLUDED.rollout_percent,
      allowed_roles = EXCLUDED.allowed_roles,
      allowed_tenants = EXCLUDED.allowed_tenants,
      updated_at = EXCLUDED.updated_at`, [
        input.gateCode,
        input.label,
        input.state,
        input.rolloutPercent ?? 0,
        JSON.stringify(input.allowedRoles ?? []),
        JSON.stringify(input.allowedTenants ?? []),
        input.ownerLayer,
        input.ownerCode,
        now,
        now,
    ]);
    await (0, events_1.publish)('delivery.feature_gate.registered', 'platform', { gateCode: input.gateCode, state: input.state }, {});
}
async function getFeatureGate(gateCode) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_feature_gates WHERE gate_code = $1 LIMIT 1`, [gateCode]);
    if (!result.rows[0])
        return null;
    return mapGateRow(result.rows[0]);
}
async function listFeatureGates(ownerLayer, ownerCode) {
    let result;
    if (ownerLayer && ownerCode) {
        result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_feature_gates WHERE owner_layer = $1 AND owner_code = $2 ORDER BY gate_code`, [ownerLayer, ownerCode]);
    }
    else {
        result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_feature_gates ORDER BY gate_code`, []);
    }
    return result.rows.map(mapGateRow);
}
async function setFeatureGateState(gateCode, state, rolloutPercent) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_feature_gates SET state = $1, rollout_percent = COALESCE($2, rollout_percent), updated_at = $3 WHERE gate_code = $4`, [state, rolloutPercent ?? null, now, gateCode]);
    await (0, events_1.publish)('delivery.feature_gate.state_changed', 'platform', { gateCode, state, rolloutPercent }, {});
}
async function isFeatureEnabled(gateCode, context) {
    const gate = await getFeatureGate(gateCode);
    if (!gate)
        return false;
    if (gate.state === 'off')
        return false;
    if (gate.state === 'on')
        return true;
    if (gate.state === 'percentage' && context.bucketSeed) {
        const hash = simpleHash(context.bucketSeed + gateCode);
        const bucket = hash % 100;
        return bucket < gate.rolloutPercent;
    }
    if (gate.state === 'canary') {
        if (context.tenantId && gate.allowedTenants.includes(context.tenantId))
            return true;
        if (context.roles && gate.allowedRoles.some((r) => context.roles.includes(r)))
            return true;
        return false;
    }
    return false;
}
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}
function mapGateRow(row) {
    return {
        gateCode: row.gate_code,
        label: row.label,
        state: row.state,
        rolloutPercent: row.rollout_percent ?? 0,
        allowedRoles: row.allowed_roles ?? [],
        allowedTenants: row.allowed_tenants ?? [],
        ownerLayer: row.owner_layer,
        ownerCode: row.owner_code,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
//# sourceMappingURL=feature-gate.service.js.map
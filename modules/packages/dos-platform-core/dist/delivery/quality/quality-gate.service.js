"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQualityGate = registerQualityGate;
exports.evaluateQualityGate = evaluateQualityGate;
exports.getQualityGate = getQualityGate;
exports.listQualityGatesByRelease = listQualityGatesByRelease;
exports.listFailingGates = listFailingGates;
exports.isReleaseQualityApproved = isReleaseQualityApproved;
exports.skipQualityGate = skipQualityGate;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function registerQualityGate(input) {
    const gateId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_quality_gates (
      gate_id, gate_code, release_id, category, status,
      owner, pass_threshold, actual_value, notes, evaluated_at, created_at
    ) VALUES ($1,$2,$3,$4,'pending',$5,$6,NULL,NULL,NULL,$7)`, [gateId, input.gateCode, input.releaseId, input.category, input.owner, input.passThreshold ?? null, now]);
    return getQualityGate(gateId);
}
async function evaluateQualityGate(gateId, status, actualValue, notes) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_quality_gates
     SET status = $1, actual_value = $2, notes = $3, evaluated_at = $4
     WHERE gate_id = $5`, [status, actualValue ?? null, notes ?? null, now, gateId]);
    const gate = await getQualityGate(gateId);
    if (gate) {
        await (0, events_1.publish)('delivery.quality_gate.evaluated', 'platform', {
            gateId,
            gateCode: gate.gateCode,
            releaseId: gate.releaseId,
            status,
            actualValue,
        }, {});
    }
    return gate;
}
async function getQualityGate(gateId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_quality_gates WHERE gate_id = $1 LIMIT 1`, [gateId]);
    if (!result.rows[0])
        return null;
    return mapGateRow(result.rows[0]);
}
async function listQualityGatesByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_quality_gates WHERE release_id = $1 ORDER BY created_at`, [releaseId]);
    return result.rows.map(mapGateRow);
}
async function listFailingGates(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_quality_gates WHERE release_id = $1 AND status = 'failing' ORDER BY created_at`, [releaseId]);
    return result.rows.map(mapGateRow);
}
async function isReleaseQualityApproved(releaseId) {
    const gates = await listQualityGatesByRelease(releaseId);
    const failing = gates.filter((g) => g.status === 'failing');
    const pending = gates.filter((g) => g.status === 'pending');
    return {
        approved: failing.length === 0 && pending.length === 0 && gates.length > 0,
        failingGates: failing,
        pendingGates: pending,
    };
}
async function skipQualityGate(gateId, reason) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_quality_gates SET status = 'skipped', notes = $1, evaluated_at = $2 WHERE gate_id = $3`, [reason, now, gateId]);
}
function mapGateRow(row) {
    return {
        gateId: row.gate_id,
        gateCode: row.gate_code,
        releaseId: row.release_id,
        category: row.category,
        status: row.status,
        owner: row.owner,
        passThreshold: row.pass_threshold ?? null,
        actualValue: row.actual_value ?? null,
        notes: row.notes ?? null,
        evaluatedAt: row.evaluated_at ?? null,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=quality-gate.service.js.map
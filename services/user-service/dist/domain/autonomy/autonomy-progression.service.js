"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProgressionGates = getProgressionGates;
exports.evaluateAgentProgression = evaluateAgentProgression;
exports.enforceAutonomyGate = enforceAutonomyGate;
const db_1 = require("@dos/db");
const MODE_RANK = {
    manual: 0,
    human: 1,
    assisted: 2,
    copilot: 3,
    hybrid: 4,
    autonomous: 5,
    hyper: 6,
};
const DEFAULT_GATES = [
    {
        gateId: 'gate_01_trust_baseline',
        name: 'Trust Baseline',
        requiredMode: 'assisted',
        conditions: ['trust_score >= 50', 'no_critical_incidents_30d'],
    },
    {
        gateId: 'gate_02_copilot_eligible',
        name: 'Copilot Eligible',
        requiredMode: 'copilot',
        conditions: ['trust_score >= 65', 'human_override_rate < 0.3', 'min_30_actions'],
    },
    {
        gateId: 'gate_03_hybrid_mode',
        name: 'Hybrid Mode',
        requiredMode: 'hybrid',
        conditions: ['trust_score >= 75', 'human_override_rate < 0.15', 'min_100_actions'],
    },
    {
        gateId: 'gate_04_autonomous',
        name: 'Autonomous Mode',
        requiredMode: 'autonomous',
        conditions: ['trust_score >= 90', 'human_override_rate < 0.05', 'min_500_actions', 'admin_approval'],
    },
];
async function getProgressionGates(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let passedGateIds = [];
    try {
        const { rows } = await (0, db_1.safeQuery)(`SELECT gate_id, passed_at FROM "${schema}".agent_progression_gates
       WHERE agent_id = $1 AND passed = TRUE`, [agentId]);
        passedGateIds = rows.map(r => String(r['gate_id']));
    }
    catch { /* table may not exist */ }
    return DEFAULT_GATES.map(gate => ({
        ...gate,
        passed: passedGateIds.includes(gate.gateId),
        passedAt: null,
    }));
}
async function evaluateAgentProgression(tenantId, agentId, currentMode = 'manual') {
    const gates = await getProgressionGates(tenantId, agentId);
    const passedGates = [];
    const failedGates = [];
    const blockers = [];
    for (const gate of gates) {
        if (gate.passed) {
            passedGates.push(gate.gateId);
        }
        else {
            failedGates.push(gate.gateId);
            blockers.push(`Gate "${gate.name}" not passed — requires: ${gate.conditions.join(', ')}`);
        }
    }
    const passedModes = gates
        .filter(g => g.passed)
        .map(g => g.requiredMode)
        .sort((a, b) => MODE_RANK[b] - MODE_RANK[a]);
    const eligibleMode = passedModes.length > 0 ? passedModes[0] : 'manual';
    const canProgress = MODE_RANK[eligibleMode] > MODE_RANK[currentMode];
    return {
        agentId,
        tenantId,
        currentMode,
        eligibleMode,
        passedGates,
        failedGates,
        canProgress,
        blockers: canProgress ? [] : blockers,
    };
}
async function enforceAutonomyGate(tenantId, agentId, requiredMode, currentMode = 'manual') {
    if (MODE_RANK[currentMode] >= MODE_RANK[requiredMode]) {
        return { allowed: true, reason: 'Current mode meets requirement' };
    }
    const progression = await evaluateAgentProgression(tenantId, agentId, currentMode);
    if (MODE_RANK[progression.eligibleMode] >= MODE_RANK[requiredMode]) {
        return { allowed: true, reason: `Agent eligible for ${progression.eligibleMode} mode` };
    }
    return {
        allowed: false,
        reason: `Agent in "${currentMode}" mode — requires "${requiredMode}". Blockers: ${progression.blockers.join('; ')}`,
    };
}
//# sourceMappingURL=autonomy-progression.service.js.map
"use strict";
/**
 * DAuth — Agent-aware Segregation of Duties.
 *
 * Extends the existing sod-engine (role-pair + action-pair conflicts for
 * human actors) to non-human principals. When either proposer or approver
 * is an agent / service_account / external, we consult agent_sod_policies
 * for a tenant-scoped outcome, falling back to 'escalate' when no policy
 * matches.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAgentSod = evaluateAgentSod;
const db_1 = require("@dos/db");
const OUTCOME_ORDER = {
    allow: 0,
    warn: 1,
    escalate: 2,
    block: 3,
};
async function evaluateAgentSod(tenantId, proposer, approver, actionKey) {
    if (proposer.type === 'human' && approver.type === 'human') {
        return { allowed: true, outcome: 'allow', reason: 'both human — defer to sod-engine' };
    }
    if (proposer.id && approver.id && proposer.id === approver.id) {
        return {
            allowed: false,
            outcome: 'block',
            reason: 'self-approval forbidden (proposer.id === approver.id)',
        };
    }
    const matches = await (0, db_1.withTenantClient)(tenantId, async (client) => {
        const { rows } = await client.query(`SELECT policy_id, outcome, reason, action_key
       FROM agent_sod_policies
       WHERE tenant_id = $1
         AND proposer_type = $2
         AND approver_type = $3
         AND (action_key IS NULL OR action_key = $4)
       ORDER BY (action_key IS NULL) ASC, created_at DESC
       LIMIT 8`, [tenantId, proposer.type, approver.type, actionKey ?? null]);
        return rows;
    });
    if (matches.length === 0) {
        return {
            allowed: false,
            outcome: 'escalate',
            reason: `no agent_sod_policy for (${proposer.type} → ${approver.type})`,
        };
    }
    let chosen = matches[0];
    for (const m of matches.slice(1)) {
        if (OUTCOME_ORDER[m.outcome] > OUTCOME_ORDER[chosen.outcome])
            chosen = m;
    }
    return {
        allowed: chosen.outcome === 'allow',
        outcome: chosen.outcome,
        reason: chosen.reason ?? undefined,
        policyId: chosen.policy_id,
    };
}
//# sourceMappingURL=agent-sod-engine.js.map
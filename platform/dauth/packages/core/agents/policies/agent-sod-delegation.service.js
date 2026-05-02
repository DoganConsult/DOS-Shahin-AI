"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAgentSodDelegation = checkAgentSodDelegation;
const db_1 = require("@dos/db");
async function checkAgentSodDelegation(input) {
    const isApproval = input.actionType.toLowerCase().includes("approve") ||
        ((input.requiredPermissions ?? []).some((p) => p.toLowerCase().includes(".approve")));
    if (!isApproval)
        return { allowed: true };
    const entityType = input.entityType;
    const entityId = input.entityId ?? null;
    if (!entityType || !entityId)
        return { allowed: true };
    const schema = (0, db_1.tenantSchema)(input.tenantId);
    const prior = await (0, db_1.safeQuery)(`SELECT action_id
       FROM "${schema}".delegation_actions
      WHERE tenant_id = $1
        AND user_id = $2
        AND entity_type = $3
        AND entity_id = $4
        AND result = 'success'
        AND action_type LIKE 'copilot.%'
        AND action_type NOT ILIKE '%approve%'
      ORDER BY executed_at DESC
      LIMIT 1`, [input.tenantId, input.principalId, entityType, entityId]);
    if (prior.rows.length > 0) {
        return { allowed: false, reason: "delegated_self_approval_prevented" };
    }
    return { allowed: true };
}
//# sourceMappingURL=agent-sod-delegation.service.js.map

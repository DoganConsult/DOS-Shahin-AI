"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrgProfile = getOrgProfile;
exports.updateOrgProfile = updateOrgProfile;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
async function getOrgProfile(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".workspace_profile LIMIT 1`);
        return rows[0] ?? null;
    }
    catch {
        logger_port_1.logger.warn(`[OrgProfileEngine] workspace_profile not available for tenant ${tenantId}`);
        return null;
    }
}
async function updateOrgProfile(tenantId, updates) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const keys = Object.keys(updates);
    if (keys.length === 0)
        return null;
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".workspace_profile SET ${sets}, updated_at = NOW() RETURNING *`, Object.values(updates));
    return rows[0] ?? null;
}
//# sourceMappingURL=org-profile-engine.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAgentTrustScore = computeAgentTrustScore;
exports.getAgentProfile = getAgentProfile;
exports.listAgentProfiles = listAgentProfiles;
exports.upsertAgentProfile = upsertAgentProfile;
const db_1 = require("@dos/db");
function mapAgentRow(row) {
    return {
        agentId: String(row['agent_id'] ?? row['agentId']),
        tenantId: String(row['tenant_id'] ?? row['tenantId']),
        name: String(row['name'] ?? ''),
        description: row['description'] != null ? String(row['description']) : null,
        capabilities: Array.isArray(row['capabilities']) ? row['capabilities'] : [],
        trustScore: Number(row['trust_score'] ?? row['trustScore'] ?? 0),
        status: row['status'] ?? 'active',
        metadata: row['metadata'] ?? {},
        createdAt: String(row['created_at'] ?? row['createdAt'] ?? ''),
        updatedAt: String(row['updated_at'] ?? row['updatedAt'] ?? ''),
    };
}
function computeAgentTrustScore(profile) {
    let score = 50;
    score += Math.min(profile.capabilities.length * 5, 30);
    if (profile.status === 'active')
        score += 20;
    if (profile.status === 'suspended')
        score -= 30;
    if (profile.metadata['verified'])
        score += 10;
    return Math.max(0, Math.min(100, score));
}
async function getAgentProfile(tenantId, agentId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".agent_profiles WHERE agent_id = $1 LIMIT 1`, [agentId]);
    return rows.length > 0 ? mapAgentRow(rows[0]) : null;
}
async function listAgentProfiles(tenantId, filters = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".agent_profiles WHERE 1=1`;
    const params = [];
    if (filters.status) {
        params.push(filters.status);
        sql += ` AND status = $${params.length}`;
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await (0, db_1.safeQuery)(sql, params);
    return rows.map(mapAgentRow);
}
async function upsertAgentProfile(tenantId, input) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".agent_profiles
       (agent_id, name, description, capabilities, status, metadata)
     VALUES ($1, $2, $3, $4::text[], $5, $6::jsonb)
     ON CONFLICT (agent_id) DO UPDATE
       SET name = EXCLUDED.name,
           description = EXCLUDED.description,
           capabilities = EXCLUDED.capabilities,
           status = EXCLUDED.status,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()
     RETURNING *`, [
        input.agentId,
        input.name,
        input.description ?? null,
        input.capabilities ?? [],
        input.status ?? 'active',
        JSON.stringify(input.metadata ?? {}),
    ]);
    if (!rows[0])
        throw new Error(`[upsertAgentProfile] no row returned for agent ${input.agentId}`);
    return mapAgentRow(rows[0]);
}
//# sourceMappingURL=agent-actor-profile.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCompetencies = getUserCompetencies;
exports.checkCompetency = checkCompetency;
exports.addCompetency = addCompetency;
const db_1 = require("@dos/db");
async function getUserCompetencies(tenantId, userId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".user_competencies
     WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY competency_code`, [userId]);
    return rows.map(row => ({
        competencyId: String(row['competency_id']),
        userId,
        tenantId,
        competencyCode: String(row['competency_code']),
        level: row['level'] ?? 'beginner',
        verifiedAt: row['verified_at'] != null ? String(row['verified_at']) : null,
        verifiedBy: row['verified_by'] != null ? String(row['verified_by']) : null,
        expiresAt: row['expires_at'] != null ? String(row['expires_at']) : null,
        metadata: row['metadata'] ?? {},
        createdAt: String(row['created_at'] ?? ''),
    }));
}
async function checkCompetency(tenantId, userId, competencyCode, requiredLevel) {
    const competencies = await getUserCompetencies(tenantId, userId);
    const match = competencies.find(c => c.competencyCode === competencyCode);
    if (!match)
        return false;
    if (!requiredLevel)
        return true;
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    return levels.indexOf(match.level) >= levels.indexOf(requiredLevel);
}
async function addCompetency(tenantId, userId, input) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".user_competencies
       (user_id, competency_code, level, verified_by, expires_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (user_id, competency_code) DO UPDATE
       SET level = EXCLUDED.level,
           verified_by = EXCLUDED.verified_by,
           verified_at = NOW(),
           expires_at = EXCLUDED.expires_at,
           metadata = EXCLUDED.metadata
     RETURNING *`, [
        userId,
        input.competencyCode,
        input.level,
        input.verifiedBy ?? null,
        input.expiresAt ?? null,
        JSON.stringify(input.metadata ?? {}),
    ]);
    if (!rows[0])
        throw new Error(`[addCompetency] no row returned`);
    const row = rows[0];
    return {
        competencyId: String(row['competency_id']),
        userId,
        tenantId,
        competencyCode: String(row['competency_code']),
        level: row['level'] ?? input.level,
        verifiedAt: row['verified_at'] != null ? String(row['verified_at']) : null,
        verifiedBy: row['verified_by'] != null ? String(row['verified_by']) : null,
        expiresAt: row['expires_at'] != null ? String(row['expires_at']) : null,
        metadata: row['metadata'] ?? {},
        createdAt: String(row['created_at'] ?? new Date().toISOString()),
    };
}
//# sourceMappingURL=user-competency.service.js.map
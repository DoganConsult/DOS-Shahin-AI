"use strict";
// ============================================
// Asset Classification Service
// Classification definitions + asset assignment
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClassifications = listClassifications;
exports.getClassificationById = getClassificationById;
exports.createClassification = createClassification;
exports.updateClassification = updateClassification;
exports.classifyAsset = classifyAsset;
exports.getClassificationDistribution = getClassificationDistribution;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const resilience_1 = require("@dos/platform-core/resilience");
async function listClassifications(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${ts}".asset_classifications ORDER BY level`);
    return rows;
}
async function getClassificationById(tenantId, id) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT * FROM "${ts}".asset_classifications WHERE classification_id = $1`, [id]);
    return rows[0] || null;
}
async function createClassification(tenantId, input) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    INSERT INTO "${ts}".asset_classifications (
      code, name_en, name_ar, description, level, color,
      handling_requirements, retention_period_days, requires_encryption, requires_dlp
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [
        input.code, input.name_en, input.name_ar || '', input.description || '',
        input.level, input.color || null, input.handling_requirements || null,
        input.retention_period_days || null, input.requires_encryption ?? false, input.requires_dlp ?? false,
    ]);
    return rows[0];
}
async function updateClassification(tenantId, id, updates) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = ['code', 'name_en', 'name_ar', 'description', 'level', 'color', 'handling_requirements', 'retention_period_days', 'requires_encryption', 'requires_dlp'];
    const cols = Object.keys(updates).filter(k => allowed.includes(k));
    if (!cols.length)
        return null;
    const sets = cols.map((c, i) => `${c} = $${i + 2}`);
    const vals = cols.map(c => updates[c]);
    const { rows } = await (0, database_port_1.safeQuery)(`UPDATE "${ts}".asset_classifications SET ${sets.join(', ')}, updated_at = NOW() WHERE classification_id = $1 RETURNING *`, [id, ...vals]);
    return rows[0] || null;
}
async function classifyAsset(tenantId, userId, assetId, classificationId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    UPDATE "${ts}".assets SET data_classification_id = $2, updated_at = NOW()
    WHERE asset_id = $1 AND deleted_at IS NULL RETURNING asset_id, data_classification_id
  `, [assetId, classificationId]);
    if (rows[0]) {
        (0, events_port_1.emitEvent)({
            tenantId, userId, module: 'asset', event: 'asset_classified',
            entityType: 'asset', entityId: assetId,
            data: { classificationId },
        }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    return rows[0] || null;
}
async function getClassificationDistribution(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT
      c.code, c.name_en, c.level, c.color,
      COUNT(a.asset_id)::int AS asset_count
    FROM "${ts}".asset_classifications c
    LEFT JOIN "${ts}".assets a ON a.data_classification_id = c.classification_id AND a.deleted_at IS NULL
    GROUP BY c.classification_id, c.code, c.name_en, c.level, c.color
    ORDER BY c.level
  `);
    return rows;
}
//# sourceMappingURL=asset-classification.service.js.map
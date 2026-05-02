"use strict";
// ============================================
// Asset Criticality Service
// CIA-triad composite scoring, auto-inference
// from dependency chains + linked risks
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCriticality = computeCriticality;
exports.bulkComputeCriticality = bulkComputeCriticality;
exports.getCriticalAssets = getCriticalAssets;
const database_port_1 = require("../ports/database.port");
function scoreToCriticality(score) {
    if (score >= 4.0)
        return 'critical';
    if (score >= 3.0)
        return 'high';
    if (score >= 2.0)
        return 'medium';
    return 'low';
}
async function computeCriticality(tenantId, assetId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows: assetRows } = await (0, database_port_1.safeQuery)(`
    SELECT asset_id, name, cia_confidentiality, cia_integrity, cia_availability
    FROM "${ts}".assets WHERE asset_id = $1 AND deleted_at IS NULL
  `, [assetId]);
    if (!assetRows[0])
        return null;
    const a = assetRows[0];
    const ciaC = a.cia_confidentiality || 3;
    const ciaI = a.cia_integrity || 3;
    const ciaA = a.cia_availability || 3;
    const ciaComposite = (ciaC + ciaI + ciaA) / 3;
    // Dependency fan-out (how many things depend on this asset)
    const { rows: depRows } = await (0, database_port_1.safeQuery)(`
    SELECT COUNT(*)::int AS fan_out
    FROM "${ts}".asset_dependencies
    WHERE target_type = 'asset' AND target_id = $1 AND deleted_at IS NULL
  `, [assetId]);
    const fanOut = depRows[0]?.fan_out || 0;
    const depScore = Math.min(5, 1 + fanOut * 0.5);
    // Average linked risk score
    const { rows: riskRows } = await (0, database_port_1.safeQuery)(`
    SELECT AVG(r.inherent_score)::numeric(5,2) AS avg_risk
    FROM "${ts}".risk_asset_links ral
    JOIN "${ts}".risks r ON r.risk_id = ral.risk_id
    WHERE ral.asset_id = $1
  `, [assetId]);
    const linkedRiskScore = parseFloat(riskRows[0]?.avg_risk) || 0;
    const normalizedRisk = Math.min(5, linkedRiskScore / 5);
    // Final composite: 50% CIA + 25% dependency + 25% risk
    const finalScore = ciaComposite * 0.5 + depScore * 0.25 + normalizedRisk * 0.25;
    return {
        asset_id: a.asset_id,
        name: a.name,
        cia_confidentiality: ciaC,
        cia_integrity: ciaI,
        cia_availability: ciaA,
        cia_composite: Math.round(ciaComposite * 100) / 100,
        dependency_fan_out: fanOut,
        linked_risk_score: linkedRiskScore,
        final_score: Math.round(finalScore * 100) / 100,
        criticality_label: scoreToCriticality(finalScore),
    };
}
async function bulkComputeCriticality(tenantId) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const { rows } = await (0, database_port_1.safeQuery)(`SELECT asset_id FROM "${ts}".assets WHERE deleted_at IS NULL ORDER BY created_at`);
    const results = [];
    for (const { asset_id } of rows) {
        const r = await computeCriticality(tenantId, asset_id);
        if (r) {
            // Update the stored criticality and scores
            await (0, database_port_1.safeQuery)(`
        UPDATE "${ts}".assets
        SET criticality = $2, compliance_score = $3, risk_score = $4, updated_at = NOW()
        WHERE asset_id = $1
      `, [asset_id, r.criticality_label, r.cia_composite, r.final_score]);
            results.push(r);
        }
    }
    return results;
}
async function getCriticalAssets(tenantId, page = 1, pageSize = 25) {
    const ts = (0, database_port_1.tenantSchema)(tenantId);
    const offset = (page - 1) * pageSize;
    const countR = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${ts}".assets WHERE deleted_at IS NULL AND criticality IN ('critical','high')`, []);
    const total = countR.rows[0]?.total || 0;
    const { rows } = await (0, database_port_1.safeQuery)(`
    SELECT a.*, o.owner_user_id AS primary_owner
    FROM "${ts}".assets a
    LEFT JOIN "${ts}".asset_owners o ON o.entity_type = 'asset' AND o.entity_id = a.asset_id AND o.owner_type = 'business_owner' AND o.revoked_at IS NULL
    WHERE a.deleted_at IS NULL AND a.criticality IN ('critical','high')
    ORDER BY CASE a.criticality WHEN 'critical' THEN 0 ELSE 1 END, a.name
    LIMIT $1 OFFSET $2
  `, [pageSize, offset]);
    return { data: rows, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
//# sourceMappingURL=asset-criticality.service.js.map
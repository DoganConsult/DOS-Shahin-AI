"use strict";
// ============================================
// Shahin — Scoring Policy Service
// CRUD for scoring policies and weighted
// assessment score recalculation
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.createScoringPolicy = createScoringPolicy;
exports.getScoringPolicies = getScoringPolicies;
exports.getScoringPolicyById = getScoringPolicyById;
exports.updateScoringPolicy = updateScoringPolicy;
exports.deleteScoringPolicy = deleteScoringPolicy;
exports.calculateWeightedScorePure = calculateWeightedScorePure;
exports.applyPolicy = applyPolicy;
const uuid_1 = require("uuid");
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
// === Scoring Policy CRUD ===
async function createScoringPolicy(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const policyId = (0, uuid_1.v4)();
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".scoring_policies
      (policy_id, name, weights, is_default)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [policyId, data.name, JSON.stringify(data.weights), data.is_default ?? false]);
    return (0, db_1.getFirstRow)(result);
}
async function getScoringPolicies(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".scoring_policies ORDER BY created_at DESC`);
    return result.rows;
}
async function getScoringPolicyById(tenantId, policyId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".scoring_policies WHERE policy_id = $1`, [policyId]);
    return (0, db_1.getFirstRow)(result) || null;
}
async function updateScoringPolicy(tenantId, policyId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const fields = [];
    const params = [policyId];
    let idx = 2;
    if (data.name !== undefined) {
        fields.push(`name = $${idx++}`);
        params.push(data.name);
    }
    if (data.weights !== undefined) {
        fields.push(`weights = $${idx++}::jsonb`);
        params.push(JSON.stringify(data.weights));
    }
    if (data.is_default !== undefined) {
        fields.push(`is_default = $${idx++}`);
        params.push(data.is_default);
    }
    if (fields.length === 0)
        return undefined;
    fields.push(`updated_at = NOW()`);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".scoring_policies SET ${fields.join(', ')} WHERE policy_id = $1 RETURNING *`, params);
    return result.rows[0];
}
async function deleteScoringPolicy(tenantId, policyId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`DELETE FROM "${schema}".scoring_policies WHERE policy_id = $1 RETURNING policy_id`, [policyId]);
    return result.rows.length > 0;
}
// === Weighted Score Calculation ===
/**
 * Pure function: calculates a weighted assessment score from items and policy weights.
 *
 * Each item has a `control_node_id` (used to look up its category) and a `status`.
 * `categoryMap` maps control_node_id → category name.
 * `weights` maps category name → weight decimal.
 *
 * For each category present in weights:
 *   categoryScore = (compliant * 1.0 + partially_compliant * 0.5) / applicable
 * Final score = sum(categoryScore * weight) / sum(weights) * 100
 *
 * Items whose category is not in the weights map are ignored.
 * Returns 0 when there are no applicable items or no matching weights.
 */
function calculateWeightedScorePure(items, categoryMap, weights) {
    // Group items by category
    const byCategory = {};
    for (const item of items) {
        const category = categoryMap[item.control_node_id];
        if (category && weights[category] !== undefined) {
            if (!byCategory[category])
                byCategory[category] = [];
            byCategory[category].push(item);
        }
    }
    let weightedSum = 0;
    let totalWeight = 0;
    for (const [category, catItems] of Object.entries(byCategory)) {
        const applicable = catItems.filter((i) => i.status !== "not_applicable");
        if (applicable.length === 0)
            continue;
        const compliant = applicable.filter((i) => i.status === "compliant").length;
        const partial = applicable.filter((i) => i.status === "partially_compliant").length;
        const categoryScore = (compliant * 1.0 + partial * 0.5) / applicable.length;
        const weight = weights[category];
        weightedSum += categoryScore * weight;
        totalWeight += weight;
    }
    if (totalWeight === 0)
        return 0;
    return (weightedSum / totalWeight) * 100;
}
/**
 * Applies a scoring policy to an assessment:
 * 1. Fetches the scoring policy weights
 * 2. Fetches all assessment items
 * 3. Builds a category map from control_node_id → category (using instrument_structure)
 * 4. Calculates the weighted score
 * 5. Updates the assessment's score field
 * 6. Returns the new score
 */
async function applyPolicy(tenantId, assessmentId, policyId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const policyRes = await (0, database_port_1.safeQuery)(`SELECT weights FROM "${schema}".scoring_policies WHERE policy_id = $1`, [policyId]);
    const policy = policyRes.rows[0];
    if (!policy)
        return 0;
    const weights = typeof policy.weights === 'string'
        ? JSON.parse(policy.weights)
        : (policy.weights || {});
    const itemsRes = await (0, database_port_1.safeQuery)(`SELECT ai.control_node_id, ai.status
     FROM "${schema}".compliance_assessment_items ai
     WHERE ai.assessment_id = $1`, [assessmentId]);
    const categoryMapRes = await (0, database_port_1.safeQuery)(`SELECT node_id, category FROM instrument_structure WHERE node_id = ANY($1::text[])`, [itemsRes.rows.map((r) => r.control_node_id)]);
    const categoryMap = {};
    for (const row of categoryMapRes.rows) {
        categoryMap[row.node_id] = row.category;
    }
    const score = calculateWeightedScorePure(itemsRes.rows, categoryMap, weights);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".compliance_assessments SET score = $2, updated_at = NOW() WHERE assessment_id = $1`, [assessmentId, score]);
    return score;
}
//# sourceMappingURL=scoring-policy.service.js.map
// ============================================
// Quantum Readiness Service — Phase 8, Step 8.1
// CNSA 2.0, NIST FIPS 203/204/205, ETSI QSC
// ============================================
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
const QUANTUM_VULNERABLE_ALGORITHMS = [
    'rsa', 'ecdsa', 'ecdh', 'dh', 'dsa', 'eddsa', 'ed25519', 'ed448',
    'p-256', 'p-384', 'p-521', 'secp256k1', 'x25519', 'x448',
];
function computeHndlRisk(dataSensitivity) {
    switch (dataSensitivity) {
        case 'restricted': return 'critical';
        case 'confidential': return 'high';
        case 'internal': return 'medium';
        case 'public': return 'low';
        default: return 'none';
    }
}
// 1. inventoryCryptoAsset
export async function inventoryCryptoAsset(tenantId, asset) {
    const schema = tenantSchema(tenantId);
    const alg = (asset.algorithm ?? '').toLowerCase();
    const isVulnerable = QUANTUM_VULNERABLE_ALGORITHMS.some(v => alg.includes(v));
    const hndlRisk = isVulnerable ? computeHndlRisk(asset.data_sensitivity) : 'none';
    const { rows } = await safeQuery(`INSERT INTO "${schema}".cryptographic_inventory
       (asset_name, asset_type, algorithm, key_length, protocol_version,
        location, system_name, owner, is_quantum_vulnerable,
        hndl_risk_level, data_sensitivity, expiry_date,
        renewal_required, migration_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`, [
        asset.asset_name, asset.asset_type ?? 'algorithm', asset.algorithm,
        asset.key_length ?? null, asset.protocol_version ?? null,
        asset.location ?? null, asset.system_name ?? null, asset.owner ?? null,
        isVulnerable, hndlRisk, asset.data_sensitivity ?? null,
        asset.expiry_date ?? null, asset.renewal_required ?? false,
        'not_started',
    ]);
    return { id: rows[0].id, is_quantum_vulnerable: isVulnerable, hndl_risk_level: hndlRisk };
}
// 2. assessVulnerability
export async function assessVulnerability(tenantId, assetId) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
// 3. createMigrationPlan
export async function createMigrationPlan(tenantId, plan) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".quantum_migration_plans
       (plan_code, name_en, name_ar, phase, target_assets, priority,
        target_algorithm, target_completion, milestones, risks,
        budget_allocated, responsible, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id`, [
        plan.plan_code, plan.name_en, plan.name_ar ?? null,
        plan.phase ?? 'inventory', plan.target_assets ?? [],
        plan.priority ?? 'medium', plan.target_algorithm ?? null,
        plan.target_completion ?? null, JSON.stringify(plan.milestones ?? []),
        JSON.stringify(plan.risks ?? []), plan.budget_allocated ?? null,
        plan.responsible ?? null, 'draft',
    ]);
    return { id: rows[0].id };
}
// 4. recordPqcTestResult
export async function recordPqcTestResult(tenantId, result) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`INSERT INTO "${schema}".pqc_test_results
       (plan_id, asset_id, test_type, algorithm_tested, test_date,
        result, performance_impact_pct, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`, [
        result.plan_id ?? null, result.asset_id ?? null,
        result.test_type ?? 'compatibility', result.algorithm_tested,
        result.test_date ?? new Date().toISOString().split('T')[0],
        result.result ?? 'inconclusive', result.performance_impact_pct ?? null,
        result.notes ?? null,
    ]);
    return { id: rows[0].id };
}
// 5. listCryptoAssets
export async function listCryptoAssets(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters?.is_quantum_vulnerable !== undefined) {
        conditions.push(`is_quantum_vulnerable = $${idx++}`);
        params.push(filters.is_quantum_vulnerable);
    }
    if (filters?.hndl_risk_level) {
        conditions.push(`hndl_risk_level = $${idx++}`);
        params.push(filters.hndl_risk_level);
    }
    if (filters?.migration_status) {
        conditions.push(`migration_status = $${idx++}`);
        params.push(filters.migration_status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".cryptographic_inventory ${where} ORDER BY created_at DESC LIMIT 200`, params);
    return rows;
}
// 6. getCryptoAssetById
export async function getCryptoAssetById(tenantId, assetId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".cryptographic_inventory WHERE id = $1`, [assetId]);
    return rows[0] ?? null;
}
// 7. listMigrationPlans
export async function listMigrationPlans(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters?.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    if (filters?.priority) {
        conditions.push(`priority = $${idx++}`);
        params.push(filters.priority);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".quantum_migration_plans ${where} ORDER BY created_at DESC LIMIT 100`, params);
    return rows;
}
// 8. getMigrationPlanById
export async function getMigrationPlanById(tenantId, planId) {
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".quantum_migration_plans WHERE id = $1`, [planId]);
    return rows[0] ?? null;
}
// 9. listPqcTestResults
export async function listPqcTestResults(tenantId, filters) {
    const schema = tenantSchema(tenantId);
    const conditions = [];
    const params = [];
    let idx = 1;
    if (filters?.plan_id) {
        conditions.push(`plan_id = $${idx++}`);
        params.push(filters.plan_id);
    }
    if (filters?.asset_id) {
        conditions.push(`asset_id = $${idx++}`);
        params.push(filters.asset_id);
    }
    if (filters?.result) {
        conditions.push(`result = $${idx++}`);
        params.push(filters.result);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await safeQuery(`SELECT * FROM "${schema}".pqc_test_results ${where} ORDER BY test_date DESC LIMIT 100`, params);
    return rows;
}
// 10. getQuantumReadinessDashboard
export async function getQuantumReadinessDashboard(tenantId) {
    const schema = tenantSchema(tenantId);
    const [assets, vulnerable, migrationProgress, plans] = await Promise.all([
        safeQuery(`SELECT count(*) as total FROM "${schema}".cryptographic_inventory`),
        safeQuery(`SELECT count(*) as total, hndl_risk_level
       FROM "${schema}".cryptographic_inventory
       WHERE is_quantum_vulnerable = TRUE
       GROUP BY hndl_risk_level`),
        safeQuery(`SELECT migration_status, count(*) as total
       FROM "${schema}".cryptographic_inventory
       GROUP BY migration_status`),
        safeQuery(`SELECT status, count(*) as total
       FROM "${schema}".quantum_migration_plans
       GROUP BY status`),
    ]);
    return {
        total_assets: parseInt(assets.rows[0]?.total ?? '0'),
        vulnerable_by_risk: vulnerable.rows,
        migration_progress: migrationProgress.rows,
        plans_by_status: plans.rows,
    };
}
//# sourceMappingURL=quantum-readiness.service.js.map
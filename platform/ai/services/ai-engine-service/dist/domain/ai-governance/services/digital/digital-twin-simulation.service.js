// ============================================
// Shahin -- Digital Twin Simulation Service
// CRUD lifecycle for compliance state simulations
// ============================================
import { query, safeQuery, tenantSchema } from '../../ports/database.port.js';
import { getFirstRow } from '@dos/db';
export async function createSimulation(tenantId, createdBy, options = {}) {
    const schema = tenantSchema(tenantId);
    // Snapshot current compliance state
    const [risks, controls, policies, frameworks] = await Promise.all([
        query(`SELECT * FROM "${schema}".risks`),
        query(`SELECT * FROM "${schema}".controls`),
        query(`SELECT * FROM "${schema}".policies`),
        query(`SELECT * FROM "${schema}".frameworks`),
    ]);
    // Optionally include org structure
    let orgStructure = null;
    if (options.includeOrgStructure) {
        try {
            const orgResult = await safeQuery(`SELECT * FROM "${schema}".organization_units ORDER BY parent_unit_id NULLS FIRST`, []);
            orgStructure = orgResult.rows;
        }
        catch {
            // Org structure table may not exist, ignore
        }
    }
    // Optionally include entity dependencies/links
    let entityLinks = [];
    if (options.includeDependencies) {
        try {
            const linksResult = await safeQuery(`SELECT * FROM "${schema}".entity_links WHERE tenant_id = $1`, [tenantId]);
            entityLinks = linksResult.rows;
        }
        catch {
            // Entity links table may not exist, ignore
        }
    }
    const snapshot = {
        risks: risks.rows,
        controls: controls.rows,
        policies: policies.rows,
        frameworks: frameworks.rows,
        orgStructure: orgStructure || null,
        entityLinks: entityLinks,
        snapshotAt: new Date().toISOString(),
    };
    const result = await safeQuery(`INSERT INTO "${schema}".simulations (source_snapshot, created_by)
     VALUES ($1, $2) RETURNING *`, [JSON.stringify(snapshot), createdBy]);
    return getFirstRow(result);
}
export async function discardSimulation(tenantId, simulationId) {
    await safeQuery("UPDATE __TENANT_SCHEMA__.ai_governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return {};
}
export async function getSimulations(tenantId) {
    const schema = tenantSchema(tenantId);
    const result = await safeQuery(`SELECT simulation_id, status, changes_applied, impact_projection, scenario_name, created_by, created_at
     FROM "${schema}".simulations ORDER BY created_at DESC`);
    return result.rows;
}
/**
 * Get simulation with detailed impact analysis
 */
export async function getSimulationWithImpact(tenantId, simulationId) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
//# sourceMappingURL=digital-twin-simulation.service.js.map
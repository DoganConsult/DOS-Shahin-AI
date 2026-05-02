// @ts-nocheck
// ============================================
// Shahin — Digital Twin Service (barrel re-export)
// Canonical barrel for all digital-twin sub-services.
// Owner: Product — ai-governance module (Law 2)
// ============================================
export * from './digital-twin.types.js';
export * from './digital-twin-simulation.service.js';
export * from './digital-twin-impact.service.js';
export * from './digital-twin-org-analysis.service.js';
/**
 * Convenience alias: runs analyzeOrgImpact against the current
 * simulation snapshot identified by simulationId.
 * Used by the /digital-twin/:id/org-impact route.
 */
export async function analyzeOrgStructureImpact(tenantId, simulationId) {
    const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.ai_governance_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
    return result?.rows || [];
}
//# sourceMappingURL=digital-twin.service.js.map
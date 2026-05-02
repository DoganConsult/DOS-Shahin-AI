"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFoundationDiagnostics = getFoundationDiagnostics;
const database_port_1 = require("../../ports/database.port");
const database_port_2 = require("../../ports/database.port");
async function getFoundationDiagnostics(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const warnings = [];
    const errors = [];
    const hierarchyHealth = await getHierarchyHealth(schema, warnings, errors);
    const ownershipHealth = await getOwnershipHealth(schema, warnings, errors);
    return {
        tenantId,
        generatedAt: new Date().toISOString(),
        hierarchyHealth,
        ownershipHealth,
        warnings,
        errors,
    };
}
async function getHierarchyHealth(schema, warnings, errors) {
    let totalNodes = 0, orphanedNodes = 0, duplicateCodes = 0, maxDepth = 0;
    try {
        const stats = await (0, database_port_1.safeQuery)(`
      SELECT COUNT(*)::int AS total, COALESCE(MAX(level), 0)::int AS max_depth
      FROM "${schema}".organizations WHERE deleted_at IS NULL
    `);
        const row = (0, database_port_2.getFirstRow)(stats);
        totalNodes = row?.total ?? 0;
        maxDepth = row?.max_depth ?? 0;
    }
    catch {
        errors.push('organizations table inaccessible');
    }
    try {
        const orphans = await (0, database_port_1.safeQuery)(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND parent_id IS NOT NULL
        AND parent_id NOT IN (SELECT id FROM "${schema}".organizations WHERE deleted_at IS NULL)
    `);
        orphanedNodes = (0, database_port_2.getFirstRow)(orphans)?.total ?? 0;
        if (orphanedNodes > 0)
            warnings.push(`${orphanedNodes} orphaned node(s) found`);
    }
    catch {
        warnings.push('Could not check orphaned nodes');
    }
    try {
        const dupes = await (0, database_port_1.safeQuery)(`
      SELECT COUNT(*)::int AS total FROM (
        SELECT code FROM "${schema}".organizations WHERE deleted_at IS NULL GROUP BY code, entity_type HAVING COUNT(*) > 1
      ) d
    `);
        duplicateCodes = (0, database_port_2.getFirstRow)(dupes)?.total ?? 0;
        if (duplicateCodes > 0)
            warnings.push(`${duplicateCodes} duplicate code(s) found`);
    }
    catch {
        warnings.push('Could not check duplicate codes');
    }
    return { totalNodes, orphanedNodes, duplicateCodes, maxDepth };
}
async function getOwnershipHealth(schema, warnings, _errors) {
    let nodesWithoutOwner = 0, suspendedNodes = 0;
    try {
        const noOwner = await (0, database_port_1.safeQuery)(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND (owner_id IS NULL OR owner_id = '')
    `);
        nodesWithoutOwner = (0, database_port_2.getFirstRow)(noOwner)?.total ?? 0;
        if (nodesWithoutOwner > 0)
            warnings.push(`${nodesWithoutOwner} node(s) have no owner`);
    }
    catch {
        warnings.push('Could not check ownerless nodes');
    }
    try {
        const suspended = await (0, database_port_1.safeQuery)(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND status = 'suspended'
    `);
        suspendedNodes = (0, database_port_2.getFirstRow)(suspended)?.total ?? 0;
        if (suspendedNodes > 0)
            warnings.push(`${suspendedNodes} node(s) are suspended`);
    }
    catch {
        warnings.push('Could not check suspended nodes');
    }
    return { nodesWithoutOwner, suspendedNodes };
}
//# sourceMappingURL=foundation-diagnostics.service.js.map
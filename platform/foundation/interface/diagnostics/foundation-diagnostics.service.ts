import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '../../ports/database.port';
import type { FoundationDiagnosticsContract } from '../../contracts/foundation.contract';

export async function getFoundationDiagnostics(tenantId: string): Promise<FoundationDiagnosticsContract> {
  const schema = tenantSchema(tenantId);
  const warnings: string[] = [];
  const errors: string[] = [];

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

async function getHierarchyHealth(schema: string, warnings: string[], errors: string[]): Promise<FoundationDiagnosticsContract['hierarchyHealth']> {
  let totalNodes = 0, orphanedNodes = 0, duplicateCodes = 0, maxDepth = 0;
  try {
    const stats = await safeQuery(`
      SELECT COUNT(*)::int AS total, COALESCE(MAX(level), 0)::int AS max_depth
      FROM "${schema}".organizations WHERE deleted_at IS NULL
    `);
    const row = getFirstRow(stats);
    totalNodes = row?.total ?? 0;
    maxDepth = row?.max_depth ?? 0;
  } catch {
    errors.push('organizations table inaccessible');
  }
  try {
    const orphans = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND parent_id IS NOT NULL
        AND parent_id NOT IN (SELECT id FROM "${schema}".organizations WHERE deleted_at IS NULL)
    `);
    orphanedNodes = getFirstRow(orphans)?.total ?? 0;
    if (orphanedNodes > 0) warnings.push(`${orphanedNodes} orphaned node(s) found`);
  } catch { warnings.push('Could not check orphaned nodes'); }
  try {
    const dupes = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM (
        SELECT code FROM "${schema}".organizations WHERE deleted_at IS NULL GROUP BY code, entity_type HAVING COUNT(*) > 1
      ) d
    `);
    duplicateCodes = getFirstRow(dupes)?.total ?? 0;
    if (duplicateCodes > 0) warnings.push(`${duplicateCodes} duplicate code(s) found`);
  } catch { warnings.push('Could not check duplicate codes'); }
  return { totalNodes, orphanedNodes, duplicateCodes, maxDepth };
}

async function getOwnershipHealth(schema: string, warnings: string[], _errors: string[]): Promise<FoundationDiagnosticsContract['ownershipHealth']> {
  let nodesWithoutOwner = 0, suspendedNodes = 0;
  try {
    const noOwner = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND (owner_id IS NULL OR owner_id = '')
    `);
    nodesWithoutOwner = getFirstRow(noOwner)?.total ?? 0;
    if (nodesWithoutOwner > 0) warnings.push(`${nodesWithoutOwner} node(s) have no owner`);
  } catch { warnings.push('Could not check ownerless nodes'); }
  try {
    const suspended = await safeQuery(`
      SELECT COUNT(*)::int AS total FROM "${schema}".organizations
      WHERE deleted_at IS NULL AND status = 'suspended'
    `);
    suspendedNodes = getFirstRow(suspended)?.total ?? 0;
    if (suspendedNodes > 0) warnings.push(`${suspendedNodes} node(s) are suspended`);
  } catch { warnings.push('Could not check suspended nodes'); }
  return { nodesWithoutOwner, suspendedNodes };
}

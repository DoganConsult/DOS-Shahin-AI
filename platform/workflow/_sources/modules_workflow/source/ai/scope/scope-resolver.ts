/**
 * DAuth ScopeResolver — resolves effective scope from Foundation entities.
 * §2.9: DAuth resolves effective scope from canonical sources only.
 *
 * Canonical hierarchy (AGENTS.md Patch 3 §2.9):
 * Tenant -> Organization -> Business Unit -> Department -> Section -> Team -> Position -> Actor/User
 *
 * Scope inheritance:
 *   - tenant scope -> all orgs, BUs, depts, sections, teams, positions
 *   - organization scope -> all BUs, depts, sections, teams under that org
 *   - businessUnit scope -> all depts, sections, teams under that BU
 *   - department scope -> all child depts (sections), teams under that dept
 *   - team scope -> team only
 *   - position scope -> position and subordinate positions
 */
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';

/* ---------- Typed scope structures ---------- */

export interface EffectiveScope {
  tenantId: string;
  organizationIds: string[];
  businessUnitIds: string[];
  departmentIds: string[];
  sectionIds: string[];
  teamIds: string[];
  positionIds: string[];
}

/** Full hierarchy including per-organization breakdown. */
export interface FullScopeHierarchy extends EffectiveScope {
  hierarchy: {
    organizationId: string;
    businessUnitIds: string[];
    departmentIds: string[];
    sectionIds: string[];
    teamIds: string[];
    positionIds: string[];
  }[];
}

/* ---------- Core resolution ---------- */

/**
 * Resolve the base effective scope from user_role_assignments.
 * Reads direct scope bindings (scope_type + scope_id) for the user.
 */
export async function resolveUserScope(tenantId: string, userId: string): Promise<EffectiveScope> {
  const schema = tenantSchema(tenantId);
  const assignments = await safeQuery(
    `SELECT scope_type, scope_id FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND active = TRUE`,
    [userId],
  );

  const scope: EffectiveScope = {
    tenantId,
    organizationIds: [],
    businessUnitIds: [],
    departmentIds: [],
    sectionIds: [],
    teamIds: [],
    positionIds: [],
  };

  for (const row of assignments.rows) {
    switch (row.scope_type) {
      case 'organization': scope.organizationIds.push(row.scope_id); break;
      case 'businessUnit':
      case 'business_unit': scope.businessUnitIds.push(row.scope_id); break;
      case 'department': scope.departmentIds.push(row.scope_id); break;
      case 'section': scope.sectionIds.push(row.scope_id); break;
      case 'team': scope.teamIds.push(row.scope_id); break;
      case 'position': scope.positionIds.push(row.scope_id); break;
      // 'tenant' scope means access to everything -- handled by inheritance below
    }
  }

  return scope;
}

/**
 * Resolve full hierarchy with scope inheritance.
 * Expands each assigned scope level downward through the foundation tables:
 *   organizations -> business_units -> departments (+ child depts as sections) -> teams -> positions
 */
export async function resolveFullHierarchy(tenantId: string, userId: string): Promise<FullScopeHierarchy> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.scope: resolving full hierarchy', { tenantId, userId });

  // 1. Get base scope from role assignments
  const base = await resolveUserScope(tenantId, userId);

  // 2. Check if user has tenant-wide scope (inherits everything)
  const tenantWide = await safeQuery(
    `SELECT 1 FROM "${schema}".user_role_assignments
     WHERE user_id = $1 AND scope_type = 'tenant' AND active = TRUE LIMIT 1`,
    [userId],
  );
  const hasTenantScope = tenantWide.rows.length > 0;

  // Collect all resolved IDs (use Sets for deduplication)
  const orgIds = new Set(base.organizationIds);
  const buIds = new Set(base.businessUnitIds);
  const deptIds = new Set(base.departmentIds);
  const sectionIds = new Set(base.sectionIds);
  const teamIds = new Set(base.teamIds);
  const posIds = new Set(base.positionIds);

  // 3. If tenant-wide scope, load all organizations
  if (hasTenantScope) {
    const allOrgs = await safeQuery(
      `SELECT org_id::text FROM "${schema}".organizations WHERE status = 'active'`,
      [],
    );
    for (const r of allOrgs.rows) orgIds.add(r.org_id);
  }

  // 4. For each organization, expand to child BUs
  if (orgIds.size > 0) {
    const orgArr = Array.from(orgIds);
    const childBUs = await safeQuery(
      `SELECT bu_id::text, org_id::text FROM "${schema}".business_units
       WHERE org_id::text = ANY($1) AND status = 'active'`,
      [orgArr],
    );
    for (const r of childBUs.rows) buIds.add(r.bu_id);
  }

  // 5. For each BU, expand to child departments
  if (buIds.size > 0) {
    const buArr = Array.from(buIds);
    const childDepts = await safeQuery(
      `SELECT dept_id::text, bu_id::text FROM "${schema}".departments
       WHERE bu_id::text = ANY($1) AND status = 'active'`,
      [buArr],
    );
    for (const r of childDepts.rows) deptIds.add(r.dept_id);
  }

  // 6. For each department, expand child departments (sections = child depts via parent_department_id)
  if (deptIds.size > 0) {
    const deptArr = Array.from(deptIds);
    const childSections = await safeQuery(
      `WITH RECURSIVE dept_tree AS (
         SELECT dept_id::text, parent_department_id::text
         FROM "${schema}".departments
         WHERE parent_department_id::text = ANY($1) AND status = 'active'
         UNION ALL
         SELECT d.dept_id::text, d.parent_department_id::text
         FROM "${schema}".departments d
         JOIN dept_tree dt ON d.parent_department_id::text = dt.dept_id
         WHERE d.status = 'active'
       )
       SELECT dept_id FROM dept_tree`,
      [deptArr],
    );
    for (const r of childSections.rows) sectionIds.add(r.dept_id);
  }

  // 7. For all depts + sections, expand to teams
  const allDeptAndSectionIds = [...Array.from(deptIds), ...Array.from(sectionIds)];
  if (allDeptAndSectionIds.length > 0) {
    const childTeams = await safeQuery(
      `SELECT team_id::text FROM "${schema}".teams
       WHERE department_id::text = ANY($1) AND active = TRUE`,
      [allDeptAndSectionIds],
    );
    for (const r of childTeams.rows) teamIds.add(r.team_id);
  }

  // Also include teams that have no department (org-level teams) if tenant-wide
  if (hasTenantScope) {
    const orgTeams = await safeQuery(
      `SELECT team_id::text FROM "${schema}".teams WHERE active = TRUE`,
      [],
    );
    for (const r of orgTeams.rows) teamIds.add(r.team_id);
  }

  // 8. For all depts + sections, expand to positions
  if (allDeptAndSectionIds.length > 0) {
    const childPositions = await safeQuery(
      `SELECT position_id::text FROM "${schema}".positions
       WHERE dept_id::text = ANY($1) AND status = 'active'`,
      [allDeptAndSectionIds],
    );
    for (const r of childPositions.rows) posIds.add(r.position_id);
  }

  // 9. Build per-organization hierarchy breakdown
  const hierarchy: FullScopeHierarchy['hierarchy'] = [];
  for (const orgId of orgIds) {
    // BUs under this org
    const orgBUs = await safeQuery(
      `SELECT bu_id::text FROM "${schema}".business_units
       WHERE org_id::text = $1 AND status = 'active'`,
      [orgId],
    );
    const orgBuIds = orgBUs.rows.map((r: any) => r.bu_id as string);

    // Departments under those BUs
    const orgDepts = orgBuIds.length > 0
      ? await safeQuery(
          `SELECT dept_id::text FROM "${schema}".departments
           WHERE bu_id::text = ANY($1) AND status = 'active' AND parent_department_id IS NULL`,
          [orgBuIds],
        )
      : { rows: [] };
    const orgDeptIds = orgDepts.rows.map((r: any) => r.dept_id as string);

    // Sections (child departments) under those departments
    const orgSections = orgDeptIds.length > 0
      ? await safeQuery(
          `SELECT dept_id::text FROM "${schema}".departments
           WHERE parent_department_id::text = ANY($1) AND status = 'active'`,
          [orgDeptIds],
        )
      : { rows: [] };
    const orgSectionIds = orgSections.rows.map((r: any) => r.dept_id as string);

    // Teams under departments and sections
    const allOrgDeptIds = [...orgDeptIds, ...orgSectionIds];
    const orgTeams = allOrgDeptIds.length > 0
      ? await safeQuery(
          `SELECT team_id::text FROM "${schema}".teams
           WHERE department_id::text = ANY($1) AND active = TRUE`,
          [allOrgDeptIds],
        )
      : { rows: [] };
    const orgTeamIds = orgTeams.rows.map((r: any) => r.team_id as string);

    // Positions under departments and sections
    const orgPositions = allOrgDeptIds.length > 0
      ? await safeQuery(
          `SELECT position_id::text FROM "${schema}".positions
           WHERE dept_id::text = ANY($1) AND status = 'active'`,
          [allOrgDeptIds],
        )
      : { rows: [] };
    const orgPositionIds = orgPositions.rows.map((r: any) => r.position_id as string);

    hierarchy.push({
      organizationId: orgId,
      businessUnitIds: orgBuIds,
      departmentIds: orgDeptIds,
      sectionIds: orgSectionIds,
      teamIds: orgTeamIds,
      positionIds: orgPositionIds,
    });
  }

  return {
    tenantId,
    organizationIds: Array.from(orgIds),
    businessUnitIds: Array.from(buIds),
    departmentIds: Array.from(deptIds),
    sectionIds: Array.from(sectionIds),
    teamIds: Array.from(teamIds),
    positionIds: Array.from(posIds),
    hierarchy,
  };
}

/**
 * Given a position, walk up the foundation tables to resolve which
 * organization, business unit, department, and section it belongs to.
 * Uses real foundation tables: positions -> departments -> business_units -> organizations.
 */
export async function resolveScopeFromPosition(
  tenantId: string,
  positionId: string,
): Promise<{
  organizationId: string | null;
  businessUnitId: string | null;
  departmentId: string | null;
  sectionId: string | null;
}> {
  const schema = tenantSchema(tenantId);
  logger.info('dauth.scope: resolving scope from position', { tenantId, positionId });

  const resolved = {
    organizationId: null as string | null,
    businessUnitId: null as string | null,
    departmentId: null as string | null,
    sectionId: null as string | null,
  };

  // Step 1: Get position's department
  const posResult = await safeQuery(
    `SELECT dept_id::text FROM "${schema}".positions WHERE position_id::text = $1 AND status = 'active'`,
    [positionId],
  );
  if (posResult.rows.length === 0 || !posResult.rows[0].dept_id) return resolved;

  const deptId = posResult.rows[0].dept_id;

  // Step 2: Get department info (check if it's a section = has parent_department_id)
  const deptResult = await safeQuery(
    `SELECT dept_id::text, bu_id::text, parent_department_id::text
     FROM "${schema}".departments WHERE dept_id::text = $1 AND status = 'active'`,
    [deptId],
  );
  if (deptResult.rows.length === 0) return resolved;

  const dept = deptResult.rows[0];
  if (dept.parent_department_id) {
    // This dept is a section; the parent is the actual department
    resolved.sectionId = dept.dept_id;

    const parentDept = await safeQuery(
      `SELECT dept_id::text, bu_id::text FROM "${schema}".departments
       WHERE dept_id::text = $1 AND status = 'active'`,
      [dept.parent_department_id],
    );
    if (parentDept.rows.length > 0) {
      resolved.departmentId = parentDept.rows[0].dept_id;
      const buId = parentDept.rows[0].bu_id;

      // Step 3: Get BU's organization
      const buResult = await safeQuery(
        `SELECT bu_id::text, org_id::text FROM "${schema}".business_units
         WHERE bu_id::text = $1 AND status = 'active'`,
        [buId],
      );
      if (buResult.rows.length > 0) {
        resolved.businessUnitId = buResult.rows[0].bu_id;
        resolved.organizationId = buResult.rows[0].org_id;
      }
    }
  } else {
    // This dept is a top-level department
    resolved.departmentId = dept.dept_id;
    const buId = dept.bu_id;

    const buResult = await safeQuery(
      `SELECT bu_id::text, org_id::text FROM "${schema}".business_units
       WHERE bu_id::text = $1 AND status = 'active'`,
      [buId],
    );
    if (buResult.rows.length > 0) {
      resolved.businessUnitId = buResult.rows[0].bu_id;
      resolved.organizationId = buResult.rows[0].org_id;
    }
  }

  return resolved;
}

/**
 * Check if a user's effective scope includes a specific target scope.
 * Uses full hierarchy resolution with inheritance to determine access.
 */
export async function isWithinScope(
  tenantId: string,
  userId: string,
  targetScopeType: string,
  targetScopeId: string,
): Promise<boolean> {
  const full = await resolveFullHierarchy(tenantId, userId);

  switch (targetScopeType) {
    case 'organization': return full.organizationIds.includes(targetScopeId);
    case 'businessUnit':
    case 'business_unit': return full.businessUnitIds.includes(targetScopeId);
    case 'department': return full.departmentIds.includes(targetScopeId);
    case 'section': return full.sectionIds.includes(targetScopeId);
    case 'team': return full.teamIds.includes(targetScopeId);
    case 'position': return full.positionIds.includes(targetScopeId);
    default:
      logger.warn('dauth.scope: unknown scope type for isWithinScope check', { tenantId, userId, targetScopeType });
      return false;
  }
}

/**
 * Merge multiple EffectiveScope objects, deduplicating IDs across all arrays.
 * All scopes must share the same tenantId; the first tenantId is used.
 */
export function mergeScopes(scopes: EffectiveScope[]): EffectiveScope {
  if (scopes.length === 0) {
    return { tenantId: '', organizationIds: [], businessUnitIds: [], departmentIds: [], sectionIds: [], teamIds: [], positionIds: [] };
  }

  const merged: EffectiveScope = {
    tenantId: scopes[0].tenantId,
    organizationIds: [],
    businessUnitIds: [],
    departmentIds: [],
    sectionIds: [],
    teamIds: [],
    positionIds: [],
  };

  const fields = ['organizationIds', 'businessUnitIds', 'departmentIds', 'sectionIds', 'teamIds', 'positionIds'] as const;
  const seen: Record<string, Set<string>> = {};
  for (const f of fields) seen[f] = new Set();

  for (const scope of scopes) {
    for (const field of fields) {
      for (const id of scope[field]) {
        if (!seen[field].has(id)) {
          seen[field].add(id);
          (merged[field] as string[]).push(id);
        }
      }
    }
  }

  return merged;
}

// @ownership-note: DOS foundation service — references auth keywords for access-rule evaluation, not auth definition
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

export type OrgNodeType = 'organization' | 'division' | 'department' | 'team' | 'unit';

export interface OrgHierarchyNode {
  type: OrgNodeType;
  id: string;
  name: string;
  nameAr?: string;
  parentId?: string;
  status: string;
  headUserId?: string;
  locationId?: string;
  costCenterId?: string;
  metadata?: Record<string, unknown>;
  children?: OrgHierarchyNode[];
  [key: string]: unknown;
}

interface AccessRules {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  reason?: string;
}

const TABLE_MAP: Record<OrgNodeType, string> = {
  organization: 'organizations',
  division: 'business_units',
  department: 'departments',
  team: 'teams',
  unit: 'teams',
};

const PK_MAP: Record<OrgNodeType, string> = {
  organization: 'org_id',
  division: 'bu_id',
  department: 'dept_id',
  team: 'team_id',
  unit: 'team_id',
};

const NAME_COL: Record<OrgNodeType, string> = {
  organization: 'org_name',
  division: 'bu_name',
  department: 'dept_name',
  team: 'team_name',
  unit: 'team_name',
};

const ADMIN_ROLES = new Set(['tenant_admin', 'platform_super_admin', 'owner', 'admin']);

export async function getOrgHierarchyTree(
  tenantId: string,
  includeInactive?: boolean,
): Promise<OrgHierarchyNode[]> {
  const schema = tenantSchema(tenantId);
  try {
    const nodesRes = await safeQuery(
      `SELECT node_id, node_type, parent_node_id, name_en, name_ar,
              status, head_user_id, metadata, sort_order
       FROM "${schema}".org_hierarchy_nodes
       ${includeInactive ? '' : "WHERE status = 'active'"}
       ORDER BY sort_order ASC, name_en ASC`,
    );

    if (nodesRes.rows.length > 0) {
      return buildTree(nodesRes.rows);
    }

    return buildTreeFromTables(schema, includeInactive);
  } catch (err) {
    logger.warn('[DOS Foundation] org_hierarchy_nodes query failed, falling back to tables:', String(err));
    return buildTreeFromTables(schema, includeInactive);
  }
}

function buildTree(rows: unknown[]): OrgHierarchyNode[] {
  const map = new Map<string, OrgHierarchyNode>();
  const roots: OrgHierarchyNode[] = [];

  for (const _r of rows) {
    const r = _r as Record<string, unknown>;
    const node: OrgHierarchyNode = {
      type: ((r.node_type as string) || 'organization') as OrgNodeType,
      id: r.node_id as string,
      name: (r.name_en as string) || '',
      nameAr: (r.name_ar as string) ?? undefined,
      parentId: (r.parent_node_id as string) ?? undefined,
      status: (r.status as string) || 'active',
      headUserId: (r.head_user_id as string) ?? undefined,
      metadata: (r.metadata as Record<string, unknown>) || {},
      children: [],
    };
    map.set(node.id, node);
  }

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function buildTreeFromTables(schema: string, includeInactive?: boolean): Promise<OrgHierarchyNode[]> {
  const statusFilter = includeInactive ? '' : "WHERE (status IS NULL OR status = 'active') AND deleted_at IS NULL";
  const roots: OrgHierarchyNode[] = [];

  try {
    const orgs = await safeQuery(
      `SELECT org_id, org_name, org_name_ar, status, head_user_id
       FROM "${schema}".organizations ${statusFilter}
       ORDER BY org_name`,
    );

    for (const org of orgs.rows) {
      const orgNode: OrgHierarchyNode = {
        type: 'organization',
        id: org.org_id,
        name: org.org_name || '',
        nameAr: org.org_name_ar ?? undefined,
        status: org.status || 'active',
        headUserId: org.head_user_id ?? undefined,
        children: [],
      };

      const divs = await safeQuery(
        `SELECT bu_id, bu_name, bu_name_ar, status, head_user_id
         FROM "${schema}".business_units
         WHERE org_id = $1 ${includeInactive ? '' : "AND (status IS NULL OR status = 'active') AND deleted_at IS NULL"}
         ORDER BY bu_name`,
        [org.org_id],
      );

      for (const div of divs.rows) {
        const divNode: OrgHierarchyNode = {
          type: 'division',
          id: div.bu_id,
          name: div.bu_name || '',
          nameAr: div.bu_name_ar ?? undefined,
          parentId: org.org_id,
          status: div.status || 'active',
          headUserId: div.head_user_id ?? undefined,
          children: [],
        };

        const depts = await safeQuery(
          `SELECT dept_id, dept_name, dept_name_ar, status, head_user_id
           FROM "${schema}".departments
           WHERE bu_id = $1 ${includeInactive ? '' : "AND (status IS NULL OR status = 'active') AND deleted_at IS NULL"}
           ORDER BY dept_name`,
          [div.bu_id],
        );

        for (const dept of depts.rows) {
          const deptNode: OrgHierarchyNode = {
            type: 'department',
            id: dept.dept_id,
            name: dept.dept_name || '',
            nameAr: dept.dept_name_ar ?? undefined,
            parentId: div.bu_id,
            status: dept.status || 'active',
            headUserId: dept.head_user_id ?? undefined,
            children: [],
          };

          const teams = await safeQuery(
            `SELECT team_id, team_name, team_name_ar, status, head_user_id
             FROM "${schema}".teams
             WHERE dept_id = $1 ${includeInactive ? '' : "AND (status IS NULL OR status = 'active') AND deleted_at IS NULL"}
             ORDER BY team_name`,
            [dept.dept_id],
          );

          for (const team of teams.rows) {
            deptNode.children!.push({
              type: 'team',
              id: team.team_id,
              name: team.team_name || '',
              nameAr: team.team_name_ar ?? undefined,
              parentId: dept.dept_id,
              status: team.status || 'active',
              headUserId: team.head_user_id ?? undefined,
              children: [],
            });
          }

          divNode.children!.push(deptNode);
        }

        orgNode.children!.push(divNode);
      }

      roots.push(orgNode);
    }
  } catch (err) {
    logger.error('[DOS Foundation] buildTreeFromTables error:', String(err));
  }

  return roots;
}

export async function getOrgHierarchyAccessRules(
  tenantId: string,
  userId: string,
  userRole: string,
  nodeId: string,
  nodeType: OrgNodeType,
): Promise<AccessRules> {
  const schema = tenantSchema(tenantId);
  const isAdmin = ADMIN_ROLES.has(userRole);

  if (isAdmin) {
    return { canView: true, canEdit: true, canDelete: true, isOwner: true, reason: 'admin_role' };
  }

  const table = TABLE_MAP[nodeType];
  const pk = PK_MAP[nodeType];

  try {
    const { rows } = await safeQuery(
      `SELECT head_user_id FROM "${schema}".${table} WHERE ${pk} = $1 LIMIT 1`,
      [nodeId],
    );
    const isOwner = rows[0]?.head_user_id === userId;

    const { rows: memberRows } = await safeQuery(
      `SELECT 1 FROM "${schema}".team_members
       WHERE user_id = $1 AND is_active = TRUE LIMIT 1`,
      [userId],
    );
    const isMember = memberRows.length > 0;

    return {
      canView: true,
      canEdit: isOwner,
      canDelete: false,
      isOwner,
      reason: isOwner ? 'node_head' : isMember ? 'team_member' : 'authenticated_user',
    };
  } catch (err) {
    logger.error('[DOS Foundation] getOrgHierarchyAccessRules error:', String(err));
    return { canView: true, canEdit: false, canDelete: false, isOwner: false, reason: 'error_fallback' };
  }
}

export function evaluateOrgHierarchyAccess(
  userRole: string,
  _nodeRole: string,
  _nodeType: OrgNodeType,
  _ownership: string,
  isOwner: boolean,
): AccessRules {
  const isAdmin = ADMIN_ROLES.has(userRole);
  return {
    canView: true,
    canEdit: isAdmin || isOwner,
    canDelete: isAdmin,
    isOwner,
  };
}

export async function validateOrgStructure(tenantId: string): Promise<{
  valid: boolean;
  issues: Array<{ type: string; message: string; nodeId?: string; severity: string }>;
  stats: { organizations: number; divisions: number; departments: number; teams: number };
}> {
  const schema = tenantSchema(tenantId);
  const issues: Array<{ type: string; message: string; nodeId?: string; severity: string }> = [];

  let orgCount = 0, divCount = 0, deptCount = 0, teamCount = 0;

  try {
    const orgs = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".organizations WHERE deleted_at IS NULL`);
    orgCount = orgs.rows[0]?.c || 0;

    const divs = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".business_units WHERE deleted_at IS NULL`);
    divCount = divs.rows[0]?.c || 0;

    const depts = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".departments WHERE deleted_at IS NULL`);
    deptCount = depts.rows[0]?.c || 0;

    const teams = await safeQuery(`SELECT COUNT(*)::int AS c FROM "${schema}".teams WHERE deleted_at IS NULL`);
    teamCount = teams.rows[0]?.c || 0;

    if (orgCount === 0) {
      issues.push({ type: 'missing_root', message: 'No organization node exists', severity: 'error' });
    }

    const orphanDivs = await safeQuery(
      `SELECT bu_id FROM "${schema}".business_units
       WHERE org_id IS NULL AND deleted_at IS NULL`,
    );
    for (const r of orphanDivs.rows) {
      issues.push({ type: 'orphan_node', message: 'Business unit has no parent organization', nodeId: r.bu_id, severity: 'warning' });
    }

    const orphanDepts = await safeQuery(
      `SELECT dept_id FROM "${schema}".departments
       WHERE bu_id IS NULL AND deleted_at IS NULL`,
    );
    for (const r of orphanDepts.rows) {
      issues.push({ type: 'orphan_node', message: 'Department has no parent business unit', nodeId: r.dept_id, severity: 'warning' });
    }

    const orphanTeams = await safeQuery(
      `SELECT team_id FROM "${schema}".teams
       WHERE dept_id IS NULL AND deleted_at IS NULL`,
    );
    for (const r of orphanTeams.rows) {
      issues.push({ type: 'orphan_node', message: 'Team has no parent department', nodeId: r.team_id, severity: 'warning' });
    }
  } catch (err) {
    logger.error('[DOS Foundation] validateOrgStructure error:', String(err));
    issues.push({ type: 'query_error', message: String(err), severity: 'error' });
  }

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: { organizations: orgCount, divisions: divCount, departments: deptCount, teams: teamCount },
  };
}

export async function getUserAccessibleDepartments(
  tenantId: string,
  userId: string,
  userRole: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  if (ADMIN_ROLES.has(userRole)) {
    const { rows } = await safeQuery(
      `SELECT dept_id FROM "${schema}".departments WHERE deleted_at IS NULL AND (status IS NULL OR status = 'active')`,
    );
    return rows.map((r: Record<string, any>) => r.dept_id as string);
  }

  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT d.dept_id
       FROM "${schema}".departments d
       LEFT JOIN "${schema}".teams t ON t.dept_id = d.dept_id AND t.deleted_at IS NULL
       LEFT JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.is_active = TRUE
       WHERE d.deleted_at IS NULL
         AND (d.status IS NULL OR d.status = 'active')
         AND (d.head_user_id = $1 OR tm.user_id = $1)`,
      [userId],
    );
    return rows.map((r: Record<string, any>) => r.dept_id as string);
  } catch (err) {
    logger.error('[DOS Foundation] getUserAccessibleDepartments error:', String(err));
    return [];
  }
}

export async function getUserAccessibleTeams(
  tenantId: string,
  userId: string,
  userRole: string,
): Promise<string[]> {
  const schema = tenantSchema(tenantId);
  if (ADMIN_ROLES.has(userRole)) {
    const { rows } = await safeQuery(
      `SELECT team_id FROM "${schema}".teams WHERE deleted_at IS NULL AND (status IS NULL OR status = 'active')`,
    );
    return rows.map((r: Record<string, any>) => r.team_id as string);
  }

  try {
    const { rows } = await safeQuery(
      `SELECT DISTINCT t.team_id
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".team_members tm ON tm.team_id = t.team_id AND tm.is_active = TRUE
       WHERE t.deleted_at IS NULL
         AND (t.status IS NULL OR t.status = 'active')
         AND (t.head_user_id = $1 OR tm.user_id = $1)`,
      [userId],
    );
    return rows.map((r: Record<string, any>) => r.team_id as string);
  } catch (err) {
    logger.error('[DOS Foundation] getUserAccessibleTeams error:', String(err));
    return [];
  }
}

export async function upsertOrgHierarchyNode(
  tenantId: string,
  userId: string,
  nodeType: OrgNodeType,
  data: unknown,
): Promise<{ id: string; node: any }> {
  const d = data as Record<string, unknown>;
  const schema = tenantSchema(tenantId);
  const table = TABLE_MAP[nodeType];
  const pk = PK_MAP[nodeType];
  const nameCol = NAME_COL[nodeType];
  const isUpdate = !!d.id;

  if (isUpdate) {
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (d.name !== undefined) { setClauses.push(`${nameCol} = $${idx}`); params.push(d.name); idx++; }
    if (d.nameAr !== undefined) { setClauses.push(`${nameCol.replace('_name', '_name_ar')} = $${idx}`); params.push(d.nameAr); idx++; }
    if (d.status !== undefined) { setClauses.push(`status = $${idx}`); params.push(d.status); idx++; }
    if (d.headUserId !== undefined) { setClauses.push(`head_user_id = $${idx}`); params.push(d.headUserId); idx++; }

    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${idx}`); params.push(userId); idx++;
    params.push(d.id); idx++;

    await safeQuery(
      `UPDATE "${schema}".${table} SET ${setClauses.join(', ')} WHERE ${pk} = $${idx - 1}`,
      params,
    );

    const { rows } = await safeQuery(`SELECT * FROM "${schema}".${table} WHERE ${pk} = $1`, [d.id]);
    return { id: d.id as string, node: rows[0] || d };
  }

  const id = (d.id as string) || require('crypto').randomUUID();
  const parentCol = nodeType === 'organization' ? null
    : nodeType === 'division' ? 'org_id'
    : nodeType === 'department' ? 'bu_id'
    : 'dept_id';

  const cols = [pk, nameCol, 'status', 'created_by'];
  const vals = [id, d.name || '', d.status || 'active', userId];
  if (parentCol && d.parentId) {
    cols.push(parentCol);
    vals.push(d.parentId);
  }

  const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

  await safeQuery(
    `INSERT INTO "${schema}".${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    vals,
  );

  const { rows } = await safeQuery(`SELECT * FROM "${schema}".${table} WHERE ${pk} = $1`, [id]);
  return { id, node: rows[0] || { id, ...d } };
}

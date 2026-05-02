import { randomUUID } from 'node:crypto';
import { withTenantClient } from '@dos/db';
import { userMetrics } from '../observability/metrics';
import { UserServiceError } from './contracts/user-errors';

export interface Team {
  team_id: string;
  tenant_id: string;
  name: string;
  code?: string;
  description?: string;
  status: string;
  department_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  member_id?: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  left_at?: string;
}

export interface ListTeamsOptions {
  page?: number;
  pageSize?: number;
  status?: string;
}

const TEAM_COLS = `team_id, tenant_id, name, code, description, status, department_id,
  created_by, created_at, updated_at`;

export async function listTeams(
  tenantId: string,
  options: ListTeamsOptions = {},
): Promise<{ data: Team[]; total: number }> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const params: unknown[] = [tenantId];
  const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];

  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const start = Date.now();

  const { total, data } = await withTenantClient(tenantId, async (c) => {
    const countResult = await c.query(`SELECT COUNT(*) AS count FROM dos.teams ${where}`, params);
    const listParams = [...params, pageSize, offset];
    const listResult = await c.query(
      `SELECT ${TEAM_COLS}
         FROM dos.teams ${where}
         ORDER BY created_at DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return {
      total: parseInt(countResult.rows[0]?.count || '0', 10),
      data: listResult.rows as Team[],
    };
  });

  userMetrics.observeDb('team.list', Date.now() - start);
  return { data, total };
}

export async function getTeamById(tenantId: string, teamId: string): Promise<Team | null> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT ${TEAM_COLS}
           FROM dos.teams
          WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          LIMIT 1`,
        [teamId, tenantId],
      );
      return (result.rows[0] as Team) || null;
    });
  } finally {
    userMetrics.observeDb('team.getById', Date.now() - start);
  }
}

export async function createTeam(
  tenantId: string,
  data: { name: string; code?: string; description?: string; department_id?: string; createdBy: string },
): Promise<Team> {
  const teamId = randomUUID();
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `INSERT INTO dos.teams
           (team_id, tenant_id, name, code, description, status, department_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, NOW(), NOW())
         RETURNING ${TEAM_COLS}`,
        [teamId, tenantId, data.name, data.code ?? null, data.description ?? null, data.department_id ?? null, data.createdBy],
      );
      return result.rows[0] as Team;
    });
    userMetrics.teamCreated(tenantId);
    return row;
  } catch (err) {
    if ((err as { code?: string })?.code === '23505') {
      throw new UserServiceError('TEAM_CODE_DUPLICATE', undefined, { code: data.code });
    }
    throw err;
  } finally {
    userMetrics.observeDb('team.create', Date.now() - start);
  }
}

export async function updateTeam(
  tenantId: string,
  teamId: string,
  data: Partial<Pick<Team, 'name' | 'description' | 'status' | 'department_id'>>,
): Promise<Team | null> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.teams
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             status = COALESCE($4, status),
             department_id = COALESCE($5, department_id),
             updated_at = NOW()
         WHERE team_id = $1 AND tenant_id = $6 AND deleted_at IS NULL
         RETURNING ${TEAM_COLS}`,
        [teamId, data.name ?? null, data.description ?? null, data.status ?? null, data.department_id ?? null, tenantId],
      );
      return (result.rows[0] as Team) || null;
    });
  } finally {
    userMetrics.observeDb('team.update', Date.now() - start);
  }
}

export async function deleteTeam(tenantId: string, teamId: string): Promise<boolean> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.teams
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING team_id`,
        [teamId, tenantId],
      );
      return result.rows.length > 0;
    });
  } finally {
    userMetrics.observeDb('team.delete', Date.now() - start);
  }
}

export async function listMembers(tenantId: string, teamId: string): Promise<TeamMember[]> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      // Ensure the team itself is in this tenant before joining — defense in
      // depth alongside RLS + FK.
      const teamRes = await c.query(
        `SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [teamId, tenantId],
      );
      if (!teamRes.rows.length) return [];

      const result = await c.query(
        `SELECT tm.member_id, tm.team_id, tm.user_id, tm.role, tm.joined_at, tm.left_at,
                u.email, u.display_name, u.first_name, u.last_name
           FROM dos.team_members tm
           LEFT JOIN dos.users u ON u.user_id = tm.user_id
          WHERE tm.team_id = $1 AND tm.left_at IS NULL`,
        [teamId],
      );
      return result.rows as TeamMember[];
    });
  } finally {
    userMetrics.observeDb('team.listMembers', Date.now() - start);
  }
}

export async function addMember(
  tenantId: string,
  teamId: string,
  userId: string,
  role: string,
): Promise<TeamMember> {
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const teamRes = await c.query(
        `SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [teamId, tenantId],
      );
      if (!teamRes.rows.length) {
        throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId });
      }

      const result = await c.query(
        `INSERT INTO dos.team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (team_id, user_id) DO UPDATE
           SET role = $3, left_at = NULL, joined_at = NOW()
         RETURNING member_id, team_id, user_id, role, joined_at, left_at`,
        [teamId, userId, role || 'member'],
      );
      return result.rows[0] as TeamMember;
    });
    userMetrics.teamMemberAdded(tenantId);
    return row;
  } finally {
    userMetrics.observeDb('team.addMember', Date.now() - start);
  }
}

export async function removeMember(tenantId: string, teamId: string, userId: string): Promise<boolean> {
  const start = Date.now();
  try {
    const ok = await withTenantClient(tenantId, async (c) => {
      const teamRes = await c.query(
        `SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [teamId, tenantId],
      );
      if (!teamRes.rows.length) return false;
      const result = await c.query(
        `UPDATE dos.team_members
         SET left_at = NOW()
         WHERE team_id = $1 AND user_id = $2 AND left_at IS NULL
         RETURNING member_id`,
        [teamId, userId],
      );
      return result.rows.length > 0;
    });
    if (ok) userMetrics.teamMemberRemoved(tenantId);
    return ok;
  } finally {
    userMetrics.observeDb('team.removeMember', Date.now() - start);
  }
}

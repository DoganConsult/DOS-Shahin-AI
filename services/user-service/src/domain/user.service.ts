import { randomUUID } from 'node:crypto';
import { withTenantClient } from '@dos/db';
import { logger, toErrorMessage } from '@dos/module-sdk';
import { userMetrics } from '../observability/metrics';
import { UserServiceError } from './contracts/user-errors';

// Users live in public.users (auth schema). withTenantClient sets
// search_path to the per-tenant schema + public, and also sets
// app.current_tenant_id so RLS policies on shared tables engage.
const USERS_TABLE = 'public.users';

export interface UserProfile {
  user_id: string;
  email: string;
  display_name?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  platform_role?: string;
  dashboard_role?: string;
  status: string;
  tenant_id: string;
  department_id?: string;
  avatar_url?: string;
  locale?: string;
  language?: string;
  timezone?: string;
  onboarding_complete?: boolean;
  member_onboarded?: boolean;
  is_super_admin?: boolean;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  display_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  department_id?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
  job_title?: string;
}

export interface ListUsersOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  role?: string;
}

const USER_COLUMNS = `
  user_id, email, name, full_name, role, platform_role,
  NULL::text AS dashboard_role, status, tenant_id,
  NULL::uuid AS department_id, NULL::text AS language,
  is_super_admin, onboarding_complete,
  NULL::text AS job_title, created_at, updated_at,
  last_login AS last_login_at
`;

export async function listUsers(
  tenantId: string,
  options: ListUsersOptions = {},
): Promise<{ data: UserProfile[]; total: number }> {
  const page = options.page || 1;
  const pageSize = options.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];

  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }
  if (options.role) {
    params.push(options.role);
    conditions.push(`role = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const start = Date.now();

  const { total, data } = await withTenantClient(tenantId, async (c) => {
    const countResult = await c.query(
      `SELECT COUNT(*) AS count FROM ${USERS_TABLE} ${where}`,
      params,
    );
    const listParams = [...params, pageSize, offset];
    const listResult = await c.query(
      `SELECT ${USER_COLUMNS}
         FROM ${USERS_TABLE} ${where}
         ORDER BY created_at DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );
    return {
      total: parseInt(countResult.rows[0]?.count || '0', 10),
      data: listResult.rows as UserProfile[],
    };
  });

  userMetrics.observeDb('user.list', Date.now() - start);
  return { data, total };
}

export async function getUserById(tenantId: string, userId: string): Promise<UserProfile | null> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT ${USER_COLUMNS}
           FROM ${USERS_TABLE}
          WHERE (user_id = $1 OR email = $1)
            AND tenant_id = $2
          LIMIT 1`,
        [userId, tenantId],
      );
      return (result.rows[0] as UserProfile) || null;
    });
  } finally {
    userMetrics.observeDb('user.getById', Date.now() - start);
  }
}

export async function createUser(tenantId: string, input: CreateUserInput): Promise<UserProfile> {
  const userId = randomUUID();
  const role = input.role || 'member';
  const displayName = input.display_name || input.name || input.first_name || input.email.split('@')[0];
  const start = Date.now();

  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `INSERT INTO ${USERS_TABLE}
           (user_id, email, name, full_name, role, status, tenant_id,
            department_id, language, job_title, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, NOW(), NOW())
         RETURNING ${USER_COLUMNS}`,
        [
          userId,
          input.email,
          displayName,
          input.first_name && input.last_name ? `${input.first_name} ${input.last_name}` : displayName,
          role,
          tenantId,
          input.department_id ?? null,
          input.locale ?? null,
          input.job_title ?? null,
        ],
      );
      return result.rows[0] as UserProfile;
    });
    userMetrics.userCreated(tenantId);
    logger.info('[UserService] User created', { userId, tenantId, email: input.email });
    return row;
  } catch (err) {
    if ((err as { code?: string })?.code === '23505') {
      throw new UserServiceError('USER_EMAIL_DUPLICATE', undefined, { email: input.email });
    }
    logger.error('[UserService] Failed to create user', { tenantId, email: input.email, error: toErrorMessage(err) });
    throw err;
  } finally {
    userMetrics.observeDb('user.create', Date.now() - start);
  }
}

export async function updateUser(
  tenantId: string,
  userId: string,
  data: Partial<Pick<UserProfile, 'name' | 'full_name' | 'avatar_url' | 'language' | 'timezone' | 'department_id' | 'status' | 'role' | 'job_title'>>,
): Promise<UserProfile | null> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const existingRes = await c.query(
        `SELECT ${USER_COLUMNS} FROM ${USERS_TABLE}
          WHERE (user_id = $1 OR email = $1) AND tenant_id = $2 LIMIT 1`,
        [userId, tenantId],
      );
      const existing = existingRes.rows[0] as UserProfile | undefined;
      if (!existing) return null;

      const result = await c.query(
        `UPDATE ${USERS_TABLE}
         SET name = COALESCE($2, name),
             full_name = COALESCE($3, full_name),
             language = COALESCE($4, language),
             department_id = COALESCE($5, department_id),
             status = COALESCE($6, status),
             role = COALESCE($7, role),
             job_title = COALESCE($8, job_title),
             updated_at = NOW()
         WHERE user_id = $1 AND tenant_id = $9
         RETURNING ${USER_COLUMNS}`,
        [
          existing.user_id,
          data.name ?? null,
          data.full_name ?? null,
          data.language ?? null,
          data.department_id ?? null,
          data.status ?? null,
          data.role ?? null,
          data.job_title ?? null,
          tenantId,
        ],
      );
      return (result.rows[0] as UserProfile) || null;
    });
  } finally {
    userMetrics.userUpdated(tenantId);
    userMetrics.observeDb('user.update', Date.now() - start);
  }
}

export async function deactivateUser(tenantId: string, userId: string): Promise<UserProfile | null> {
  const start = Date.now();
  try {
    const updated = await withTenantClient(tenantId, async (c) => {
      const existingRes = await c.query(
        `SELECT user_id FROM ${USERS_TABLE}
          WHERE (user_id = $1 OR email = $1) AND tenant_id = $2 LIMIT 1`,
        [userId, tenantId],
      );
      const existing = existingRes.rows[0] as { user_id: string } | undefined;
      if (!existing) return null;

      const result = await c.query(
        `UPDATE ${USERS_TABLE}
         SET status = 'inactive', updated_at = NOW()
         WHERE user_id = $1 AND tenant_id = $2 AND status != 'inactive'
         RETURNING ${USER_COLUMNS}`,
        [existing.user_id, tenantId],
      );
      return (result.rows[0] as UserProfile) || null;
    });
    if (updated) userMetrics.userDeactivated(tenantId);
    logger.info('[UserService] User deactivated', { userId, tenantId });
    return updated;
  } catch (err) {
    logger.error('[UserService] Failed to deactivate user', { userId, tenantId, error: toErrorMessage(err) });
    throw err;
  } finally {
    userMetrics.observeDb('user.deactivate', Date.now() - start);
  }
}

// Probe a per-tenant relation for existence inside the active client's
// search_path. Returns true iff the table is visible — used so
// listUserTeams/Tasks can degrade to [] cleanly when the team or
// workflow module hasn't provisioned its tables in this tenant yet.
async function tableExists(c: { query: (sql: string, p: any[]) => Promise<{ rows: any[] }> }, table: string): Promise<boolean> {
  const r = await c.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name = $1 LIMIT 1`,
    [table],
  );
  return r.rows.length > 0;
}

export async function listUserTeams(tenantId: string, userId: string): Promise<unknown[]> {
  return withTenantClient(tenantId, async (c) => {
    if (!(await tableExists(c, 'team_members'))) return [];
    if (!(await tableExists(c, 'teams'))) return [];
    const res = await c.query(
      `SELECT t.team_id, t.name, tm.team_role, tm.joined_at
         FROM team_members tm
         JOIN teams t ON t.team_id = tm.team_id
        WHERE tm.user_id = $1
        ORDER BY t.name`,
      [userId],
    );
    return res.rows;
  });
}

export async function listUserTasks(tenantId: string, userId: string): Promise<unknown[]> {
  return withTenantClient(tenantId, async (c) => {
    // Prefer process_tasks (work-item granularity, has assigned_user_id +
    // due_date columns the FE expects). Fall back to workflow_instances
    // (created_by) when process_tasks isn't provisioned. Either missing →
    // empty list, no crash.
    if (await tableExists(c, 'process_tasks')) {
      const res = await c.query(
        `SELECT task_id, title, task_type, status, priority, assigned_user_id,
                team_id, sla_hours, due_date, created_at, completed_at
           FROM process_tasks
          WHERE assigned_user_id = $1
            AND status IN ('pending','assigned','in_progress','blocked')
          ORDER BY due_date NULLS LAST, created_at DESC
          LIMIT 100`,
        [userId],
      );
      return res.rows;
    }
    if (await tableExists(c, 'workflow_instances')) {
      const res = await c.query(
        `SELECT instance_id, workflow_type, name, status, current_step,
                total_steps, created_by, created_at, completed_at
           FROM workflow_instances
          WHERE created_by = $1
            AND status IN ('pending','running','in_progress','blocked')
          ORDER BY created_at DESC
          LIMIT 100`,
        [userId],
      );
      return res.rows;
    }
    return [];
  });
}

import { withTenantClient } from '@dos/db';
import { userMetrics } from '../observability/metrics';
import { UserServiceError } from './contracts/user-errors';

export interface RaciAssignment {
  id: string;
  team_id: string;
  team_name: string;
  user_id: string;
  scope_type: string;
  scope_id: string | null;
  raci_role: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface RaciSummaryEntry {
  scope_type: string;
  raci_role: string;
  count: number;
}

const RACI_SELECT = `ra.id, ra.team_id, t.name AS team_name, ra.user_id,
  ra.scope_type, ra.scope_id, ra.raci_role,
  ra.assigned_by, ra.assigned_at`;

export async function getRaciByUser(
  tenantId: string,
  userId: string,
): Promise<{ assignments: RaciAssignment[]; summary: RaciSummaryEntry[] }> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const assignmentResult = await c.query(
        `SELECT ${RACI_SELECT}
           FROM dos.team_raci_assignments ra
           JOIN dos.teams t ON t.team_id = ra.team_id
          WHERE ra.tenant_id = $1
            AND ra.user_id = $2
            AND ra.revoked_at IS NULL
          ORDER BY ra.scope_type, ra.raci_role`,
        [tenantId, userId],
      );

      const summaryResult = await c.query(
        `SELECT scope_type, raci_role, COUNT(*)::int AS count
           FROM dos.team_raci_assignments
          WHERE tenant_id = $1
            AND user_id = $2
            AND revoked_at IS NULL
          GROUP BY scope_type, raci_role
          ORDER BY scope_type, raci_role`,
        [tenantId, userId],
      );

      return {
        assignments: assignmentResult.rows as RaciAssignment[],
        summary: summaryResult.rows as RaciSummaryEntry[],
      };
    });
  } finally {
    userMetrics.observeDb('raci.getByUser', Date.now() - start);
  }
}

export async function getRaciByTeam(
  tenantId: string,
  teamId: string,
): Promise<RaciAssignment[]> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT ${RACI_SELECT}
           FROM dos.team_raci_assignments ra
           JOIN dos.teams t ON t.team_id = ra.team_id
          WHERE ra.tenant_id = $1
            AND ra.team_id = $2
            AND ra.revoked_at IS NULL
          ORDER BY ra.raci_role`,
        [tenantId, teamId],
      );
      return result.rows as RaciAssignment[];
    });
  } finally {
    userMetrics.observeDb('raci.getByTeam', Date.now() - start);
  }
}

export async function assignRaci(
  tenantId: string,
  data: {
    teamId: string;
    userId: string;
    scopeType: string;
    scopeId?: string;
    raciRole: string;
    assignedBy: string;
  },
): Promise<RaciAssignment> {
  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      // Verify team belongs to tenant
      const teamRes = await c.query(
        `SELECT name FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [data.teamId, tenantId],
      );
      if (!teamRes.rows.length) {
        throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: data.teamId });
      }

      const result = await c.query(
        `INSERT INTO dos.team_raci_assignments
           (tenant_id, team_id, user_id, scope_type, scope_id, raci_role, assigned_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, team_id, user_id, scope_type,
                      COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid), raci_role)
           WHERE revoked_at IS NULL
         DO UPDATE SET updated_at = NOW()
         RETURNING id, team_id, user_id, scope_type, scope_id, raci_role, assigned_by, assigned_at`,
        [tenantId, data.teamId, data.userId, data.scopeType, data.scopeId ?? null, data.raciRole, data.assignedBy],
      );
      const inserted = result.rows[0] as RaciAssignment;
      inserted.team_name = teamRes.rows[0]?.name ?? '';
      return inserted;
    });
    userMetrics.raciAssigned(tenantId, data.raciRole);
    return row;
  } finally {
    userMetrics.observeDb('raci.assign', Date.now() - start);
  }
}

export async function revokeRaci(
  tenantId: string,
  assignmentId: string,
): Promise<boolean> {
  const start = Date.now();
  try {
    const revoked = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `UPDATE dos.team_raci_assignments
         SET revoked_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND revoked_at IS NULL
         RETURNING id`,
        [assignmentId, tenantId],
      );
      return result.rows.length > 0;
    });
    if (revoked) userMetrics.raciRevoked(tenantId);
    return revoked;
  } finally {
    userMetrics.observeDb('raci.revoke', Date.now() - start);
  }
}

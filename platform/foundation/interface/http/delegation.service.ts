import { randomUUID } from 'crypto';
import { withTenantClient } from '../../ports/database.port';
import { userMetrics } from '../../infrastructure/observability/metrics';

export interface Delegation {
  delegation_id: string;
  tenant_id: string;
  delegator_id: string;
  delegate_id: string;
  scope: unknown;
  permissions: string[] | null;
  valid_from: string;
  valid_until: string | null;
  reason: string | null;
  status: 'active' | 'pending_approval' | 'approved' | 'rejected' | 'revoked';
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  delegator_email?: string;
  delegator_name?: string;
  delegate_email?: string;
  delegate_name?: string;
}

export interface ListDelegationOptions {
  actorId: string;
  isAdmin: boolean;
  direction?: 'from' | 'to' | 'both';
}

export interface CreateDelegationInput {
  delegator_id?: string;
  delegate_id: string;
  scope?: unknown;
  permissions?: string[];
  effective_from?: string;
  effective_to?: string;
  reason?: string;
  requires_approval?: boolean;
}

const TBL = 'dos.delegations';
const TBL_RAW = 'platform_dauth.delegations';

function track<T>(op: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  return fn().finally(() => userMetrics.observeDb(op, Date.now() - start));
}

export async function listDelegations(tenantId: string, opts: ListDelegationOptions): Promise<Delegation[]> {
  const conditions = ['d.tenant_id = $1', 'd.deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  if (!opts.isAdmin) {
    params.push(opts.actorId);
    const pIdx = params.length;
    switch (opts.direction) {
      case 'from': conditions.push(`d.delegator_id = $${pIdx}`); break;
      case 'to':   conditions.push(`d.delegate_id  = $${pIdx}`); break;
      default:     conditions.push(`(d.delegator_id = $${pIdx} OR d.delegate_id = $${pIdx})`);
    }
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  return track('foundation.delegation.list', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT d.delegation_id, d.tenant_id,
                d.delegator_id, d.delegate_id,
                d.scope, d.permissions,
                d.valid_from, d.valid_until,
                d.reason, d.status, d.approved_by, d.approved_at, d.rejected_reason,
                d.created_by, d.created_at, d.updated_at,
                dr.email AS delegator_email, dr.display_name AS delegator_name,
                de.email AS delegate_email,  de.display_name AS delegate_name
           FROM ${TBL} d
           LEFT JOIN dos.users dr ON dr.user_id = d.delegator_id
           LEFT JOIN dos.users de ON de.user_id = d.delegate_id
           ${where} ORDER BY d.created_at DESC`,
        params,
      );
      return r.rows as Delegation[];
    }),
  );
}

export async function getDelegation(tenantId: string, id: string): Promise<Delegation | null> {
  return track('foundation.delegation.getById', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `SELECT d.delegation_id, d.tenant_id,
                d.delegator_id, d.delegate_id,
                d.scope, d.permissions, d.valid_from, d.valid_until,
                d.reason, d.status, d.approved_by, d.approved_at, d.rejected_reason,
                d.created_by, d.created_at, d.updated_at,
                dr.email AS delegator_email, de.email AS delegate_email
           FROM ${TBL} d
           LEFT JOIN dos.users dr ON dr.user_id = d.delegator_id
           LEFT JOIN dos.users de ON de.user_id = d.delegate_id
          WHERE d.delegation_id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
        [id, tenantId],
      );
      return (r.rows[0] as Delegation) ?? null;
    }),
  );
}

export async function createDelegation(
  tenantId: string,
  input: CreateDelegationInput,
  actorId: string,
): Promise<Delegation> {
  const id = randomUUID();
  const delegator = input.delegator_id ?? actorId;
  const initialStatus = input.requires_approval ? 'pending_approval' : 'active';
  return track('foundation.delegation.create', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `INSERT INTO ${TBL_RAW}
           (delegation_id, tenant_id, from_user_id, to_user_id, scope, permissions,
            valid_from, valid_until, reason, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), $6,
                 COALESCE($7, NOW()), $8, $9, $10, $11, NOW(), NOW())
         RETURNING delegation_id, tenant_id,
                   from_user_id AS delegator_id, to_user_id AS delegate_id,
                   scope, permissions, valid_from, valid_until,
                   reason, status, approved_by, approved_at, rejected_reason,
                   created_by, created_at, updated_at`,
        [
          id, tenantId, delegator, input.delegate_id,
          input.scope ? JSON.stringify(input.scope) : null,
          input.permissions ? JSON.stringify(input.permissions) : null,
          input.effective_from ?? null, input.effective_to ?? null,
          input.reason ?? null, initialStatus, actorId,
        ],
      );
      return r.rows[0] as Delegation;
    }),
  );
}

export async function approveDelegation(tenantId: string, id: string, actorId: string): Promise<Delegation | null> {
  return track('foundation.delegation.approve', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE ${TBL_RAW}
            SET status = 'approved', approved_by = $3, approved_at = NOW(), updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('pending_approval','active')
        RETURNING delegation_id, tenant_id,
                  from_user_id AS delegator_id, to_user_id AS delegate_id,
                  scope, permissions, valid_from, valid_until,
                  reason, status, approved_by, approved_at, rejected_reason,
                  created_by, created_at, updated_at`,
        [id, tenantId, actorId],
      );
      return (r.rows[0] as Delegation) ?? null;
    }),
  );
}

export async function rejectDelegation(
  tenantId: string,
  id: string,
  actorId: string,
  reason: string,
): Promise<Delegation | null> {
  return track('foundation.delegation.reject', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE ${TBL_RAW}
            SET status = 'rejected', approved_by = $3, approved_at = NOW(),
                rejected_reason = $4, updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
            AND status IN ('pending_approval','active')
        RETURNING delegation_id, tenant_id,
                  from_user_id AS delegator_id, to_user_id AS delegate_id,
                  scope, permissions, valid_from, valid_until,
                  reason, status, approved_by, approved_at, rejected_reason,
                  created_by, created_at, updated_at`,
        [id, tenantId, actorId, reason],
      );
      return (r.rows[0] as Delegation) ?? null;
    }),
  );
}

export async function revokeDelegation(tenantId: string, id: string): Promise<boolean> {
  return track('foundation.delegation.revoke', async () =>
    withTenantClient(tenantId, async (c) => {
      const r = await c.query(
        `UPDATE ${TBL_RAW}
            SET status = 'revoked', deleted_at = NOW(), updated_at = NOW()
          WHERE delegation_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING delegation_id`,
        [id, tenantId],
      );
      return r.rows.length > 0;
    }),
  );
}

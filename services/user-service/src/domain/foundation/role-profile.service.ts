// =============================================================================
// RoleProfileService — canonical writer to dos.role_profile_sync.
//
// This is the SOLE legitimate code path that may produce mutations on
// platform_dauth.user_role_assignments. It works by:
//
//   1. Setting the GUC `app.via_role_profile='true'` inside a transaction.
//   2. Upserting the canonical row into dos.role_profile_sync.
//   3. Letting the AFTER trigger trg_role_profile_project mirror the row
//      into platform_dauth.user_role_assignments atomically.
//
// Any other code that writes URA directly will be rejected by trigger
// trg_ura_via_role_profile_only (Wave F1).
//
// Doctrine: HRIS / SCIM / Okta / AzureAD adapters call into this service
// via .upsert/.revoke; they MUST NOT bypass it.
// =============================================================================

import { withTenantClient } from '@dos/db';
import { logger, toErrorMessage } from '@dos/module-sdk';

export type LifecycleState =
  | 'pending' | 'active' | 'suspended' | 'offboarding' | 'terminated';

export interface RoleProfileInput {
  tenant_id:        string;
  user_id:          string;
  role_code:        string;
  scope?:           string;       // default 'tenant'
  permissions?:     string[];     // optional denorm cache
  business_unit_id?: string | null;
  location_id?:     string | null;
  lifecycle_state?: LifecycleState;
  external_idp_refs?: Record<string, unknown>;
  source_system?:   string;       // e.g. 'scim', 'azure_ad', 'role-profile-service'
}

export interface RoleProfileRow {
  profile_id:       string;
  tenant_id:        string;
  user_id:          string;
  role_code:        string;
  scope:            string;
  permissions:      string[];
  lifecycle_state:  LifecycleState;
  external_idp_refs: Record<string, unknown>;
  source_system:    string;
  version:          number;
  created_at:       string;
  updated_at:       string;
}

const GUC = `SET LOCAL app.via_role_profile = 'true'`;

async function logSync(client: any, params: {
  acceptor_id?: string; direction: 'pull'|'push'|'reconcile';
  tenant_id?: string; user_id?: string; role_code?: string;
  outcome: 'ok'|'error'|'skipped'|'rejected'; profile_id?: string|null;
  details?: Record<string, unknown>;
}) {
  try {
    await client.query(
      `INSERT INTO dos.role_profile_sync_log
         (acceptor_id, direction, profile_id, tenant_id, user_id, role_code, outcome, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
      [
        params.acceptor_id ?? 'internal.role-profile-service',
        params.direction,
        params.profile_id ?? null,
        params.tenant_id ?? null,
        params.user_id ?? null,
        params.role_code ?? null,
        params.outcome,
        JSON.stringify(params.details ?? {}),
      ],
    );
  } catch (err) {
    logger.warn('[RoleProfileService] sync-log insert failed', { error: toErrorMessage(err) });
  }
}

/**
 * Upsert a role-profile. Projects to URA via trigger.
 * Returns the canonical row.
 */
export async function upsert(input: RoleProfileInput): Promise<RoleProfileRow> {
  const scope            = input.scope ?? 'tenant';
  const permissions      = input.permissions ?? [];
  const lifecycle_state  = input.lifecycle_state ?? 'active';
  const external_idp_refs= input.external_idp_refs ?? {};
  const source_system    = input.source_system ?? 'role-profile-service';

  return await withTenantClient(input.tenant_id, async (c) => {
    await c.query('BEGIN');
    try {
      await c.query(GUC);
      const result = await c.query(
        `INSERT INTO dos.role_profile_sync
           (tenant_id, user_id, role_code, scope, permissions,
            business_unit_id, location_id, lifecycle_state,
            external_idp_refs, source_system)
         VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8,$9::jsonb,$10)
         ON CONFLICT (tenant_id, user_id, role_code, scope)
           DO UPDATE SET
             permissions       = EXCLUDED.permissions,
             business_unit_id  = EXCLUDED.business_unit_id,
             location_id       = EXCLUDED.location_id,
             lifecycle_state   = EXCLUDED.lifecycle_state,
             external_idp_refs = EXCLUDED.external_idp_refs,
             source_system     = EXCLUDED.source_system
         RETURNING *`,
        [
          input.tenant_id, input.user_id, input.role_code, scope, permissions,
          input.business_unit_id ?? null, input.location_id ?? null, lifecycle_state,
          JSON.stringify(external_idp_refs), source_system,
        ],
      );
      const row = result.rows[0] as RoleProfileRow;
      await logSync(c, {
        direction: 'push', tenant_id: row.tenant_id, user_id: row.user_id,
        role_code: row.role_code, profile_id: row.profile_id, outcome: 'ok',
        details: { source_system },
      });
      await c.query('COMMIT');
      logger.info('[RoleProfileService] upsert', {
        tenant_id: row.tenant_id, user_id: row.user_id, role_code: row.role_code,
        scope: row.scope, version: row.version, source_system,
      });
      return row;
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      await logSync(c, {
        direction: 'push', tenant_id: input.tenant_id, user_id: input.user_id,
        role_code: input.role_code, outcome: 'error',
        details: { error: toErrorMessage(err) },
      });
      throw err;
    }
  });
}

/** Revoke (DELETE) a role-profile. Cascades to URA via trigger. */
export async function revoke(args: {
  tenant_id: string; user_id: string; role_code: string; scope?: string;
}): Promise<boolean> {
  const scope = args.scope ?? 'tenant';
  return await withTenantClient(args.tenant_id, async (c) => {
    await c.query('BEGIN');
    try {
      await c.query(GUC);
      const r = await c.query(
        `DELETE FROM dos.role_profile_sync
          WHERE tenant_id=$1 AND user_id=$2 AND role_code=$3 AND scope=$4
          RETURNING profile_id`,
        [args.tenant_id, args.user_id, args.role_code, scope],
      );
      const removed = r.rowCount > 0;
      await logSync(c, {
        direction: 'push', tenant_id: args.tenant_id, user_id: args.user_id,
        role_code: args.role_code, outcome: removed ? 'ok' : 'skipped',
        profile_id: r.rows[0]?.profile_id ?? null,
        details: { op: 'revoke' },
      });
      await c.query('COMMIT');
      return removed;
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    }
  });
}

/** List role-profiles for a user. Read-only. */
export async function listForUser(tenantId: string, userId: string): Promise<RoleProfileRow[]> {
  return await withTenantClient(tenantId, async (c) => {
    const r = await c.query(
      `SELECT * FROM dos.role_profile_sync
        WHERE tenant_id=$1 AND user_id=$2
        ORDER BY role_code, scope`,
      [tenantId, userId],
    );
    return r.rows as RoleProfileRow[];
  });
}

export const RoleProfileService = { upsert, revoke, listForUser };

import { withTenantClient } from '@dos/db';
import { userMetrics } from '../observability/metrics';
import { UserServiceError } from './contracts/user-errors';

export interface ViewPreferenceRecord {
  module_code: string;
  view_key: string;
  config: Record<string, unknown>;
  is_shared: boolean;
  updated_at: string;
}

export interface SharedViewPreferenceRecord extends ViewPreferenceRecord {
  user_id: string;
}

const MODULE_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const VIEW_RE = /^[a-z][a-z0-9_-]{0,63}$/;
const MAX_CONFIG_BYTES = 64 * 1024;

export function assertModuleView(moduleCode: string, viewKey: string): void {
  if (!MODULE_RE.test(moduleCode) || !VIEW_RE.test(viewKey)) {
    throw new UserServiceError('VIEW_PREF_INVALID_KEY', undefined, { moduleCode, viewKey });
  }
}

function assertConfigSize(config: unknown): void {
  const json = JSON.stringify(config ?? {});
  if (Buffer.byteLength(json, 'utf8') > MAX_CONFIG_BYTES) {
    throw new UserServiceError('VIEW_PREF_CONFIG_TOO_LARGE', undefined, { limit: MAX_CONFIG_BYTES });
  }
}

export async function listForUser(
  tenantId: string,
  userId: string,
  moduleFilter?: string,
): Promise<ViewPreferenceRecord[]> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const where = moduleFilter ? 'AND module_code = $3' : '';
      const params: unknown[] = [userId, tenantId];
      if (moduleFilter) params.push(moduleFilter);
      const result = await c.query(
        `SELECT module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE user_id = $1::uuid AND tenant_id = $2 ${where}
          ORDER BY module_code ASC, view_key ASC`,
        params,
      );
      return result.rows as ViewPreferenceRecord[];
    });
  } finally {
    userMetrics.observeDb('viewPref.list', Date.now() - start);
  }
}

export async function getOne(
  tenantId: string,
  userId: string,
  moduleCode: string,
  viewKey: string,
): Promise<ViewPreferenceRecord | null> {
  assertModuleView(moduleCode, viewKey);
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `SELECT module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE user_id = $1::uuid AND tenant_id = $2
            AND module_code = $3 AND view_key = $4`,
        [userId, tenantId, moduleCode, viewKey],
      );
      return (result.rows[0] as ViewPreferenceRecord) || null;
    });
  } finally {
    userMetrics.observeDb('viewPref.getOne', Date.now() - start);
  }
}

export async function upsert(
  tenantId: string,
  userId: string,
  moduleCode: string,
  viewKey: string,
  input: { config: Record<string, unknown>; isShared?: boolean | null },
  opts: { canShare: boolean } = { canShare: false },
): Promise<ViewPreferenceRecord> {
  assertModuleView(moduleCode, viewKey);
  assertConfigSize(input.config);
  if (input.isShared === true && !opts.canShare) {
    throw new UserServiceError('VIEW_PREF_SHARE_FORBIDDEN');
  }

  const start = Date.now();
  try {
    const row = await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `INSERT INTO public.user_view_preferences
           (user_id, tenant_id, module_code, view_key, config, is_shared, created_at, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb, COALESCE($6, FALSE), NOW(), NOW())
         ON CONFLICT (tenant_id, user_id, module_code, view_key) DO UPDATE
           SET config = EXCLUDED.config,
               is_shared = EXCLUDED.is_shared,
               updated_at = NOW()
         RETURNING module_code, view_key, config, is_shared, updated_at`,
        [userId, tenantId, moduleCode, viewKey, JSON.stringify(input.config ?? {}), input.isShared ?? null],
      );
      return result.rows[0] as ViewPreferenceRecord;
    });
    userMetrics.viewPrefUpsert(tenantId);
    return row;
  } finally {
    userMetrics.observeDb('viewPref.upsert', Date.now() - start);
  }
}

export async function remove(
  tenantId: string,
  userId: string,
  moduleCode: string,
  viewKey: string,
): Promise<number> {
  assertModuleView(moduleCode, viewKey);
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const result = await c.query(
        `DELETE FROM public.user_view_preferences
           WHERE user_id = $1::uuid AND tenant_id = $2
             AND module_code = $3 AND view_key = $4`,
        [userId, tenantId, moduleCode, viewKey],
      );
      return result.rowCount ?? 0;
    });
  } finally {
    userMetrics.observeDb('viewPref.delete', Date.now() - start);
  }
}

export async function listShared(
  tenantId: string,
  moduleFilter?: string,
): Promise<SharedViewPreferenceRecord[]> {
  const start = Date.now();
  try {
    return await withTenantClient(tenantId, async (c) => {
      const where = moduleFilter ? 'AND module_code = $2' : '';
      const params: unknown[] = [tenantId];
      if (moduleFilter) params.push(moduleFilter);
      const result = await c.query(
        `SELECT user_id, module_code, view_key, config, is_shared, updated_at
           FROM public.user_view_preferences
          WHERE tenant_id = $1 AND is_shared = TRUE ${where}
          ORDER BY module_code ASC, view_key ASC, updated_at DESC
          LIMIT 500`,
        params,
      );
      return result.rows as SharedViewPreferenceRecord[];
    });
  } finally {
    userMetrics.observeDb('viewPref.listShared', Date.now() - start);
  }
}

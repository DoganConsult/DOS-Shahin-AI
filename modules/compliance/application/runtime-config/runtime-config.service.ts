/**
 * Compliance runtime-config service.
 *
 * Owns: list / detail / form / filters / columns / actions / views config records,
 *       plus per-user saved view presets and sharing.
 *
 * Storage: `compliance_module_config` (tenant_id NULL = platform template; tenant
 *          row overrides) and `compliance_user_view_preferences`.
 *
 * Tenant safety: every cache key includes tenantId; every read selects the
 * tenant row first and falls back to the template only when no tenant row exists.
 */
import type { DbClient } from '../../db/runner';

export type ConfigKind = 'list' | 'detail' | 'form' | 'filters' | 'columns' | 'actions' | 'views';

export interface ConfigDescriptor {
  kind: ConfigKind;
  type: string;
  tenantId?: string | null;
  version?: number;
}

export interface ConfigRecord<P = unknown> extends ConfigDescriptor {
  id: number;
  payload: P;
  source: 'tenant' | 'template';
  updatedAt: string;
}

export interface SaveViewPresetInput {
  tenantId: string;
  userId: string;
  scopeType: string;
  viewKey: string;
  payload: unknown;
}

export interface ShareViewPresetInput extends SaveViewPresetInput {
  sharedWith?: string[]; // empty = share tenant-wide
}

export interface RuntimeConfigCache {
  get(key: string): ConfigRecord | undefined;
  set(key: string, value: ConfigRecord): void;
  invalidate(prefix: string): void;
}

const memCache: RuntimeConfigCache = (() => {
  const m = new Map<string, ConfigRecord>();
  return {
    get: (k) => m.get(k),
    set: (k, v) => { m.set(k, v); },
    invalidate: (p) => {
      for (const k of m.keys()) if (k.startsWith(p)) m.delete(k);
    },
  };
})();

const cacheKey = (d: ConfigDescriptor): string =>
  `compliance:cfg:${d.tenantId ?? 'template'}:${d.kind}:${d.type}:${d.version ?? 'latest'}`;

export interface RuntimeConfigDeps {
  client: DbClient;
  cache?: RuntimeConfigCache;
}

export async function getConfig<P = unknown>(
  deps: RuntimeConfigDeps,
  d: ConfigDescriptor,
): Promise<ConfigRecord<P> | null> {
  const cache = deps.cache ?? memCache;
  const key = cacheKey(d);
  const cached = cache.get(key);
  if (cached) return cached as ConfigRecord<P>;

  // Prefer tenant override, then template (tenant_id IS NULL).
  const r = await deps.client.query<{ id: number; payload: P; updated_at: string; tenant_id: string | null; version: number }>(
    `SELECT id, payload, updated_at, tenant_id, version
     FROM compliance_module_config
     WHERE kind = $1 AND type = $2
       AND (tenant_id = $3 OR ($3 IS NOT NULL AND tenant_id IS NULL) OR ($3 IS NULL AND tenant_id IS NULL))
     ORDER BY (tenant_id IS NOT NULL) DESC, version DESC
     LIMIT 1`,
    [d.kind, d.type, d.tenantId ?? null],
  );
  if (r.rowCount === 0) return null;
  const row = r.rows[0];
  const rec: ConfigRecord<P> = {
    id: row.id,
    kind: d.kind,
    type: d.type,
    tenantId: row.tenant_id,
    version: row.version,
    payload: row.payload,
    source: row.tenant_id ? 'tenant' : 'template',
    updatedAt: row.updated_at,
  };
  cache.set(key, rec);
  return rec;
}

export async function saveConfig<P = unknown>(
  deps: RuntimeConfigDeps,
  d: ConfigDescriptor,
  payload: P,
  actorId?: string,
): Promise<ConfigRecord<P>> {
  const version = d.version ?? 1;
  await deps.client.query(
    `INSERT INTO compliance_module_config (tenant_id, kind, type, version, payload, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
     ON CONFLICT (tenant_id, kind, type, version) DO UPDATE SET
       payload = EXCLUDED.payload,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [d.tenantId ?? null, d.kind, d.type, version, JSON.stringify(payload), actorId ?? null],
  );
  (deps.cache ?? memCache).invalidate(`compliance:cfg:${d.tenantId ?? 'template'}:${d.kind}:${d.type}:`);
  const rec = await getConfig<P>(deps, { ...d, version });
  if (!rec) throw new Error('[compliance] saveConfig wrote but read returned null');
  return rec;
}

export async function listViews(
  deps: RuntimeConfigDeps,
  input: { tenantId: string; userId: string; scopeType: string },
): Promise<Array<{ viewKey: string; payload: unknown; isShared: boolean; updatedAt: string }>> {
  const r = await deps.client.query<{ view_key: string; payload: unknown; is_shared: boolean; updated_at: string }>(
    `SELECT view_key, payload, is_shared, updated_at
     FROM compliance_user_view_preferences
     WHERE tenant_id = $1
       AND scope_type = $2
       AND (
         user_id = $3
         OR (is_shared = TRUE AND (shared_with IS NULL OR $3 = ANY(shared_with)))
       )
     ORDER BY updated_at DESC`,
    [input.tenantId, input.scopeType, input.userId],
  );
  return r.rows.map((x) => ({
    viewKey: x.view_key,
    payload: x.payload,
    isShared: x.is_shared,
    updatedAt: x.updated_at,
  }));
}

export async function saveViewPreset(
  deps: RuntimeConfigDeps,
  input: SaveViewPresetInput,
): Promise<{ viewKey: string; updatedAt: string }> {
  await deps.client.query(
    `INSERT INTO compliance_user_view_preferences
       (tenant_id, user_id, view_key, scope_type, payload, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
     ON CONFLICT (tenant_id, user_id, scope_type, view_key) DO UPDATE SET
       payload = EXCLUDED.payload,
       updated_at = NOW()`,
    [input.tenantId, input.userId, input.viewKey, input.scopeType, JSON.stringify(input.payload)],
  );
  return { viewKey: input.viewKey, updatedAt: new Date().toISOString() };
}

export async function shareViewPreset(
  deps: RuntimeConfigDeps,
  input: ShareViewPresetInput,
): Promise<{ viewKey: string; isShared: boolean; sharedWith: string[] | null }> {
  await deps.client.query(
    `INSERT INTO compliance_user_view_preferences
       (tenant_id, user_id, view_key, scope_type, payload, is_shared, shared_with, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, TRUE, $6, NOW())
     ON CONFLICT (tenant_id, user_id, scope_type, view_key) DO UPDATE SET
       payload = EXCLUDED.payload,
       is_shared = TRUE,
       shared_with = EXCLUDED.shared_with,
       updated_at = NOW()`,
    [
      input.tenantId,
      input.userId,
      input.viewKey,
      input.scopeType,
      JSON.stringify(input.payload),
      input.sharedWith && input.sharedWith.length > 0 ? input.sharedWith : null,
    ],
  );
  return {
    viewKey: input.viewKey,
    isShared: true,
    sharedWith: input.sharedWith && input.sharedWith.length > 0 ? input.sharedWith : null,
  };
}

export async function deleteViewPreset(
  deps: RuntimeConfigDeps,
  input: { tenantId: string; userId: string; scopeType: string; viewKey: string },
): Promise<{ deleted: boolean }> {
  const r = await deps.client.query(
    `DELETE FROM compliance_user_view_preferences
     WHERE tenant_id = $1 AND user_id = $2 AND scope_type = $3 AND view_key = $4`,
    [input.tenantId, input.userId, input.scopeType, input.viewKey],
  );
  return { deleted: (r.rowCount ?? 0) > 0 };
}

export const __testing__ = { memCache, cacheKey };

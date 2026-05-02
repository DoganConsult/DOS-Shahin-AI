import { safeQuery, tenantSchema } from '@dos/db';

export interface ModuleUserContext {
  userId: string;
  moduleCode: string;
  tenantId: string;
  preferences: Record<string, unknown>;
  state: Record<string, unknown>;
  lastAccessedAt: string | null;
  updatedAt: string;
}

const _registry = new Map<string, ModuleUserContext>();

function contextKey(tenantId: string, userId: string, moduleCode: string): string {
  return `${tenantId}:${userId}:${moduleCode}`;
}

export async function setModuleUserContext(
  tenantId: string,
  userId: string,
  moduleCode: string,
  context: { preferences?: Record<string, unknown>; state?: Record<string, unknown> },
): Promise<ModuleUserContext> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".module_user_contexts
       (user_id, module_code, preferences, state, last_accessed_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (user_id, module_code) DO UPDATE
       SET preferences = COALESCE(EXCLUDED.preferences, module_user_contexts.preferences),
           state = COALESCE(EXCLUDED.state, module_user_contexts.state),
           last_accessed_at = NOW(),
           updated_at = NOW()
     RETURNING *`,
    [userId, moduleCode, JSON.stringify(context.preferences ?? {}), JSON.stringify(context.state ?? {})],
  );
  const row = rows[0] ?? {};
  const ctx: ModuleUserContext = {
    userId,
    moduleCode,
    tenantId,
    preferences: (row['preferences'] as Record<string, unknown>) ?? context.preferences ?? {},
    state: (row['state'] as Record<string, unknown>) ?? context.state ?? {},
    lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
    updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
  };
  _registry.set(contextKey(tenantId, userId, moduleCode), ctx);
  return ctx;
}

export function getModuleContextRegistry(): Map<string, ModuleUserContext> {
  return new Map(_registry);
}

export async function getModuleUserContext(
  tenantId: string,
  userId: string,
  moduleCode: string,
): Promise<ModuleUserContext | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".module_user_contexts
     WHERE user_id = $1 AND module_code = $2
     LIMIT 1`,
    [userId, moduleCode],
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    userId,
    moduleCode,
    tenantId,
    preferences: (row['preferences'] as Record<string, unknown>) ?? {},
    state: (row['state'] as Record<string, unknown>) ?? {},
    lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
    updatedAt: String(row['updated_at'] ?? ''),
  };
}

export async function getAllUserModuleContexts(
  tenantId: string,
  userId: string,
): Promise<ModuleUserContext[]> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".module_user_contexts WHERE user_id = $1 ORDER BY module_code`,
    [userId],
  );
  return rows.map(row => ({
    userId,
    moduleCode: String(row['module_code']),
    tenantId,
    preferences: (row['preferences'] as Record<string, unknown>) ?? {},
    state: (row['state'] as Record<string, unknown>) ?? {},
    lastAccessedAt: row['last_accessed_at'] != null ? String(row['last_accessed_at']) : null,
    updatedAt: String(row['updated_at'] ?? ''),
  }));
}

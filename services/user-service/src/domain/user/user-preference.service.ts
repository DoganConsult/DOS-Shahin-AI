import { safeQuery, tenantSchema } from '@dos/db';

export interface UserPreferences {
  userId: string;
  tenantId: string;
  moduleCode: string | null;
  preferences: Record<string, unknown>;
  updatedAt: string;
}

export async function getUserPreferences(
  tenantId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT preferences FROM "${schema}".user_preferences
     WHERE user_id = $1 AND module_code IS NULL
     LIMIT 1`,
    [userId],
  );
  return (rows[0]?.['preferences'] as Record<string, unknown>) ?? {};
}

export async function getModulePreferences(
  tenantId: string,
  userId: string,
  moduleCode: string,
): Promise<Record<string, unknown>> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT preferences FROM "${schema}".user_preferences
     WHERE user_id = $1 AND module_code = $2
     LIMIT 1`,
    [userId, moduleCode],
  );
  return (rows[0]?.['preferences'] as Record<string, unknown>) ?? {};
}

export async function setUserPreferences(
  tenantId: string,
  userId: string,
  preferences: Record<string, unknown>,
  moduleCode?: string,
): Promise<UserPreferences> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".user_preferences
       (user_id, module_code, preferences)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, COALESCE(module_code, '__global__')) DO UPDATE
       SET preferences = "${schema}".user_preferences.preferences || EXCLUDED.preferences,
           updated_at = NOW()
     RETURNING *`,
    [userId, moduleCode ?? null, JSON.stringify(preferences)],
  );
  const row = rows[0] ?? {};
  return {
    userId,
    tenantId,
    moduleCode: moduleCode ?? null,
    preferences: (row['preferences'] as Record<string, unknown>) ?? preferences,
    updatedAt: String(row['updated_at'] ?? new Date().toISOString()),
  };
}

/**
 * Settings service — tenant-scoped key/value config over `<tenant_schema>.compliance_settings`.
 *
 * UNIQUE(tenant_id, config_key) — upsertSetting handles insert-or-update via
 * INSERT ... ON CONFLICT (tenant_id, config_key) DO UPDATE.
 *
 * scope enum: 'tenant' | 'org' | 'user' (free-form text in DB; constrained here).
 */
import type { DbClient } from '../../db/runner';

export type SettingScope = 'tenant' | 'org' | 'user';

export interface SettingRow {
  id: string;
  tenantId: string;
  configKey: string;
  configValue: Record<string, unknown>;
  scope: SettingScope;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListSettingsInput {
  tenantSchema: string;
  tenantId: string;
  scope?: SettingScope;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface UpsertSettingInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  configKey: string;
  configValue: Record<string, unknown>;
  scope?: SettingScope;
  isActive?: boolean;
}

export interface DeactivateSettingInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const SCOPES: ReadonlySet<SettingScope> = new Set(['tenant', 'org', 'user']);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertScope(s: string): asserts s is SettingScope {
  if (!SCOPES.has(s as SettingScope)) throw Object.assign(new Error(`bad_scope:${s}`), { code: 'bad_scope' });
}

const COLS = `id, tenant_id, config_key, config_value, scope, is_active,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; config_key: string;
  config_value: Record<string, unknown>;
  scope: SettingScope; is_active: boolean;
  created_at: string; updated_at: string;
}): SettingRow => ({
  id: x.id, tenantId: x.tenant_id, configKey: x.config_key,
  configValue: x.config_value ?? {}, scope: x.scope, isActive: x.is_active,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listSettings(
  client: DbClient,
  input: ListSettingsInput,
): Promise<{ rows: SettingRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.scope) { assertScope(input.scope); params.push(input.scope); where += ` AND scope = $${params.length}`; }
  if (typeof input.isActive === 'boolean') { params.push(input.isActive); where += ` AND is_active = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_settings
     WHERE ${where} ORDER BY config_key ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_settings WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getSetting(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<SettingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_settings
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function getSettingByKey(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; configKey: string },
): Promise<SettingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_settings
     WHERE tenant_id = $1 AND config_key = $2`,
    [input.tenantId, input.configKey],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function upsertSetting(
  client: DbClient,
  input: UpsertSettingInput,
): Promise<SettingRow> {
  assertSchema(input.tenantSchema);
  if (!input.configKey) {
    throw Object.assign(new Error('configKey required'), { code: 'bad_input' });
  }
  if (!input.configValue || typeof input.configValue !== 'object') {
    throw Object.assign(new Error('configValue must be an object'), { code: 'bad_input' });
  }
  if (input.scope) assertScope(input.scope);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_settings
       (tenant_id, config_key, config_value, scope, is_active)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     ON CONFLICT (tenant_id, config_key) DO UPDATE
       SET config_value = EXCLUDED.config_value,
           scope = EXCLUDED.scope,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()
     RETURNING ${COLS}`,
    [
      input.tenantId, input.configKey,
      JSON.stringify(input.configValue),
      input.scope ?? 'tenant',
      input.isActive ?? true,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deactivateSetting(
  client: DbClient,
  input: DeactivateSettingInput,
): Promise<SettingRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_settings
        SET is_active = FALSE, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

import type { DbPool } from '../db.js';

export interface ThemeToken {
  id: string;
  module_code: string | null;
  token_key: string;
  token_value: string;
  scope: string;
  route: string | null;
  is_active: boolean;
}

export interface ThemeBundle {
  tokens: ThemeToken[];
  preview?: ThemeToken[];
}

export interface ThemePatch {
  tokens: Array<{
    token_key: string;
    token_value: string;
    scope?: string;
    module_code?: string | null;
    route?: string | null;
  }>;
}

export class UiOsThemeManager {
  constructor(private readonly pool: DbPool) {}

  async get(tenantId: string, moduleCode?: string | null): Promise<ThemeBundle> {
    const { rows } = await this.pool.query<ThemeToken>(
      `SELECT id::text AS id, module_code, token_key, token_value, scope, route, is_active
         FROM dos.dynamic_ui_theme_tokens
        WHERE is_active = TRUE
          AND (tenant_id IS NULL OR tenant_id = $1)
          AND ($2::text IS NULL OR module_code = $2 OR module_code IS NULL)
        ORDER BY scope, module_code NULLS FIRST, token_key`,
      [tenantId, moduleCode ?? null],
    );
    return { tokens: rows };
  }

  async upsert(tenantId: string, patch: ThemePatch): Promise<ThemeBundle> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of patch.tokens) {
        await client.query(
          `INSERT INTO dos.dynamic_ui_theme_tokens
             (tenant_id, module_code, token_key, token_value, scope, route, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,TRUE)
           ON CONFLICT DO NOTHING`,
          [tenantId, t.module_code ?? null, t.token_key, t.token_value, t.scope ?? 'tenant', t.route ?? null],
        );
        await client.query(
          `UPDATE dos.dynamic_ui_theme_tokens
              SET token_value = $4, is_active = TRUE
            WHERE tenant_id = $1
              AND COALESCE(module_code,'') = COALESCE($2,'')
              AND token_key = $3`,
          [tenantId, t.module_code ?? null, t.token_key, t.token_value],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return this.get(tenantId);
  }

  async preview(tenantId: string, patch: ThemePatch): Promise<ThemeBundle> {
    const base = await this.get(tenantId);
    const map = new Map<string, ThemeToken>();
    for (const t of base.tokens) map.set(`${t.module_code ?? ''}:${t.token_key}`, t);
    for (const t of patch.tokens) {
      const k = `${t.module_code ?? ''}:${t.token_key}`;
      const existing = map.get(k);
      map.set(k, {
        id: existing?.id ?? 'preview',
        module_code: t.module_code ?? null,
        token_key: t.token_key,
        token_value: t.token_value,
        scope: t.scope ?? existing?.scope ?? 'tenant',
        route: t.route ?? existing?.route ?? null,
        is_active: true,
      });
    }
    return { tokens: Array.from(map.values()), preview: patch.tokens.map((t) => ({
      id: 'preview', module_code: t.module_code ?? null, token_key: t.token_key,
      token_value: t.token_value, scope: t.scope ?? 'tenant', route: t.route ?? null, is_active: true,
    })) };
  }

  async publish(tenantId: string, patch: ThemePatch): Promise<ThemeBundle> {
    return this.upsert(tenantId, patch);
  }
}

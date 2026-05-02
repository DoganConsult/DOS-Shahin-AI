import type { DbPool } from '../db.js';

export interface GridState {
  grid_key: string;
  module_code: string | null;
  route_key: string | null;
  column_state: Record<string, unknown>;
  sort_state: unknown;
  filter_state: Record<string, unknown>;
  pagination_state: Record<string, unknown>;
  density: string | null;
}

export interface GridStatePatch {
  module_code?: string | null;
  route_key?: string | null;
  column_state?: Record<string, unknown>;
  sort_state?: unknown;
  filter_state?: Record<string, unknown>;
  pagination_state?: Record<string, unknown>;
  density?: string;
}

export interface GridView {
  id: string;
  view_key: string;
  name: string;
  description: string | null;
  module_code: string | null;
  route_key: string | null;
  view_config: Record<string, unknown>;
  is_default: boolean;
  is_shared: boolean;
}

export interface GridViewCreate {
  view_key: string;
  name: string;
  description?: string | null;
  module_code?: string | null;
  route_key?: string | null;
  view_config?: Record<string, unknown>;
  is_default?: boolean;
  is_shared?: boolean;
}

const EMPTY: GridState = {
  grid_key: '',
  module_code: null,
  route_key: null,
  column_state: {},
  sort_state: [],
  filter_state: {},
  pagination_state: {},
  density: 'comfortable',
};

export class UiOsGridStateManager {
  constructor(private readonly pool: DbPool) {}

  async get(tenantId: string, userId: string, gridKey: string): Promise<GridState> {
    const { rows } = await this.pool.query<GridState>(
      `SELECT grid_key, module_code, route_key,
              column_state, sort_state, filter_state, pagination_state, density
         FROM dos.ui_data_grid_states
        WHERE tenant_id = $1 AND user_id = $2 AND grid_key = $3
        LIMIT 1`,
      [tenantId, userId, gridKey],
    );
    if (rows.length === 0) return { ...EMPTY, grid_key: gridKey };
    return rows[0];
  }

  async upsert(tenantId: string, userId: string, gridKey: string, patch: GridStatePatch): Promise<GridState> {
    const current = await this.get(tenantId, userId, gridKey);
    const merged: GridState = {
      grid_key: gridKey,
      module_code: patch.module_code ?? current.module_code,
      route_key: patch.route_key ?? current.route_key,
      column_state: patch.column_state ?? current.column_state,
      sort_state: patch.sort_state ?? current.sort_state,
      filter_state: patch.filter_state ?? current.filter_state,
      pagination_state: patch.pagination_state ?? current.pagination_state,
      density: patch.density ?? current.density,
    };
    await this.pool.query(
      `INSERT INTO dos.ui_data_grid_states
        (tenant_id, user_id, grid_key, module_code, route_key,
         column_state, sort_state, filter_state, pagination_state, density, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10, NOW())
       ON CONFLICT (tenant_id, user_id, grid_key) DO UPDATE
         SET module_code      = EXCLUDED.module_code,
             route_key        = EXCLUDED.route_key,
             column_state     = EXCLUDED.column_state,
             sort_state       = EXCLUDED.sort_state,
             filter_state     = EXCLUDED.filter_state,
             pagination_state = EXCLUDED.pagination_state,
             density          = EXCLUDED.density,
             updated_at       = NOW()`,
      [
        tenantId, userId, gridKey,
        merged.module_code, merged.route_key,
        JSON.stringify(merged.column_state),
        JSON.stringify(merged.sort_state),
        JSON.stringify(merged.filter_state),
        JSON.stringify(merged.pagination_state),
        merged.density,
      ],
    );
    return merged;
  }

  async reset(tenantId: string, userId: string, gridKey: string): Promise<GridState> {
    await this.pool.query(
      `DELETE FROM dos.ui_data_grid_states
        WHERE tenant_id = $1 AND user_id = $2 AND grid_key = $3`,
      [tenantId, userId, gridKey],
    );
    return { ...EMPTY, grid_key: gridKey };
  }

  async listViews(tenantId: string, userId: string, gridKey: string): Promise<GridView[]> {
    const { rows } = await this.pool.query<GridView>(
      `SELECT id::text AS id, view_key, name, description,
              module_code, route_key, view_config, is_default, is_shared
         FROM dos.ui_saved_views
        WHERE tenant_id = $1
          AND (user_id = $2 OR is_shared = TRUE OR user_id IS NULL)
          AND view_key LIKE $3 || ':%'
        ORDER BY is_default DESC, name`,
      [tenantId, userId, gridKey],
    );
    return rows;
  }

  async createView(tenantId: string, userId: string, gridKey: string, body: GridViewCreate): Promise<GridView> {
    const fullKey = `${gridKey}:${body.view_key}`;
    const { rows } = await this.pool.query<GridView>(
      `INSERT INTO dos.ui_saved_views
        (tenant_id, user_id, view_key, scope, module_code, route_key,
         entity_type, name, description, view_config, is_default, is_shared)
       VALUES ($1,$2,$3,'user',$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
       RETURNING id::text AS id, view_key, name, description,
                 module_code, route_key, view_config, is_default, is_shared`,
      [
        tenantId, userId, fullKey,
        body.module_code ?? null,
        body.route_key ?? null,
        gridKey,
        body.name,
        body.description ?? null,
        JSON.stringify(body.view_config ?? {}),
        body.is_default ?? false,
        body.is_shared ?? false,
      ],
    );
    return rows[0];
  }
}

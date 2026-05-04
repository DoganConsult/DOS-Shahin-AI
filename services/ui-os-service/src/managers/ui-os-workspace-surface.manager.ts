// =====================================================================
// WS-DB-2 — Workspace surface content manager.
//
// Reads the seven workspace content catalogs that back the
// `WorkspaceResolverService` rewrite (per
// platform/ui-system/module_ui_os_contract-pack/workspace-db-driven-rewrite-plan.md):
//
//   1. dos.dynamic_ui_setup_steps
//   2. dos.dynamic_ui_quick_actions
//   3. dos.dynamic_ui_ai_tips
//   4. dos.dynamic_ui_health_probes
//   5. dos.dynamic_ui_page_headers     (route-scoped)
//   6. dos.dynamic_ui_grid_columns     (scope-scoped)
//   7. dos.dynamic_ui_empty_states
//
// Tenant-overlay rule: rows with `tenant_id = $tenant` win over rows
// with `tenant_id IS NULL` (platform default), de-duped by the natural
// key (step_key / action_key / col_key / probe_key / state_key).
// =====================================================================
import type { DbPool } from '../db.js';

export interface DbSetupStep {
  step_key: string;
  label_key: string;
  description_key: string | null;
  icon: string | null;
  route: string;
  required_permission: string | null;
  sort_order: number;
  condition_kind: string;
  condition_payload: unknown;
}

export interface DbQuickAction {
  action_key: string;
  surface_key: string;
  eyebrow_key: string | null;
  label_key: string;
  description_key: string | null;
  icon: string | null;
  route: string;
  required_permission: string | null;
  sort_order: number;
  variant: string;
  tone: string;
}

export interface DbAiTip {
  tip_key: string;
  title_key: string;
  body_key: string;
  cta_label_key: string | null;
  cta_route: string | null;
  icon: string | null;
  condition_kind: string;
  condition_payload: unknown;
  priority: number;
  required_permission: string | null;
}

export interface DbHealthProbe {
  probe_key: string;
  label_key: string;
  description_key: string | null;
  source_endpoint: string | null;
  source_kind: string;
  ok_threshold: unknown;
  required_permission: string;
  sort_order: number;
}

export interface DbPageHeader {
  route_key: string;
  variant: string;
  density: string;
  eyebrow_key: string | null;
  title_key: string;
  subtitle_key: string | null;
  gradient_token: string;
  mesh_layers: unknown;
  hairline_visible: boolean;
  hairline_token: string;
}

export interface DbGridColumn {
  col_key: string;
  scope: string;
  label_key: string;
  data_field: string;
  data_kind: string;
  format_payload: unknown;
  is_sortable: boolean;
  is_filterable: boolean;
  default_sort: 'asc' | 'desc' | null;
  sort_priority: number | null;
  align: string;
  is_visible: boolean;
  sort_order: number;
}

export interface DbEmptyState {
  state_key: string;
  title_key: string;
  description_key: string | null;
  tone: string;
  illustration: string | null;
  primary_label_key: string | null;
  primary_route: string | null;
  secondary_label_key: string | null;
  secondary_route: string | null;
}

function dedupeByKey<T>(rows: T[], keyField: keyof T): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) {
    const k = String(r[keyField]);
    if (!seen.has(k)) seen.set(k, r);
  }
  return [...seen.values()];
}

export class UiOsWorkspaceSurfaceManager {
  constructor(private readonly pool: DbPool) {}

  async listSetupSteps(tenantId: string | null): Promise<DbSetupStep[]> {
    const { rows } = await this.pool.query<DbSetupStep>(
      `SELECT step_key, label_key, description_key, icon, route,
              required_permission, sort_order, condition_kind, condition_payload
         FROM dos.dynamic_ui_setup_steps
        WHERE is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order, step_key`,
      [tenantId],
    );
    return dedupeByKey(rows, 'step_key');
  }

  async listQuickActions(tenantId: string | null, surfaceKey: string): Promise<DbQuickAction[]> {
    const { rows } = await this.pool.query<DbQuickAction>(
      `SELECT action_key, surface_key, eyebrow_key, label_key, description_key,
              icon, route, required_permission, sort_order, variant, tone
         FROM dos.dynamic_ui_quick_actions
        WHERE is_active = TRUE AND surface_key = $2
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order, action_key`,
      [tenantId, surfaceKey],
    );
    return dedupeByKey(rows, 'action_key');
  }

  async listAiTips(tenantId: string | null): Promise<DbAiTip[]> {
    const { rows } = await this.pool.query<DbAiTip>(
      `SELECT tip_key, title_key, body_key, cta_label_key, cta_route, icon,
              condition_kind, condition_payload, priority, required_permission
         FROM dos.dynamic_ui_workspace_ai_tips
        WHERE is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, priority, tip_key`,
      [tenantId],
    );
    return dedupeByKey(rows, 'tip_key');
  }

  async listHealthProbes(tenantId: string | null): Promise<DbHealthProbe[]> {
    const { rows } = await this.pool.query<DbHealthProbe>(
      `SELECT probe_key, label_key, description_key, source_endpoint, source_kind,
              ok_threshold, required_permission, sort_order
         FROM dos.dynamic_ui_health_probes
        WHERE is_active = TRUE
          AND (tenant_id = $1 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order, probe_key`,
      [tenantId],
    );
    return dedupeByKey(rows, 'probe_key');
  }

  async getPageHeader(routeKey: string, tenantId: string | null): Promise<DbPageHeader | null> {
    const { rows } = await this.pool.query<DbPageHeader>(
      `SELECT route_key, variant, density, eyebrow_key, title_key, subtitle_key,
              gradient_token, mesh_layers, hairline_visible, hairline_token
         FROM dos.dynamic_ui_workspace_page_headers
        WHERE route_key = $1 AND is_active = TRUE
          AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC
        LIMIT 1`,
      [routeKey, tenantId],
    );
    return rows[0] ?? null;
  }

  async listGridColumns(scope: string, tenantId: string | null): Promise<DbGridColumn[]> {
    const { rows } = await this.pool.query<DbGridColumn>(
      `SELECT col_key, scope, label_key, data_field, data_kind, format_payload,
              is_sortable, is_filterable, default_sort, sort_priority,
              align, is_visible, sort_order
         FROM dos.dynamic_ui_workspace_grid_columns
        WHERE scope = $1 AND is_active = TRUE
          AND (tenant_id = $2 OR tenant_id IS NULL)
        ORDER BY COALESCE(tenant_id, '*') DESC, sort_order, col_key`,
      [scope, tenantId],
    );
    return dedupeByKey(rows, 'col_key');
  }

  async listEmptyStates(): Promise<DbEmptyState[]> {
    const { rows } = await this.pool.query<DbEmptyState>(
      `SELECT state_key, title_key, description_key, tone, illustration,
              primary_label_key, primary_route, secondary_label_key, secondary_route
         FROM dos.dynamic_ui_empty_states
        WHERE is_active = TRUE
        ORDER BY state_key`,
    );
    return rows;
  }
}

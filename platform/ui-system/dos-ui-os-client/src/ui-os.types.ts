// Public DTO contract for the /api/ui-os/* surface owned by
// services/ui-os-service. Mirror — keep in sync with the manager-level
// shapes in services/ui-os-service/src/managers/*.ts. Any change to a
// response/request shape MUST land here in the same commit.

export interface UiOsBootstrapManifest {
  tenantId: string;
  userId: string;
  productCode: string | null;
  workspaceKey: string;
  preferences: UiOsPreferences;
  modules: UiOsBootstrapModule[];
  navigation: UiOsBootstrapNav[];
  routes: UiOsBootstrapRoute[];
  widgets: UiOsBootstrapWidget[];
  actions: UiOsBootstrapAction[];
  branding: UiOsBranding | null;
  locales: UiOsLocale[];
  workspace: UiOsWorkspaceState | null;
  announcements: UiOsAnnouncement[];
  generatedAt: string;
}

export interface UiOsPreferences {
  locale: string;
  timezone: string;
  direction: 'ltr' | 'rtl';
  appearance: 'system' | 'light' | 'dark';
  density: 'compact' | 'comfortable' | 'spacious';
  accent_color: string | null;
  default_module_code: string | null;
  preferences: Record<string, unknown>;
}

export interface UiOsBootstrapModule {
  module_code: string;
  display_name: string | null;
  default_route: string | null;
  product_key: string | null;
  registry_status: string | null;
  enrollment_status: string | null;
}

export interface UiOsBootstrapNav {
  id: string;
  module_code: string;
  label: string;
  route: string | null;
  sort_order: number;
  parent_id: string | null;
  readiness: string | null;
}

export interface UiOsBootstrapRoute {
  route_key: string;
  route: string;
  module_code: string;
  required_permission: string | null;
}

export interface UiOsBootstrapWidget {
  widget_key: string;
  module_code: string;
  component_token: string;
}

export interface UiOsBootstrapAction {
  action_key: string;
  module_code: string;
  label: string | null;
  required_permission: string | null;
}

export interface UiOsBranding {
  brand_name: string | null;
  logo_url: string | null;
  logo_dark_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  theme_tokens: Record<string, string>;
  css_overrides: Record<string, string>;
  login_background_url: string | null;
  landing_config: Record<string, unknown>;
}

export interface UiOsLocale {
  locale_code: string;
  native_name: string;
  english_name: string;
  direction: 'ltr' | 'rtl';
  is_default: boolean;
  is_active: boolean;
}

export interface UiOsWorkspaceState {
  workspace_key: string;
  product_code: string | null;
  active_module_code: string | null;
  active_route: string | null;
  open_apps: unknown[];
  panels: Record<string, unknown>;
  layout_snapshot: Record<string, unknown>;
  saved_at: string;
}

export interface UiOsAnnouncement {
  announcement_key: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  audience: string | null;
  title_key: string | null;
  body_key: string | null;
  cta_label_key: string | null;
  cta_url: string | null;
  is_dismissible: boolean;
}

export interface UiOsDashboard {
  id: string;
  dashboard_key: string;
  title_key: string | null;
  description_key: string | null;
  visibility: string;
  required_permission: string | null;
  role_codes: string[];
  layout_config: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
}

export interface UiOsDashboardWidget {
  id: string;
  dashboard_id: string;
  widget_key: string;
  instance_key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  instance_config: Record<string, unknown>;
  data_binding: Record<string, unknown>;
  required_permission: string | null;
  is_visible: boolean;
}

export interface UiOsGridState {
  grid_key: string;
  module_code: string | null;
  route_key: string | null;
  column_state: Record<string, unknown>;
  sort_state: unknown[];
  filter_state: Record<string, unknown>;
  pagination_state: Record<string, unknown>;
  density: string;
}

export interface UiOsSavedView {
  id: string;
  view_key: string;
  view_name: string | null;
  scope: string;
  config: Record<string, unknown>;
  is_default: boolean;
}

export interface UiOsTour {
  id: string;
  tour_key: string;
  title_key: string | null;
  description_key: string | null;
  steps: unknown[];
  required_permission: string | null;
  trigger_config: Record<string, unknown>;
  is_active: boolean;
}

export interface UiOsCommand {
  id: string;
  command_key: string;
  label_key: string | null;
  icon: string | null;
  scope: string | null;
  shortcut: string | null;
  required_permission: string | null;
  payload: Record<string, unknown>;
}

export interface UiOsTranslationMap {
  [namespace: string]: { [key: string]: string };
}

export interface UiOsAdminDraft {
  id: string;
  draft_key: string;
  target_type: string;
  target_key: string;
  status: 'draft' | 'submitted' | 'rejected' | 'published';
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  created_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UiOsPublishedVersion {
  id: string;
  target_type: string;
  target_key: string;
  version_number: number;
  draft_id: string | null;
  payload: Record<string, unknown>;
  published_by: string | null;
  published_at: string;
  is_current: boolean;
}

// ── Wave 11a-§5 Widgets — extended (per-tenant catalog instances) ──
export interface UiOsWidgetExtInstance {
  id: string;
  tenant_id: string;
  instance_key: string;
  widget_catalog_id: string;
  dashboard_id: string | null;
  page_layout_id: string | null;
  product_code: string | null;
  module_code: string | null;
  title_key: string | null;
  description_key: string | null;
  position_config: Record<string, unknown>;
  size_config: Record<string, unknown>;
  data_binding_id: string | null;
  required_permission: string | null;
  is_active: boolean;
}

export interface UiOsWidgetExtPermission {
  id: string;
  permission_code: string;
  effect: 'allow' | 'deny';
  role_code: string | null;
  user_id: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface UiOsWidgetExtRoleGrant {
  id: string;
  role_code: string;
  granted_at: string;
}

export interface UiOsWidgetExtBinding {
  id: string;
  widget_instance_id: string;
  binding_kind: 'rest' | 'graphql' | 'static' | 'temporal_workflow' | 'ai_query' | 'sql_view';
  endpoint_url: string | null;
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  request_template: Record<string, unknown>;
  response_mapping: Record<string, unknown>;
  cache_ttl_seconds: number;
  auth_secret_ref: string | null;
  is_active: boolean;
}

export interface UiOsWidgetExtRefreshPolicy {
  id: string;
  widget_instance_id: string;
  interval_seconds: number;
  refresh_on_event_codes: string[];
  pause_when_hidden: boolean;
  refresh_on_focus: boolean;
  is_active: boolean;
}

export interface UiOsWidgetExtErrorState {
  id: string;
  widget_instance_id: string;
  error_code: string;
  fallback_component_key: string | null;
  message_key: string | null;
  retry_strategy: 'manual' | 'linear' | 'exponential' | 'none';
  retry_max_attempts: number;
  is_active: boolean;
}

export interface UiOsWidgetExtVisibilityRule {
  id: string;
  widget_instance_id: string;
  rule_kind: 'permission' | 'role' | 'feature_flag' | 'expression' | 'module_status' | 'time_window' | 'tenant_attribute';
  rule_payload: Record<string, unknown>;
  effect: 'show' | 'hide';
  priority: number;
  is_active: boolean;
}

export interface UiOsWidgetExtPersonalization {
  id: string;
  widget_instance_id: string;
  user_id: string;
  personalization: Record<string, unknown>;
  is_collapsed: boolean;
  is_pinned: boolean;
  display_order: number | null;
  is_active: boolean;
}

export interface UiOsWidgetExtCategory {
  id: string;
  category_code: string;
  parent_category_id: string | null;
  display_name_key: string | null;
  description_key: string | null;
  display_order: number;
  icon_key: string | null;
  is_active: boolean;
}

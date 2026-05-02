import { z } from 'zod';

const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);

export const WidgetExtInstanceCreateSchema = z.object({
  instance_key: z.string().min(1).max(150),
  widget_catalog_id: UUID,
  dashboard_id: UUID.nullable().optional(),
  page_layout_id: UUID.nullable().optional(),
  product_code: z.string().max(100).nullable().optional(),
  module_code: z.string().max(100).nullable().optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  position_config: z.record(z.unknown()).optional(),
  size_config: z.record(z.unknown()).optional(),
  required_permission: z.string().max(150).nullable().optional(),
}).refine((b) => Boolean(b.dashboard_id) || Boolean(b.page_layout_id), {
  message: 'either dashboard_id or page_layout_id must be set',
});

export const WidgetExtInstancePatchSchema = z.object({
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  position_config: z.record(z.unknown()).optional(),
  size_config: z.record(z.unknown()).optional(),
  required_permission: z.string().max(150).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const WidgetExtPermissionSchema = z.object({
  permission_code: z.string().min(1).max(150),
  effect: z.enum(['allow', 'deny']),
  role_code: z.string().max(100).nullable().optional(),
  user_id: z.string().max(64).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const WidgetExtRoleGrantSchema = z.object({
  role_code: z.string().min(1).max(100),
});

export const WidgetExtBindingSchema = z.object({
  binding_kind: z.enum(['rest', 'graphql', 'static', 'temporal_workflow', 'ai_query', 'sql_view']),
  endpoint_url: z.string().nullable().optional(),
  http_method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  request_template: z.record(z.unknown()).optional(),
  response_mapping: z.record(z.unknown()).optional(),
  cache_ttl_seconds: z.number().int().min(0).optional(),
  auth_secret_ref: z.string().max(150).nullable().optional(),
});

export const WidgetExtRefreshPolicySchema = z.object({
  interval_seconds: z.number().int().min(0).max(86400).optional(),
  refresh_on_event_codes: z.array(z.string()).optional(),
  pause_when_hidden: z.boolean().optional(),
  refresh_on_focus: z.boolean().optional(),
});

export const WidgetExtErrorStateSchema = z.object({
  error_code: z.string().min(1).max(100),
  fallback_component_key: z.string().max(150).nullable().optional(),
  message_key: z.string().max(150).nullable().optional(),
  retry_strategy: z.enum(['manual', 'linear', 'exponential', 'none']).optional(),
  retry_max_attempts: z.number().int().min(0).max(10).optional(),
});

export const WidgetExtVisibilityRuleSchema = z.object({
  rule_kind: z.enum(['permission', 'role', 'feature_flag', 'expression', 'module_status', 'time_window', 'tenant_attribute']),
  rule_payload: z.record(z.unknown()).optional(),
  effect: z.enum(['show', 'hide']).optional(),
  priority: z.number().int().min(0).max(10000).optional(),
});

export const WidgetExtPersonalizationSchema = z.object({
  personalization: z.record(z.unknown()).optional(),
  is_collapsed: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  display_order: z.number().int().nullable().optional(),
});

export const WidgetExtCategorySchema = z.object({
  category_code: z.string().min(1).max(100),
  parent_category_id: UUID.nullable().optional(),
  display_name_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  display_order: z.number().int().min(0).optional(),
  icon_key: z.string().max(150).nullable().optional(),
});

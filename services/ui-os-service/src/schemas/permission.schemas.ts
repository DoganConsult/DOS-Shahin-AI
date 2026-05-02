import { z } from 'zod';

export const TargetKindEnum = z.enum([
  'route','page_layout','dashboard','widget_instance','action','form',
  'navigation_node','menu_item','tour','field','grid_column',
]);
export const PermEffectEnum = z.enum(['allow','deny']);
export const VisibilityEffectEnum = z.enum(['show','hide']);
export const VisibilityRuleKindEnum = z.enum([
  'permission','role','feature_flag','expression','module_status',
  'time_window','tenant_attribute',
]);

export const VisibilityRuleSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  rule_kind: VisibilityRuleKindEnum,
  rule_payload: z.record(z.string(), z.any()).optional(),
  effect: VisibilityEffectEnum.optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const VisibilityRuleUpdateSchema = z.object({
  rule_kind: VisibilityRuleKindEnum.optional(),
  rule_payload: z.record(z.string(), z.any()).optional(),
  effect: VisibilityEffectEnum.optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export const PermissionBindingSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  permission_code: z.string().min(1).max(150),
  effect: PermEffectEnum.optional(),
  is_active: z.boolean().optional(),
});

export const PolicyEvaluationSchema = z.object({
  policy_kind: z.string().min(1).max(60),
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  effect: PermEffectEnum,
  reason_code: z.string().max(150).nullable().optional(),
});

export const DeniedRenderSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().min(1).max(150),
  reason_code: z.string().min(1).max(150),
});

export const RoleLayoutAssignmentSchema = z.object({
  role_code: z.string().min(1).max(100),
  layout_template_id: z.string().uuid(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const RoleDashboardAssignmentSchema = z.object({
  role_code: z.string().min(1).max(100),
  dashboard_id: z.string().uuid(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const RoleNavigationAssignmentSchema = z.object({
  role_code: z.string().min(1).max(100),
  nav_node_key: z.string().min(1).max(150),
  effect: PermEffectEnum.optional(),
  is_active: z.boolean().optional(),
});

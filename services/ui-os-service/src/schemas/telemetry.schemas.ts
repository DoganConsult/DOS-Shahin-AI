import { z } from 'zod';
import { TargetKindEnum } from './permission.schemas.js';

export const DeviceKindEnum = z.enum(['desktop','tablet','mobile','tv','watch']);
export const CommandSurfaceEnum = z.enum([
  'palette','shortcut','menu','toolbar','context_menu','programmatic',
]);
export const ErrorKindEnum = z.enum([
  'render','api','permission','validation','timeout','network','unknown',
]);

export const PageViewSchema = z.object({
  route_key: z.string().min(1).max(200),
  referrer_route_key: z.string().max(200).nullable().optional(),
  duration_ms: z.number().int().min(0).nullable().optional(),
  device_kind: DeviceKindEnum.nullable().optional(),
});

export const ClickSchema = z.object({
  target_kind: TargetKindEnum,
  target_id: z.string().max(150).nullable().optional(),
  action_code: z.string().max(150).nullable().optional(),
  route_key: z.string().max(200).nullable().optional(),
});

export const CommandSchema = z.object({
  command_key: z.string().min(1).max(150),
  surface: CommandSurfaceEnum,
  result: z.string().max(40).nullable().optional(),
});

export const RenderPerfSchema = z.object({
  route_key: z.string().min(1).max(200),
  lcp_ms: z.number().int().min(0).nullable().optional(),
  inp_ms: z.number().int().min(0).nullable().optional(),
  cls: z.number().min(0).max(10).nullable().optional(),
  tbt_ms: z.number().int().min(0).nullable().optional(),
  fcp_ms: z.number().int().min(0).nullable().optional(),
  ttfb_ms: z.number().int().min(0).nullable().optional(),
});

export const ErrorSchema = z.object({
  route_key: z.string().max(200).nullable().optional(),
  error_code: z.string().min(1).max(150),
  error_kind: ErrorKindEnum,
  stack_hash: z.string().max(64).nullable().optional(),
});

export const WidgetUsageSchema = z.object({
  widget_instance_id: z.string().uuid(),
  interaction: z.string().min(1).max(40),
  duration_ms: z.number().int().min(0).nullable().optional(),
});

export const SearchEventSchema = z.object({
  scope_code: z.string().min(1).max(150),
  query_hash: z.string().min(1).max(64),
  result_count: z.number().int().min(0).optional(),
  clicked_position: z.number().int().min(0).nullable().optional(),
});

export const FunnelStepSchema = z.object({
  funnel_code: z.string().min(1).max(100),
  step_code: z.string().min(1).max(100),
  step_order: z.number().int().min(0),
});

export const RetentionSchema = z.object({
  cohort_code: z.string().min(1).max(100),
  day_index: z.number().int().min(0),
  active_user_count: z.number().int().min(0),
});

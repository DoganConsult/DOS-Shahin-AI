import { z } from 'zod';

export const DashboardCreateSchema = z.object({
  dashboard_key: z.string().min(1).max(150),
  product_code: z.string().max(100).nullable().optional(),
  module_code: z.string().max(100).nullable().optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  visibility: z.enum(['tenant', 'user', 'product', 'module', 'system']).optional(),
  required_permission: z.string().max(150).nullable().optional(),
  role_codes: z.array(z.string().max(80)).optional(),
  layout_config: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
});

export const DashboardPatchSchema = z.object({
  product_code: z.string().max(100).nullable().optional(),
  module_code: z.string().max(100).nullable().optional(),
  title_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  visibility: z.enum(['tenant', 'user', 'product', 'module', 'system']).optional(),
  required_permission: z.string().max(150).nullable().optional(),
  role_codes: z.array(z.string().max(80)).optional(),
  layout_config: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const DashboardLayoutPatchSchema = z.object({
  layout_config: z.record(z.unknown()),
  widgets: z.array(z.object({
    instance_key: z.string().min(1).max(150),
    widget_key: z.string().min(1).max(150),
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
    instance_config: z.record(z.unknown()).optional(),
    data_binding: z.record(z.unknown()).optional(),
    required_permission: z.string().max(150).nullable().optional(),
    is_visible: z.boolean().optional(),
  })).optional(),
});

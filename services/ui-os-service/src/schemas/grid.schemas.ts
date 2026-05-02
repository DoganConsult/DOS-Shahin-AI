import { z } from 'zod';

export const GridStatePatchSchema = z.object({
  module_code: z.string().max(100).nullable().optional(),
  route_key: z.string().max(300).nullable().optional(),
  column_state: z.record(z.unknown()).optional(),
  sort_state: z.unknown().optional(),
  filter_state: z.record(z.unknown()).optional(),
  pagination_state: z.record(z.unknown()).optional(),
  density: z.enum(['compact', 'comfortable', 'spacious']).optional(),
});

export const GridViewCreateSchema = z.object({
  view_key: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  module_code: z.string().max(100).nullable().optional(),
  route_key: z.string().max(300).nullable().optional(),
  view_config: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
  is_shared: z.boolean().optional(),
});

export const SavedViewCreateSchema = z.object({
  view_key: z.string().min(1).max(150),
  scope: z.enum(['user', 'tenant', 'shared', 'system']).optional(),
  module_code: z.string().max(100).nullable().optional(),
  route_key: z.string().max(300).nullable().optional(),
  entity_type: z.string().max(80).nullable().optional(),
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  view_config: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
  is_shared: z.boolean().optional(),
  required_permission: z.string().max(150).nullable().optional(),
});

export const SavedViewPatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  view_config: z.record(z.unknown()).optional(),
  is_default: z.boolean().optional(),
  is_shared: z.boolean().optional(),
});

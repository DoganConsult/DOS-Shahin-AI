import { z } from 'zod';

const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);
const DATA_TYPE = z.enum(['text','number','integer','boolean','date','datetime','json','uuid','enum','badge','link','currency','percent']);
const CAPABILITY = z.enum(['view','edit','export','filter','sort']);
const FORMAT = z.enum(['csv','xlsx','pdf','json']);

export const GridColumnSchema = z.object({
  grid_key: z.string().min(1).max(150),
  column_key: z.string().min(1).max(100),
  data_type: DATA_TYPE,
  cell_renderer_key: z.string().max(150).nullable().optional(),
  header_key: z.string().max(150).nullable().optional(),
  description_key: z.string().max(200).nullable().optional(),
  default_width_px: z.number().int().positive().nullable().optional(),
  min_width_px: z.number().int().positive().nullable().optional(),
  max_width_px: z.number().int().positive().nullable().optional(),
  is_sortable: z.boolean().optional(),
  is_filterable: z.boolean().optional(),
  is_editable: z.boolean().optional(),
  is_pinnable: z.boolean().optional(),
  is_resizable: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GridColumnPermissionSchema = z.object({
  permission_code: z.string().min(1).max(150),
  effect: z.enum(['allow','deny']),
  capability: CAPABILITY.optional(),
  role_code: z.string().max(100).nullable().optional(),
  user_id: z.string().max(64).nullable().optional(),
});

export const GridSavedViewSchema = z.object({
  grid_key: z.string().min(1).max(150),
  view_key: z.string().min(1).max(150),
  user_id: z.string().max(64).nullable().optional(),
  name_key: z.string().max(150).nullable().optional(),
  view_config: z.record(z.unknown()).optional(),
  is_shared: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export const GridExportSchema = z.object({
  grid_key: z.string().min(1).max(150),
  view_id: UUID.nullable().optional(),
  format: FORMAT,
  filters: z.record(z.unknown()).optional(),
});

export const GridBulkJobSchema = z.object({
  grid_key: z.string().min(1).max(150),
  action_kind: z.string().min(1).max(40),
  targets: z.array(z.unknown()).optional(),
  payload: z.record(z.unknown()).optional(),
});

export const GridInlineEditSessionSchema = z.object({
  session_key: z.string().min(1).max(64),
  grid_key: z.string().min(1).max(150),
  row_pk: z.record(z.unknown()).optional(),
  draft_payload: z.record(z.unknown()).optional(),
  expires_at: z.string().datetime().nullable().optional(),
});

export const GridValidationErrorSchema = z.object({
  column_key: z.string().min(1).max(100),
  error_code: z.string().min(1).max(100),
  message_key: z.string().max(150).nullable().optional(),
  details: z.record(z.unknown()).optional(),
});

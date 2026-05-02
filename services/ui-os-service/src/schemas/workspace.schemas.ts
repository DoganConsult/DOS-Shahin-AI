import { z } from 'zod';

export const WorkspacePatchSchema = z.object({
  workspace_key: z.string().min(1).max(120).optional(),
  product_code: z.string().min(1).max(100).nullable().optional(),
  active_module_code: z.string().min(1).max(100).nullable().optional(),
  active_route: z.string().min(1).max(300).nullable().optional(),
  open_apps: z.unknown().optional(),
  panels: z.record(z.unknown()).optional(),
  layout_snapshot: z.record(z.unknown()).optional(),
});

export const SnapshotCreateSchema = z.object({
  workspace_key: z.string().min(1).max(120).optional(),
  snapshot_key: z.string().min(1).max(150),
});

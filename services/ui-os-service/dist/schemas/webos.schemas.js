import { z } from 'zod';
export const StartSessionSchema = z.object({
    client_id: z.string().max(120).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});
export const WindowStateSchema = z.object({
    window_key: z.string().min(1).max(150),
    route_key: z.string().max(200).nullable().optional(),
    position: z.record(z.string(), z.any()).optional(),
    z_index: z.number().int().optional(),
    is_minimized: z.boolean().optional(),
    is_maximized: z.boolean().optional(),
});
export const PanelStateSchema = z.object({
    panel_key: z.string().min(1).max(150),
    is_pinned: z.boolean().optional(),
    is_collapsed: z.boolean().optional(),
    width_px: z.number().int().nullable().optional(),
    position: z.string().max(20).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});
export const TabStateSchema = z.object({
    tab_key: z.string().min(1).max(150),
    tab_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
    route_key: z.string().max(200).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});
export const SplitViewSchema = z.object({
    orientation: z.enum(['horizontal', 'vertical']),
    split_ratio: z.number().gt(0).lt(1).optional(),
    pane_a_route_key: z.string().max(200).nullable().optional(),
    pane_b_route_key: z.string().max(200).nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});
export const DragDropSchema = z.object({
    source_kind: z.string().min(1).max(40),
    source_id: z.string().max(150).nullable().optional(),
    target_kind: z.string().min(1).max(40),
    target_id: z.string().max(150).nullable().optional(),
    payload: z.record(z.string(), z.any()).optional(),
    accepted: z.boolean(),
});
export const ClipboardItemSchema = z.object({
    item_kind: z.string().min(1).max(40),
    payload: z.record(z.string(), z.any()).optional(),
    expires_at: z.string().datetime().nullable().optional(),
});
export const RestorePointSchema = z.object({
    point_kind: z.string().min(1).max(40),
    state_payload: z.record(z.string(), z.any()).optional(),
});
//# sourceMappingURL=webos.schemas.js.map
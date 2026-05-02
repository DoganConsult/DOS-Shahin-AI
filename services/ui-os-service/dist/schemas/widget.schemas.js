import { z } from 'zod';
export const WidgetInstanceCreateSchema = z.object({
    dashboard_key: z.string().min(1).max(150),
    widget_key: z.string().min(1).max(150),
    instance_key: z.string().min(1).max(150),
    x: z.number().int().min(0).optional(),
    y: z.number().int().min(0).optional(),
    w: z.number().int().min(1).optional(),
    h: z.number().int().min(1).optional(),
    instance_config: z.record(z.unknown()).optional(),
    data_binding: z.record(z.unknown()).optional(),
    required_permission: z.string().max(150).nullable().optional(),
    is_visible: z.boolean().optional(),
});
export const WidgetInstancePatchSchema = z.object({
    x: z.number().int().min(0).optional(),
    y: z.number().int().min(0).optional(),
    w: z.number().int().min(1).optional(),
    h: z.number().int().min(1).optional(),
    instance_config: z.record(z.unknown()).optional(),
    data_binding: z.record(z.unknown()).optional(),
    required_permission: z.string().max(150).nullable().optional(),
    is_visible: z.boolean().optional(),
});
//# sourceMappingURL=widget.schemas.js.map
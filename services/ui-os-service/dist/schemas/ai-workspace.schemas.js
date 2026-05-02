import { z } from 'zod';
import { FormDecisionEnum } from './governance.schemas.js';
import { PermEffectEnum } from './permission.schemas.js';
export const AiPanelPositionEnum = z.enum(['left', 'right', 'bottom', 'floating']);
export const AiActionDraftStateEnum = z.enum([
    'pending', 'confirmed', 'executed', 'rejected', 'expired',
]);
export const AiContextPanelSchema = z.object({
    route_key: z.string().min(1).max(200),
    position: AiPanelPositionEnum.optional(),
    default_open: z.boolean().optional(),
    config: z.record(z.string(), z.any()).optional(),
    is_active: z.boolean().optional(),
});
export const AiSuggestionSchema = z.object({
    surface_key: z.string().min(1).max(200),
    suggestion_kind: z.string().min(1).max(60),
    payload: z.record(z.string(), z.any()).optional(),
});
export const AiSuggestionFeedbackSchema = z.object({
    decision: FormDecisionEnum,
    comment: z.string().max(2000).nullable().optional(),
});
export const AiActionDraftSchema = z.object({
    action_code: z.string().min(1).max(150),
    params: z.record(z.string(), z.any()).optional(),
    state: AiActionDraftStateEnum.optional(),
    linked_engine_draft_id: z.string().uuid().nullable().optional(),
});
export const AiActionDraftStateSchema = z.object({
    state: AiActionDraftStateEnum,
});
export const AiMemorySchema = z.object({
    memory_key: z.string().min(1).max(150),
    value: z.record(z.string(), z.any()).optional(),
    expires_at: z.string().datetime().nullable().optional(),
});
export const AiPromptTemplateSchema = z.object({
    template_key: z.string().min(1).max(150),
    body: z.string().min(1),
    model_hint: z.string().max(100).nullable().optional(),
    description_key: z.string().max(200).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const AiPromptTemplateToolSchema = z.object({
    tool_code: z.string().min(1).max(150),
    display_order: z.number().int().optional(),
});
export const AiToolSurfaceBindingSchema = z.object({
    surface_key: z.string().min(1).max(200),
    tool_code: z.string().min(1).max(150),
    effect: PermEffectEnum.optional(),
    is_active: z.boolean().optional(),
});
//# sourceMappingURL=ai-workspace.schemas.js.map
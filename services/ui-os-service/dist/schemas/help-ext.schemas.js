import { z } from 'zod';
const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);
export const HelpArticleSchema = z.object({
    slug: z.string().min(1).max(200),
    locale: z.string().max(20).optional(),
    title_key: z.string().max(150).nullable().optional(),
    body_md: z.string().min(1),
    module_code: z.string().max(100).nullable().optional(),
    product_code: z.string().max(100).nullable().optional(),
    is_active: z.boolean().optional(),
    published_at: z.string().datetime().nullable().optional(),
});
export const HelpCollectionSchema = z.object({
    collection_key: z.string().min(1).max(150),
    title_key: z.string().max(150).nullable().optional(),
    description_key: z.string().max(200).nullable().optional(),
    display_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
});
export const HelpCollectionArticleSchema = z.object({
    article_id: UUID,
    display_order: z.number().int().optional(),
});
export const ContextualHelpLinkSchema = z.object({
    surface_key: z.string().min(1).max(200),
    help_article_id: UUID,
    display_kind: z.enum(['tooltip', 'popover', 'panel', 'inline', 'modal']).optional(),
    display_order: z.number().int().optional(),
    is_active: z.boolean().optional(),
});
export const EmptyStateSchema = z.object({
    surface_key: z.string().min(1).max(200),
    title_key: z.string().max(150).nullable().optional(),
    body_key: z.string().max(200).nullable().optional(),
    cta_action_code: z.string().max(150).nullable().optional(),
    illustration_key: z.string().max(150).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const ChecklistSchema = z.object({
    checklist_key: z.string().min(1).max(150),
    audience: z.string().min(1).max(80),
    title_key: z.string().max(150).nullable().optional(),
    description_key: z.string().max(200).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const ChecklistStepSchema = z.object({
    step_key: z.string().min(1).max(150),
    display_order: z.number().int().optional(),
    title_key: z.string().max(150).nullable().optional(),
    description_key: z.string().max(200).nullable().optional(),
    cta_action_code: z.string().max(150).nullable().optional(),
    is_required: z.boolean().optional(),
    is_active: z.boolean().optional(),
});
export const StepStatusSchema = z.object({
    status: z.enum(['not_started', 'in_progress', 'completed', 'skipped', 'blocked']),
});
export const ReleaseNoteSchema = z.object({
    version: z.string().min(1).max(40),
    locale: z.string().max(20).optional(),
    published_at: z.string().datetime().nullable().optional(),
    title_key: z.string().max(150).nullable().optional(),
    body_md: z.string().min(1),
    is_active: z.boolean().optional(),
});
//# sourceMappingURL=help-ext.schemas.js.map
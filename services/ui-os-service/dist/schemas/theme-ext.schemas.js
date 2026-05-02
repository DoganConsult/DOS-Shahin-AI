import { z } from 'zod';
const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);
export const ThemeProfileSchema = z.object({
    profile_code: z.string().min(1).max(100),
    parent_profile_id: UUID.nullable().optional(),
    display_name_key: z.string().max(150).nullable().optional(),
    description_key: z.string().max(200).nullable().optional(),
    is_default: z.boolean().optional(),
    is_active: z.boolean().optional(),
});
export const ThemeTokenSchema = z.object({
    token_key: z.string().min(1).max(150),
    token_kind: z.enum(['color', 'radius', 'shadow', 'spacing', 'typography', 'motion', 'z_index', 'breakpoint']),
    token_value: z.string().min(1),
    is_active: z.boolean().optional(),
});
export const ThemeAssignmentSchema = z.object({
    target_kind: z.enum(['tenant', 'role', 'user', 'product', 'module']),
    target_id: z.string().min(1).max(120),
    theme_profile_id: UUID,
    is_active: z.boolean().optional(),
});
export const BrandAssetSchema = z.object({
    asset_kind: z.enum(['logo', 'favicon', 'hero', 'watermark', 'social_card', 'letterhead', 'email_header']),
    variant: z.string().max(40).optional(),
    url: z.string().min(1),
    mime_type: z.string().max(150).nullable().optional(),
    width_px: z.number().int().positive().nullable().optional(),
    height_px: z.number().int().positive().nullable().optional(),
    size_bytes: z.number().int().nonnegative().nullable().optional(),
    checksum: z.string().max(128).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const LoginBrandingSchema = z.object({
    hero_asset_id: UUID.nullable().optional(),
    logo_asset_id: UUID.nullable().optional(),
    welcome_text_key: z.string().max(150).nullable().optional(),
    support_link: z.string().nullable().optional(),
    config: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const EmailBrandingSchema = z.object({
    header_html: z.string().nullable().optional(),
    footer_html: z.string().nullable().optional(),
    accent_color: z.string().max(20).nullable().optional(),
    logo_asset_id: UUID.nullable().optional(),
    config: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const ReportBrandingSchema = z.object({
    cover_template_html: z.string().nullable().optional(),
    watermark_text: z.string().max(150).nullable().optional(),
    watermark_asset_id: UUID.nullable().optional(),
    legal_footer: z.string().nullable().optional(),
    config: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const PrintTemplateSchema = z.object({
    template_key: z.string().min(1).max(150),
    engine: z.enum(['html', 'latex', 'docx']).optional(),
    template_body: z.string().min(1),
    default_locale: z.string().max(20).optional(),
    is_active: z.boolean().optional(),
});
//# sourceMappingURL=theme-ext.schemas.js.map
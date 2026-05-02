import { z } from 'zod';
export const BrandingPatchSchema = z.object({
    brand_name: z.string().max(200).nullable().optional(),
    logo_url: z.string().nullable().optional(),
    logo_dark_url: z.string().nullable().optional(),
    favicon_url: z.string().nullable().optional(),
    primary_color: z.string().max(20).nullable().optional(),
    secondary_color: z.string().max(20).nullable().optional(),
    accent_color: z.string().max(20).nullable().optional(),
    theme_tokens: z.record(z.unknown()).optional(),
    css_overrides: z.record(z.unknown()).optional(),
    login_background_url: z.string().nullable().optional(),
    landing_config: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
const TokenSchema = z.object({
    token_key: z.string().min(1).max(200),
    token_value: z.string().max(500),
    scope: z.string().max(40).optional(),
    module_code: z.string().max(100).nullable().optional(),
    route: z.string().max(300).nullable().optional(),
});
export const ThemePatchSchema = z.object({
    tokens: z.array(TokenSchema).min(1),
});
export const TranslationPutSchema = z.object({
    translations: z.array(z.object({
        namespace: z.string().min(1).max(80),
        translation_key: z.string().min(1).max(300),
        translation_value: z.string(),
        source: z.string().max(40).optional(),
    })).min(1),
});
//# sourceMappingURL=branding.schemas.js.map
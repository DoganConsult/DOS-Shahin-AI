import { z } from 'zod';
export const NamespaceSchema = z.object({
    namespace_code: z.string().min(1).max(100),
    description_key: z.string().max(200).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const VersionSchema = z.object({
    locale: z.string().min(1).max(20),
    version: z.string().min(1).max(40),
    is_current: z.boolean().optional(),
    published_at: z.string().datetime().nullable().optional(),
    source_url: z.string().nullable().optional(),
});
export const SetCurrentVersionSchema = z.object({
    locale: z.string().min(1).max(20),
    version: z.string().min(1).max(40),
});
export const OverrideSchema = z.object({
    locale: z.string().min(1).max(20),
    translation_key: z.string().min(1).max(200),
    override_value: z.string(),
    is_active: z.boolean().optional(),
});
export const LocalePreferencesSchema = z.object({
    locale: z.string().min(1).max(20),
    direction: z.enum(['ltr', 'rtl']).optional(),
    timezone: z.string().max(64).optional(),
    date_format: z.string().max(40).nullable().optional(),
    time_format: z.string().max(40).nullable().optional(),
    number_format: z.string().max(40).nullable().optional(),
});
export const RtlValidationSchema = z.object({
    subject_kind: z.string().min(1).max(40),
    subject_id: z.string().min(1).max(150),
    passed: z.boolean(),
    findings: z.array(z.unknown()).optional(),
    validator_version: z.string().max(40).nullable().optional(),
});
//# sourceMappingURL=i18n-ext.schemas.js.map
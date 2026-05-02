import { z } from 'zod';
const UUID = z.string().regex(/^[0-9a-fA-F-]{36}$/);
export const SearchProviderSchema = z.object({
    provider_code: z.string().min(1).max(100),
    display_name_key: z.string().max(150).nullable().optional(),
    endpoint_url: z.string().nullable().optional(),
    auth_secret_ref: z.string().max(150).nullable().optional(),
    config: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const SearchIndexSchema = z.object({
    provider_id: UUID,
    index_code: z.string().min(1).max(150),
    module_code: z.string().max(100).nullable().optional(),
    schema_payload: z.record(z.unknown()).optional(),
    last_built_at: z.string().datetime().nullable().optional(),
    document_count: z.number().int().min(0).nullable().optional(),
    is_active: z.boolean().optional(),
});
export const SearchScopeSchema = z.object({
    scope_code: z.string().min(1).max(150),
    display_name_key: z.string().max(150).nullable().optional(),
    default_filters: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const SearchScopeIndexSchema = z.object({
    index_id: UUID,
    weight: z.number().int().positive().optional(),
});
export const SearchHistorySchema = z.object({
    scope_id: UUID.nullable().optional(),
    query_text: z.string().min(1),
    result_count: z.number().int().min(0).optional(),
    duration_ms: z.number().int().min(0).nullable().optional(),
});
export const SearchSavedQuerySchema = z.object({
    scope_id: UUID.nullable().optional(),
    query_key: z.string().min(1).max(150),
    name_key: z.string().max(150).nullable().optional(),
    query_payload: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
});
export const CommandLogSchema = z.object({
    command_key: z.string().min(1).max(150),
    surface: z.enum(['palette', 'shortcut', 'menu', 'toolbar', 'context_menu', 'programmatic']),
    payload: z.record(z.unknown()).optional(),
    result: z.string().max(40).nullable().optional(),
    duration_ms: z.number().int().min(0).nullable().optional(),
    error_code: z.string().max(100).nullable().optional(),
});
//# sourceMappingURL=search.schemas.js.map
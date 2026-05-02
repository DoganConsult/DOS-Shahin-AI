/**
 * Common Zod schemas shared across all ai-engine-service domains.
 */
import { z } from 'zod';
export declare const paginationQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    pageSize?: number;
}, {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    pageSize?: number;
}>;
export declare const statusFilter: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string;
}, {
    status?: string;
}>;
export declare const grcJsonMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const grcPositiveInt: z.ZodNumber;
export declare const searchQuery: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    limit?: number;
    q?: string;
}, {
    page?: number;
    limit?: number;
    q?: string;
}>;
export declare const bulkIdsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids?: string[];
}, {
    ids?: string[];
}>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type StatusFilter = z.infer<typeof statusFilter>;
export type SearchQuery = z.infer<typeof searchQuery>;
export declare const idParam: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id?: string;
}, {
    id?: string;
}>;
export declare const grcSanitizedText: (max: number) => z.ZodPipeline<z.ZodEffects<z.ZodString, string, string>, z.ZodString>;
export declare const grcSeverity: z.ZodEnum<["info", "low", "medium", "high", "critical"]>;
export declare const grcISODate: z.ZodString;
export declare const grcSortDir: z.ZodEnum<["asc", "desc"]>;
export declare const dateRange: z.ZodObject<{
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    from?: string;
    to?: string;
}, {
    from?: string;
    to?: string;
}>;
export declare const queryBoolean: z.ZodEffects<z.ZodUnion<[z.ZodBoolean, z.ZodEnum<["true", "false", "1", "0"]>]>, boolean, boolean | "0" | "1" | "true" | "false">;
export declare const grcConfidence: z.ZodNumber;

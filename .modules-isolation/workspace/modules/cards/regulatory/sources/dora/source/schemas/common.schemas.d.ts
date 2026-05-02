/**
 * Common Zod schemas shared across all ai-engine-service domains.
 */
import { z } from 'zod';
export declare const paginationQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const statusFilter: z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
}, {
    status?: string | undefined;
}>;
export declare const grcJsonMetadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
export declare const grcPositiveInt: z.ZodNumber;
export declare const searchQuery: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    q?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    q?: string | undefined;
}>;
export declare const bulkIdsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export type PaginationQuery = z.infer<typeof paginationQuery>;
export type StatusFilter = z.infer<typeof statusFilter>;
export type SearchQuery = z.infer<typeof searchQuery>;

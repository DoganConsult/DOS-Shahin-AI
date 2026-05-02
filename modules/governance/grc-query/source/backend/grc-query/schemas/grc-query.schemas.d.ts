import { z } from 'zod';
export declare const SaveQuerySchema: z.ZodObject<{
    name: z.ZodString;
    queryDslJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    isPublic: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    queryDslJson: Record<string, unknown>;
    isPublic: boolean;
}, {
    name: string;
    queryDslJson: Record<string, unknown>;
    isPublic?: boolean | undefined;
}>;
export declare const UnifiedSearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
    modules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit?: number | undefined;
    modules?: string[] | undefined;
}, {
    query: string;
    limit?: number | undefined;
    modules?: string[] | undefined;
}>;
export declare const FederatedSearchSchema: z.ZodObject<{
    queryDslJson: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    limit: z.ZodOptional<z.ZodNumber>;
    modules: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    queryDslJson: Record<string, unknown>;
    limit?: number | undefined;
    modules?: string[] | undefined;
}, {
    queryDslJson: Record<string, unknown>;
    limit?: number | undefined;
    modules?: string[] | undefined;
}>;
export declare const NlqSearchSchema: z.ZodObject<{
    prompt: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prompt: string;
    limit?: number | undefined;
}, {
    prompt: string;
    limit?: number | undefined;
}>;

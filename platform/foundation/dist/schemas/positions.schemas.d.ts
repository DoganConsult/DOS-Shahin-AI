import { z } from 'zod';
export declare const createPositionBody: z.ZodObject<{
    dept_id: z.ZodOptional<z.ZodString>;
    title_en: z.ZodString;
    title_ar: z.ZodOptional<z.ZodString>;
    grade: z.ZodOptional<z.ZodString>;
    reports_to_position_id: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "vacant"]>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "vacant";
    metadata?: Record<string, unknown>;
    dept_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    reports_to_position_id?: string;
}, {
    status?: "active" | "inactive" | "vacant";
    metadata?: Record<string, unknown>;
    dept_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    reports_to_position_id?: string;
}>;
export declare const updatePositionBody: z.ZodObject<{
    dept_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title_en: z.ZodOptional<z.ZodString>;
    title_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    grade: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    reports_to_position_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "inactive", "vacant"]>>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    status?: "active" | "inactive" | "vacant";
    metadata?: Record<string, unknown>;
    dept_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    reports_to_position_id?: string;
}, {
    status?: "active" | "inactive" | "vacant";
    metadata?: Record<string, unknown>;
    dept_id?: string;
    title_en?: string;
    title_ar?: string;
    grade?: string;
    reports_to_position_id?: string;
}>;
export declare const listPositionsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
} & {
    departmentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    departmentId?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}, {
    departmentId?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}>;

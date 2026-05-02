import { z } from 'zod';
export declare const CreateBriefSchema: z.ZodObject<{
    title: z.ZodString;
    referenceDate: z.ZodOptional<z.ZodString>;
    generationMethod: z.ZodDefault<z.ZodEnum<["ai_generated", "manual"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    generationMethod: "ai_generated" | "manual";
    referenceDate?: string | undefined;
}, {
    title: string;
    referenceDate?: string | undefined;
    generationMethod?: "ai_generated" | "manual" | undefined;
}>;
export declare const ApproveBriefSchema: z.ZodObject<{
    status: z.ZodEnum<["approved", "rejected"]>;
}, "strip", z.ZodTypeAny, {
    status: "approved" | "rejected";
}, {
    status: "approved" | "rejected";
}>;
export declare const CreateObjectiveSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodString>;
    targetKpi: z.ZodOptional<z.ZodString>;
    targetValue: z.ZodOptional<z.ZodNumber>;
    ownerUserId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description?: string | undefined;
    parentId?: string | undefined;
    targetKpi?: string | undefined;
    targetValue?: number | undefined;
    ownerUserId?: string | undefined;
    dueDate?: string | undefined;
}, {
    title: string;
    description?: string | undefined;
    parentId?: string | undefined;
    targetKpi?: string | undefined;
    targetValue?: number | undefined;
    ownerUserId?: string | undefined;
    dueDate?: string | undefined;
}>;
export declare const UpdateObjectiveSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    currentValue: z.ZodOptional<z.ZodNumber>;
    targetValue: z.ZodOptional<z.ZodNumber>;
    progressPct: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["active", "achieved", "at_risk", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: "active" | "cancelled" | "achieved" | "at_risk" | undefined;
    targetValue?: number | undefined;
    currentValue?: number | undefined;
    progressPct?: number | undefined;
}, {
    title?: string | undefined;
    status?: "active" | "cancelled" | "achieved" | "at_risk" | undefined;
    targetValue?: number | undefined;
    currentValue?: number | undefined;
    progressPct?: number | undefined;
}>;
export declare const CreateAppetiteSchema: z.ZodObject<{
    domainCategory: z.ZodString;
    quantitativeLimit: z.ZodOptional<z.ZodNumber>;
    qualitativeLimitDesc: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    domainCategory: string;
    quantitativeLimit?: number | undefined;
    qualitativeLimitDesc?: string | undefined;
}, {
    domainCategory: string;
    quantitativeLimit?: number | undefined;
    qualitativeLimitDesc?: string | undefined;
}>;

import { z } from 'zod';
export declare const CreateTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    triggeringEvents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    triggeringEvents?: string[] | undefined;
}, {
    name: string;
    triggeringEvents?: string[] | undefined;
}>;
export declare const CreateStepSchema: z.ZodObject<{
    stepOrder: z.ZodNumber;
    title: z.ZodString;
    instructionsMd: z.ZodOptional<z.ZodString>;
    isAutomated: z.ZodDefault<z.ZodBoolean>;
    requiredRole: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    stepOrder: number;
    title: string;
    isAutomated: boolean;
    instructionsMd?: string | undefined;
    requiredRole?: string | undefined;
}, {
    stepOrder: number;
    title: string;
    instructionsMd?: string | undefined;
    isAutomated?: boolean | undefined;
    requiredRole?: string | undefined;
}>;
export declare const ExecutePlaybookSchema: z.ZodObject<{
    triggerSourceEntity: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    triggerSourceEntity?: string | undefined;
}, {
    triggerSourceEntity?: string | undefined;
}>;
export declare const LogStepSchema: z.ZodObject<{
    stepId: z.ZodString;
    resultData: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    stepId: string;
    resultData?: Record<string, unknown> | undefined;
}, {
    stepId: string;
    resultData?: Record<string, unknown> | undefined;
}>;

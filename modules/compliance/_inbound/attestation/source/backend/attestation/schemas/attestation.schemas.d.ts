import { z } from 'zod';
export declare const CreateCampaignSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    campaignType: z.ZodDefault<z.ZodEnum<["periodic", "event_driven", "continuous"]>>;
    dueDate: z.ZodOptional<z.ZodString>;
    scopeJson: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    frequency: z.ZodDefault<z.ZodEnum<["monthly", "quarterly", "semi_annual", "annual"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    campaignType: "periodic" | "event_driven" | "continuous";
    frequency: "monthly" | "quarterly" | "semi_annual" | "annual";
    description?: string | undefined;
    dueDate?: string | undefined;
    scopeJson?: Record<string, unknown> | undefined;
}, {
    title: string;
    description?: string | undefined;
    campaignType?: "periodic" | "event_driven" | "continuous" | undefined;
    dueDate?: string | undefined;
    scopeJson?: Record<string, unknown> | undefined;
    frequency?: "monthly" | "quarterly" | "semi_annual" | "annual" | undefined;
}>;
export declare const CreateRecordSchema: z.ZodObject<{
    campaignId: z.ZodString;
    attestorUserId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    campaignId: string;
    attestorUserId: string;
    entityType: string;
    entityId: string;
}, {
    campaignId: string;
    attestorUserId: string;
    entityType: string;
    entityId: string;
}>;
export declare const ReviewRecordSchema: z.ZodObject<{
    reviewStatus: z.ZodEnum<["approved", "rejected"]>;
    reviewComment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reviewStatus: "approved" | "rejected";
    reviewComment?: string | undefined;
}, {
    reviewStatus: "approved" | "rejected";
    reviewComment?: string | undefined;
}>;
export declare const TransitionCampaignSchema: z.ZodObject<{
    targetStatus: z.ZodEnum<["active", "closed"]>;
}, "strip", z.ZodTypeAny, {
    targetStatus: "active" | "closed";
}, {
    targetStatus: "active" | "closed";
}>;

import { z } from 'zod';
export declare const createDelegationGrantBody: z.ZodObject<{
    agentId: z.ZodString;
    scopes: z.ZodArray<z.ZodEnum<["onboarding", "workspace_setup", "policy_drafting", "risk_seeding", "control_mapping", "evidence_upload", "assessment"]>, "many">;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
}, "strict", z.ZodTypeAny, {
    scopes?: ("assessment" | "onboarding" | "workspace_setup" | "policy_drafting" | "risk_seeding" | "control_mapping" | "evidence_upload")[];
    agentId?: string;
    durationMinutes?: number;
}, {
    scopes?: ("assessment" | "onboarding" | "workspace_setup" | "policy_drafting" | "risk_seeding" | "control_mapping" | "evidence_upload")[];
    agentId?: string;
    durationMinutes?: number;
}>;
export declare const revokeDelegationGrantBody: z.ZodObject<{
    grantId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    reason?: string;
    grantId?: string;
}, {
    reason?: string;
    grantId?: string;
}>;
export declare const validateDelegationBody: z.ZodObject<{
    grantId: z.ZodString;
    agentId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    grantId?: string;
    agentId?: string;
}, {
    grantId?: string;
    agentId?: string;
}>;
export declare const sodWaiverBody: z.ZodObject<{
    policyId: z.ZodString;
    justification: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    expiresAt?: string;
    policyId?: string;
    justification?: string;
}, {
    expiresAt?: string;
    policyId?: string;
    justification?: string;
}>;
export type CreateDelegationGrantInput = z.infer<typeof createDelegationGrantBody>;
export type RevokeDelegationGrantInput = z.infer<typeof revokeDelegationGrantBody>;
export type SodWaiverInput = z.infer<typeof sodWaiverBody>;

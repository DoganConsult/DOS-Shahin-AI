import { z } from 'zod';
export declare const createDelegationGrantBody: z.ZodObject<{
    agentId: z.ZodString;
    scopes: z.ZodArray<z.ZodEnum<{
        assessment: "assessment";
        onboarding: "onboarding";
        workspace_setup: "workspace_setup";
        policy_drafting: "policy_drafting";
        risk_seeding: "risk_seeding";
        control_mapping: "control_mapping";
        evidence_upload: "evidence_upload";
    }>>;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
}, z.core.$strict>;
export declare const revokeDelegationGrantBody: z.ZodObject<{
    grantId: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const validateDelegationBody: z.ZodObject<{
    grantId: z.ZodString;
    agentId: z.ZodString;
}, z.core.$strict>;
export declare const sodWaiverBody: z.ZodObject<{
    policyId: z.ZodString;
    justification: z.ZodString;
    expiresAt: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export type CreateDelegationGrantInput = z.infer<typeof createDelegationGrantBody>;
export type RevokeDelegationGrantInput = z.infer<typeof revokeDelegationGrantBody>;
export type SodWaiverInput = z.infer<typeof sodWaiverBody>;

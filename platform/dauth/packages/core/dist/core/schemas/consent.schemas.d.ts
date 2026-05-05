import { z } from 'zod';
export declare const grantConsentBody: z.ZodObject<{
    consentType: z.ZodString;
    consentVersion: z.ZodDefault<z.ZodString>;
    legalBasis: z.ZodDefault<z.ZodEnum<{
        contract: "contract";
        consent: "consent";
        legitimate_interest: "legitimate_interest";
        legal_obligation: "legal_obligation";
        vital_interest: "vital_interest";
        public_interest: "public_interest";
    }>>;
    dataCategories: z.ZodDefault<z.ZodArray<z.ZodString>>;
    retentionPeriodDays: z.ZodDefault<z.ZodNumber>;
    purpose: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const revokeConsentBody: z.ZodObject<{
    consentType: z.ZodString;
    consentVersion: z.ZodDefault<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const consentListQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodCoercedNumber<unknown>>>;
    consentType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    granted: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
        true: "true";
        false: "false";
    }>>>;
}, z.core.$strip>;
export declare const memoryConsentBody: z.ZodObject<{
    action: z.ZodEnum<{
        revoke: "revoke";
        export: "export";
        grant: "grant";
        forget: "forget";
        update_purpose: "update_purpose";
    }>;
    purpose: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
export type GrantConsentInput = z.infer<typeof grantConsentBody>;
export type RevokeConsentInput = z.infer<typeof revokeConsentBody>;
export type MemoryConsentInput = z.infer<typeof memoryConsentBody>;

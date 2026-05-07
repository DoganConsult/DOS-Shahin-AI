import { z } from 'zod';
export declare const grantConsentBody: z.ZodObject<{
    consentType: z.ZodString;
    consentVersion: z.ZodDefault<z.ZodString>;
    legalBasis: z.ZodDefault<z.ZodEnum<["consent", "legitimate_interest", "contract", "legal_obligation", "vital_interest", "public_interest"]>>;
    dataCategories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    retentionPeriodDays: z.ZodDefault<z.ZodNumber>;
    purpose: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    consentType?: string;
    consentVersion?: string;
    legalBasis?: "contract" | "consent" | "legitimate_interest" | "legal_obligation" | "vital_interest" | "public_interest";
    dataCategories?: string[];
    retentionPeriodDays?: number;
    purpose?: string;
}, {
    consentType?: string;
    consentVersion?: string;
    legalBasis?: "contract" | "consent" | "legitimate_interest" | "legal_obligation" | "vital_interest" | "public_interest";
    dataCategories?: string[];
    retentionPeriodDays?: number;
    purpose?: string;
}>;
export declare const revokeConsentBody: z.ZodObject<{
    consentType: z.ZodString;
    consentVersion: z.ZodDefault<z.ZodString>;
    reason: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    reason?: string;
    consentType?: string;
    consentVersion?: string;
}, {
    reason?: string;
    consentType?: string;
    consentVersion?: string;
}>;
export declare const consentListQuery: z.ZodObject<{
    page: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    pageSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    consentType: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    granted: z.ZodOptional<z.ZodOptional<z.ZodEnum<["true", "false"]>>>;
}, "strip", z.ZodTypeAny, {
    page?: number;
    pageSize?: number;
    consentType?: string;
    granted?: "true" | "false";
}, {
    page?: number;
    pageSize?: number;
    consentType?: string;
    granted?: "true" | "false";
}>;
export declare const memoryConsentBody: z.ZodObject<{
    action: z.ZodEnum<["grant", "revoke", "forget", "export", "update_purpose"]>;
    purpose: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strict", z.ZodTypeAny, {
    action?: "revoke" | "export" | "grant" | "forget" | "update_purpose";
    metadata?: Record<string, unknown>;
    purpose?: string;
}, {
    action?: "revoke" | "export" | "grant" | "forget" | "update_purpose";
    metadata?: Record<string, unknown>;
    purpose?: string;
}>;
export type GrantConsentInput = z.infer<typeof grantConsentBody>;
export type RevokeConsentInput = z.infer<typeof revokeConsentBody>;
export type MemoryConsentInput = z.infer<typeof memoryConsentBody>;

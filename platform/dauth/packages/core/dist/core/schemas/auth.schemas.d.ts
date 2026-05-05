import { z } from 'zod';
export declare const loginBody: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    tenantCode: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const refreshBody: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const logoutBody: z.ZodObject<{
    allSessions: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare const changePasswordBody: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strict>;
export declare const requestPasswordResetBody: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strict>;
export declare const completePasswordResetBody: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strict>;
export declare const mfaVerifyBody: z.ZodObject<{
    code: z.ZodString;
    mfaType: z.ZodEnum<{
        email: "email";
        totp: "totp";
    }>;
    userId: z.ZodString;
}, z.core.$strict>;
export declare const mfaEmailChallengeBody: z.ZodObject<{
    userId: z.ZodString;
}, z.core.$strict>;
export declare const invitationAcceptBody: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const requestEmailVerificationBody: z.ZodObject<{
    email: z.ZodString;
}, z.core.$strict>;
export declare const verifyEmailBody: z.ZodObject<{
    token: z.ZodString;
}, z.core.$strict>;
export type LoginInput = z.infer<typeof loginBody>;
export type RefreshInput = z.infer<typeof refreshBody>;
export type ChangePasswordInput = z.infer<typeof changePasswordBody>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetBody>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetBody>;
export type MfaVerifyInput = z.infer<typeof mfaVerifyBody>;
export type InvitationAcceptInput = z.infer<typeof invitationAcceptBody>;

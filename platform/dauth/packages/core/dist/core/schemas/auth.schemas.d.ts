import { z } from 'zod';
export declare const loginBody: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    tenantCode: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    email?: string;
    password?: string;
    tenantCode?: string;
    rememberMe?: boolean;
}, {
    email?: string;
    password?: string;
    tenantCode?: string;
    rememberMe?: boolean;
}>;
export declare const refreshBody: z.ZodObject<{
    refreshToken: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export declare const logoutBody: z.ZodObject<{
    allSessions: z.ZodDefault<z.ZodBoolean>;
}, "strict", z.ZodTypeAny, {
    allSessions?: boolean;
}, {
    allSessions?: boolean;
}>;
export declare const changePasswordBody: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strict", z.ZodTypeAny, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}>, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}>, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}>;
export declare const requestPasswordResetBody: z.ZodObject<{
    email: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email?: string;
}, {
    email?: string;
}>;
export declare const completePasswordResetBody: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
}>, {
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
}, {
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
}>;
export declare const mfaVerifyBody: z.ZodObject<{
    code: z.ZodString;
    mfaType: z.ZodEnum<["email", "totp"]>;
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId?: string;
    code?: string;
    mfaType?: "email" | "totp";
}, {
    userId?: string;
    code?: string;
    mfaType?: "email" | "totp";
}>;
export declare const mfaEmailChallengeBody: z.ZodObject<{
    userId: z.ZodString;
}, "strict", z.ZodTypeAny, {
    userId?: string;
}, {
    userId?: string;
}>;
export declare const invitationAcceptBody: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    password?: string;
    displayName?: string;
    token?: string;
    confirmPassword?: string;
}, {
    password?: string;
    displayName?: string;
    token?: string;
    confirmPassword?: string;
}>, {
    password?: string;
    displayName?: string;
    token?: string;
    confirmPassword?: string;
}, {
    password?: string;
    displayName?: string;
    token?: string;
    confirmPassword?: string;
}>;
export declare const requestEmailVerificationBody: z.ZodObject<{
    email: z.ZodString;
}, "strict", z.ZodTypeAny, {
    email?: string;
}, {
    email?: string;
}>;
export declare const verifyEmailBody: z.ZodObject<{
    token: z.ZodString;
}, "strict", z.ZodTypeAny, {
    token?: string;
}, {
    token?: string;
}>;
export type LoginInput = z.infer<typeof loginBody>;
export type RefreshInput = z.infer<typeof refreshBody>;
export type ChangePasswordInput = z.infer<typeof changePasswordBody>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetBody>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetBody>;
export type MfaVerifyInput = z.infer<typeof mfaVerifyBody>;
export type InvitationAcceptInput = z.infer<typeof invitationAcceptBody>;

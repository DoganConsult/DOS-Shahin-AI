/**
 * New-user journey domain events — Zod v1 payloads (Phase 0.4).
 * Consumers: onboarding-service, notification-service, provisioning worker, gateway SSE.
 */
import { z } from 'zod';
export declare const EventVersionV1: z.ZodLiteral<"v1">;
/** auth.verification_email_requested */
export declare const AuthVerificationEmailRequestedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"auth.verification_email_requested">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    /** Plain token for verify link; hashed row lives in public.email_verification_tokens. */
    verificationToken: z.ZodString;
    userName: z.ZodOptional<z.ZodString>;
    requestedAt: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "auth.verification_email_requested";
    verificationToken?: string;
    userName?: string;
    requestedAt?: string;
    correlationId?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "auth.verification_email_requested";
    verificationToken?: string;
    userName?: string;
    requestedAt?: string;
    correlationId?: string;
}>;
export type AuthVerificationEmailRequestedV1 = z.infer<typeof AuthVerificationEmailRequestedV1>;
/** lifecycle.user_created */
export declare const LifecycleUserCreatedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"lifecycle.user_created">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    tenantCode: z.ZodString;
    role: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    role?: string;
    apiVersion?: "v1";
    eventType?: "lifecycle.user_created";
    correlationId?: string;
    tenantCode?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    role?: string;
    apiVersion?: "v1";
    eventType?: "lifecycle.user_created";
    correlationId?: string;
    tenantCode?: string;
}>;
export type LifecycleUserCreatedV1 = z.infer<typeof LifecycleUserCreatedV1>;
/** onboarding.started */
export declare const OnboardingStartedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"onboarding.started">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    companyName: z.ZodString;
    registrationId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    companyName?: string;
    apiVersion?: "v1";
    eventType?: "onboarding.started";
    correlationId?: string;
    registrationId?: string;
    sessionId?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    companyName?: string;
    apiVersion?: "v1";
    eventType?: "onboarding.started";
    correlationId?: string;
    registrationId?: string;
    sessionId?: string;
}>;
export type OnboardingStartedV1 = z.infer<typeof OnboardingStartedV1>;
/** provisioning.job_queued */
export declare const ProvisioningJobQueuedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.job_queued">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    sessionId: z.ZodString;
    requestedByUserId: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.job_queued";
    correlationId?: string;
    sessionId?: string;
    requestedByUserId?: string;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.job_queued";
    correlationId?: string;
    sessionId?: string;
    requestedByUserId?: string;
}>;
export type ProvisioningJobQueuedV1 = z.infer<typeof ProvisioningJobQueuedV1>;
/** provisioning.step_completed */
export declare const ProvisioningStepCompletedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.step_completed">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    stepCode: z.ZodString;
    sequenceNo: z.ZodNumber;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_completed";
    correlationId?: string;
    stepCode?: string;
    sequenceNo?: number;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_completed";
    correlationId?: string;
    stepCode?: string;
    sequenceNo?: number;
}>;
export type ProvisioningStepCompletedV1 = z.infer<typeof ProvisioningStepCompletedV1>;
/** provisioning.step_failed */
export declare const ProvisioningStepFailedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.step_failed">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    stepCode: z.ZodString;
    errorMessage: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_failed";
    correlationId?: string;
    stepCode?: string;
    errorMessage?: string;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_failed";
    correlationId?: string;
    stepCode?: string;
    errorMessage?: string;
}>;
export type ProvisioningStepFailedV1 = z.infer<typeof ProvisioningStepFailedV1>;
/** workspace.ready */
export declare const WorkspaceReadyV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"workspace.ready">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    apiVersion?: "v1";
    eventType?: "workspace.ready";
    correlationId?: string;
    sessionId?: string;
}, {
    tenantId?: string;
    userId?: string;
    apiVersion?: "v1";
    eventType?: "workspace.ready";
    correlationId?: string;
    sessionId?: string;
}>;
export type WorkspaceReadyV1 = z.infer<typeof WorkspaceReadyV1>;
/** user.email_verified */
export declare const UserEmailVerifiedV1: z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"user.email_verified">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    verifiedAt: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "user.email_verified";
    correlationId?: string;
    verifiedAt?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "user.email_verified";
    correlationId?: string;
    verifiedAt?: string;
}>;
export type UserEmailVerifiedV1 = z.infer<typeof UserEmailVerifiedV1>;
export declare const JourneyEventUnionV1: z.ZodDiscriminatedUnion<"eventType", [z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"auth.verification_email_requested">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    /** Plain token for verify link; hashed row lives in public.email_verification_tokens. */
    verificationToken: z.ZodString;
    userName: z.ZodOptional<z.ZodString>;
    requestedAt: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "auth.verification_email_requested";
    verificationToken?: string;
    userName?: string;
    requestedAt?: string;
    correlationId?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "auth.verification_email_requested";
    verificationToken?: string;
    userName?: string;
    requestedAt?: string;
    correlationId?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"lifecycle.user_created">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    tenantCode: z.ZodString;
    role: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    role?: string;
    apiVersion?: "v1";
    eventType?: "lifecycle.user_created";
    correlationId?: string;
    tenantCode?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    role?: string;
    apiVersion?: "v1";
    eventType?: "lifecycle.user_created";
    correlationId?: string;
    tenantCode?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"onboarding.started">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    companyName: z.ZodString;
    registrationId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    companyName?: string;
    apiVersion?: "v1";
    eventType?: "onboarding.started";
    correlationId?: string;
    registrationId?: string;
    sessionId?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    companyName?: string;
    apiVersion?: "v1";
    eventType?: "onboarding.started";
    correlationId?: string;
    registrationId?: string;
    sessionId?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.job_queued">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    sessionId: z.ZodString;
    requestedByUserId: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.job_queued";
    correlationId?: string;
    sessionId?: string;
    requestedByUserId?: string;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.job_queued";
    correlationId?: string;
    sessionId?: string;
    requestedByUserId?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.step_completed">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    stepCode: z.ZodString;
    sequenceNo: z.ZodNumber;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_completed";
    correlationId?: string;
    stepCode?: string;
    sequenceNo?: number;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_completed";
    correlationId?: string;
    stepCode?: string;
    sequenceNo?: number;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"provisioning.step_failed">;
    tenantId: z.ZodString;
    jobId: z.ZodString;
    stepCode: z.ZodString;
    errorMessage: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_failed";
    correlationId?: string;
    stepCode?: string;
    errorMessage?: string;
}, {
    tenantId?: string;
    jobId?: string;
    apiVersion?: "v1";
    eventType?: "provisioning.step_failed";
    correlationId?: string;
    stepCode?: string;
    errorMessage?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"workspace.ready">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    apiVersion?: "v1";
    eventType?: "workspace.ready";
    correlationId?: string;
    sessionId?: string;
}, {
    tenantId?: string;
    userId?: string;
    apiVersion?: "v1";
    eventType?: "workspace.ready";
    correlationId?: string;
    sessionId?: string;
}>, z.ZodObject<{
    apiVersion: z.ZodLiteral<"v1">;
    eventType: z.ZodLiteral<"user.email_verified">;
    tenantId: z.ZodString;
    userId: z.ZodString;
    email: z.ZodString;
    verifiedAt: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "user.email_verified";
    correlationId?: string;
    verifiedAt?: string;
}, {
    tenantId?: string;
    userId?: string;
    email?: string;
    apiVersion?: "v1";
    eventType?: "user.email_verified";
    correlationId?: string;
    verifiedAt?: string;
}>]>;
export type JourneyEventUnionV1 = z.infer<typeof JourneyEventUnionV1>;
export declare function parseJourneyEventV1(input: unknown): JourneyEventUnionV1;

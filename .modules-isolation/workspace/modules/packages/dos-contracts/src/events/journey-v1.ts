/**
 * New-user journey domain events — Zod v1 payloads (Phase 0.4).
 * Consumers: onboarding-service, notification-service, provisioning worker, gateway SSE.
 */
import { z } from 'zod';

export const EventVersionV1 = z.literal('v1');

const tenantId = z.string().min(1).max(64);
const userId = z.string().min(1).max(64);
const correlationId = z.string().uuid().optional();

/** auth.verification_email_requested */
export const AuthVerificationEmailRequestedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('auth.verification_email_requested'),
  tenantId,
  userId,
  email: z.string().email(),
  /** Plain token for verify link; hashed row lives in public.email_verification_tokens. */
  verificationToken: z.string().min(16).max(512),
  userName: z.string().min(1).max(255).optional(),
  requestedAt: z.string().datetime(),
  correlationId,
});
export type AuthVerificationEmailRequestedV1 = z.infer<typeof AuthVerificationEmailRequestedV1>;

/** lifecycle.user_created */
export const LifecycleUserCreatedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('lifecycle.user_created'),
  tenantId,
  userId,
  email: z.string().email(),
  tenantCode: z.string().min(1).max(128),
  role: z.string().min(1).max(50),
  correlationId,
});
export type LifecycleUserCreatedV1 = z.infer<typeof LifecycleUserCreatedV1>;

/** onboarding.started */
export const OnboardingStartedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('onboarding.started'),
  tenantId,
  userId,
  email: z.string().email(),
  companyName: z.string().min(1).max(255),
  registrationId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
  correlationId,
});
export type OnboardingStartedV1 = z.infer<typeof OnboardingStartedV1>;

/** provisioning.job_queued */
export const ProvisioningJobQueuedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('provisioning.job_queued'),
  tenantId,
  jobId: z.string().uuid(),
  sessionId: z.string().uuid(),
  requestedByUserId: z.string().min(1).max(64),
  correlationId,
});
export type ProvisioningJobQueuedV1 = z.infer<typeof ProvisioningJobQueuedV1>;

/** provisioning.step_completed */
export const ProvisioningStepCompletedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('provisioning.step_completed'),
  tenantId,
  jobId: z.string().uuid(),
  stepCode: z.string().min(1).max(128),
  sequenceNo: z.number().int().nonnegative(),
  correlationId,
});
export type ProvisioningStepCompletedV1 = z.infer<typeof ProvisioningStepCompletedV1>;

/** provisioning.step_failed */
export const ProvisioningStepFailedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('provisioning.step_failed'),
  tenantId,
  jobId: z.string().uuid(),
  stepCode: z.string().min(1).max(128),
  errorMessage: z.string().min(1).max(4000),
  correlationId,
});
export type ProvisioningStepFailedV1 = z.infer<typeof ProvisioningStepFailedV1>;

/** workspace.ready */
export const WorkspaceReadyV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('workspace.ready'),
  tenantId,
  userId,
  sessionId: z.string().uuid().optional(),
  correlationId,
});
export type WorkspaceReadyV1 = z.infer<typeof WorkspaceReadyV1>;

/** user.email_verified */
export const UserEmailVerifiedV1 = z.object({
  apiVersion: EventVersionV1,
  eventType: z.literal('user.email_verified'),
  tenantId,
  userId,
  email: z.string().email(),
  verifiedAt: z.string().datetime(),
  correlationId,
});
export type UserEmailVerifiedV1 = z.infer<typeof UserEmailVerifiedV1>;

export const JourneyEventUnionV1 = z.discriminatedUnion('eventType', [
  AuthVerificationEmailRequestedV1,
  LifecycleUserCreatedV1,
  OnboardingStartedV1,
  ProvisioningJobQueuedV1,
  ProvisioningStepCompletedV1,
  ProvisioningStepFailedV1,
  WorkspaceReadyV1,
  UserEmailVerifiedV1,
]);
export type JourneyEventUnionV1 = z.infer<typeof JourneyEventUnionV1>;

export function parseJourneyEventV1(input: unknown): JourneyEventUnionV1 {
  return JourneyEventUnionV1.parse(input);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyEventUnionV1 = exports.UserEmailVerifiedV1 = exports.WorkspaceReadyV1 = exports.ProvisioningStepFailedV1 = exports.ProvisioningStepCompletedV1 = exports.ProvisioningJobQueuedV1 = exports.OnboardingStartedV1 = exports.LifecycleUserCreatedV1 = exports.AuthVerificationEmailRequestedV1 = exports.EventVersionV1 = void 0;
exports.parseJourneyEventV1 = parseJourneyEventV1;
/**
 * New-user journey domain events — Zod v1 payloads (Phase 0.4).
 * Consumers: onboarding-service, notification-service, provisioning worker, gateway SSE.
 */
const zod_1 = require("zod");
exports.EventVersionV1 = zod_1.z.literal('v1');
const tenantId = zod_1.z.string().min(1).max(64);
const userId = zod_1.z.string().min(1).max(64);
const correlationId = zod_1.z.string().uuid().optional();
/** auth.verification_email_requested */
exports.AuthVerificationEmailRequestedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('auth.verification_email_requested'),
    tenantId,
    userId,
    email: zod_1.z.string().email(),
    /** Plain token for verify link; hashed row lives in public.email_verification_tokens. */
    verificationToken: zod_1.z.string().min(16).max(512),
    userName: zod_1.z.string().min(1).max(255).optional(),
    requestedAt: zod_1.z.string().datetime(),
    correlationId,
});
/** lifecycle.user_created */
exports.LifecycleUserCreatedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('lifecycle.user_created'),
    tenantId,
    userId,
    email: zod_1.z.string().email(),
    tenantCode: zod_1.z.string().min(1).max(128),
    role: zod_1.z.string().min(1).max(50),
    correlationId,
});
/** onboarding.started */
exports.OnboardingStartedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('onboarding.started'),
    tenantId,
    userId,
    email: zod_1.z.string().email(),
    companyName: zod_1.z.string().min(1).max(255),
    registrationId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid().optional(),
    correlationId,
});
/** provisioning.job_queued */
exports.ProvisioningJobQueuedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('provisioning.job_queued'),
    tenantId,
    jobId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().uuid(),
    requestedByUserId: zod_1.z.string().min(1).max(64),
    correlationId,
});
/** provisioning.step_completed */
exports.ProvisioningStepCompletedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('provisioning.step_completed'),
    tenantId,
    jobId: zod_1.z.string().uuid(),
    stepCode: zod_1.z.string().min(1).max(128),
    sequenceNo: zod_1.z.number().int().nonnegative(),
    correlationId,
});
/** provisioning.step_failed */
exports.ProvisioningStepFailedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('provisioning.step_failed'),
    tenantId,
    jobId: zod_1.z.string().uuid(),
    stepCode: zod_1.z.string().min(1).max(128),
    errorMessage: zod_1.z.string().min(1).max(4000),
    correlationId,
});
/** workspace.ready */
exports.WorkspaceReadyV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('workspace.ready'),
    tenantId,
    userId,
    sessionId: zod_1.z.string().uuid().optional(),
    correlationId,
});
/** user.email_verified */
exports.UserEmailVerifiedV1 = zod_1.z.object({
    apiVersion: exports.EventVersionV1,
    eventType: zod_1.z.literal('user.email_verified'),
    tenantId,
    userId,
    email: zod_1.z.string().email(),
    verifiedAt: zod_1.z.string().datetime(),
    correlationId,
});
exports.JourneyEventUnionV1 = zod_1.z.discriminatedUnion('eventType', [
    exports.AuthVerificationEmailRequestedV1,
    exports.LifecycleUserCreatedV1,
    exports.OnboardingStartedV1,
    exports.ProvisioningJobQueuedV1,
    exports.ProvisioningStepCompletedV1,
    exports.ProvisioningStepFailedV1,
    exports.WorkspaceReadyV1,
    exports.UserEmailVerifiedV1,
]);
function parseJourneyEventV1(input) {
    return exports.JourneyEventUnionV1.parse(input);
}
//# sourceMappingURL=journey-v1.js.map
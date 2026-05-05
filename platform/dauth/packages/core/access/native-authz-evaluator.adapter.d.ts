/**
 * NativeAuthzEvaluator — adapter that bridges the dauth-shared
 * `AuthzEvaluator` port to dauth-core's 14-step `evaluateAccess()` pipeline.
 *
 * Wiring direction (avoids the dauth-shared ↔ dauth-core circular dep):
 *
 *   dauth-shared declares the port + a globalThis registry slot
 *   dauth-core  imports the port, implements it via evaluateAccess()
 *               and registers it via setAuthzEvaluator() at bootstrap time
 *   middleware  in dauth-shared resolves the registered evaluator at
 *               request time (or falls back to LegacyClaimAuthzEvaluator)
 *
 * Once registered, every `requirePermission()`, `requireAnyPermission()`,
 * `requireDauth()`, and `requireOwnershipOf()` call routes through the
 * full pipeline (membership → tenant-active → RBAC → entitlement → ABAC →
 * ReBAC → SoD → delegation → lifecycle → SLA → ledger).
 *
 * Plan: docs/plans/need-to-clean-the-swift-trinket.md
 */
import type { AuthzEvaluator, AuthzEvaluationContext, AuthzDecision } from '@dos/dauth-shared';
export declare class NativeAuthzEvaluator implements AuthzEvaluator {
    readonly name: "dauth-native";
    evaluate(ctx: AuthzEvaluationContext): Promise<AuthzDecision>;
}
/**
 * One-shot installer — call this from each service's bootstrap (typically in
 * `service-bootstrap.ts` right after `bootstrapDauth(...)`). Idempotent;
 * subsequent calls reseat the same instance.
 */
export declare function installNativeAuthzEvaluator(): NativeAuthzEvaluator;

/**
 * Native ABAC adapter — delegates to the already-internal policy checks
 * (SoD engine, lifecycle-auth, tenant security policy). Returns `abstain`
 * when nothing in the native catalog matches the request, so a shadow-mode
 * Cerbos comparison does not treat "no native rule" as "native said allow".
 *
 * This adapter is the fallback whenever Cerbos is unavailable or
 * `DAUTH_CERBOS_ENFORCE=false`. The decision engine still runs the native
 * pipeline either way — this adapter exists so we can express "native" as
 * a port implementation and compare verdicts uniformly.
 */
import { evaluateModuleSod } from '../../sod/sod-engine';
import { evaluateLifecycleTransition } from '../../lifecycle-auth/lifecycle-auth.service';
import type {
  AbacAdapter,
  AbacRequest,
  AbacVerdict,
} from '../../ports/abac.port';
import { DAUTH_REASON_CODES } from '../../contracts/reason-codes';

const NATIVE_POLICY_VERSION = 'dauth-native@14-step';

export class NativeAbacAdapter implements AbacAdapter {
  readonly name = 'native' as const;

  async evaluate(request: AbacRequest): Promise<AbacVerdict> {
    const started = Date.now();

    // SoD — runs for any action where multiple roles are present.
    if (request.principal.roles.length > 1) {
      const sod = await evaluateModuleSod(
        request.principal.tenantId,
        (request.resource.attributes?.moduleCode as string | undefined) ?? deriveModule(request.action),
        [request.action],
      );
      if (!sod.passed) {
        const firstViolation = sod.violations?.[0];
        const firstModuleViolation = sod.moduleViolations?.[0];
        const reason = firstViolation
          ? `SoD: ${firstViolation.roleA} vs ${firstViolation.roleB} (${firstViolation.conflictLevel})`
          : firstModuleViolation
            ? `SoD: ${firstModuleViolation.actionA} vs ${firstModuleViolation.actionB} (${firstModuleViolation.conflictType})`
            : 'SoD conflict';
        return {
          decision: 'deny',
          reasonCode: DAUTH_REASON_CODES.DENY_SOD_CONFLICT,
          reason,
          policyVersion: NATIVE_POLICY_VERSION,
          source: 'native',
          latencyMs: Date.now() - started,
        };
      }
    }

    // Lifecycle transition — only when the request context carries one.
    const from = request.context?.lifecycleFromState as string | undefined;
    const to = request.context?.lifecycleToState as string | undefined;
    const entityType = request.resource.type;
    const entityId = request.resource.id;
    if (from && to && entityType && entityId) {
      const lc = await evaluateLifecycleTransition(
        request.principal.tenantId,
        request.principal.userId,
        {
          moduleCode: deriveModule(request.action),
          entityType,
          entityId,
          fromState: from,
          toState: to,
          permissionCode: request.action,
          userRoles: request.principal.roles,
        },
      );
      if (!lc.allowed) {
        return {
          decision: 'deny',
          reasonCode: DAUTH_REASON_CODES.DENY_LIFECYCLE_TRANSITION,
          reason: lc.reason ?? 'Lifecycle transition not allowed',
          policyVersion: NATIVE_POLICY_VERSION,
          source: 'native',
          latencyMs: Date.now() - started,
        };
      }
    }

    // Nothing in the native catalog objected — abstain so the decision
    // engine's other steps stay authoritative.
    return {
      decision: 'abstain',
      reasonCode: DAUTH_REASON_CODES.ABSTAIN_NO_POLICY,
      reason: 'No native ABAC rule matched',
      policyVersion: NATIVE_POLICY_VERSION,
      source: 'native',
      latencyMs: Date.now() - started,
    };
  }

  async currentPolicyVersion(): Promise<string> {
    return NATIVE_POLICY_VERSION;
  }
}

function deriveModule(action: string): string {
  const dot = action.indexOf('.');
  if (dot > 0) return action.slice(0, dot);
  const colon = action.indexOf(':');
  if (colon > 0) return action.slice(0, colon);
  return action;
}

export const nativeAbacAdapter = new NativeAbacAdapter();

/**
 * DAuth event publisher that dual-routes every call:
 *
 *   1. The legacy domain event on the platform event backbone
 *      (preserves existing `dauth.*` subscribers).
 *   2. A normalized DSOC audit record on the DSOC port
 *      (so the DSOC module's consumer sees a single, consistent feed
 *      under `dsoc.audit.*` / `dsoc.alert.*` topics).
 *
 * Call-sites import `publish` from this module instead of directly from
 * `@dos/platform-core/events`. No behavior change for existing domain
 * subscribers; DSOC gains a first-class, typed audit stream.
 *
 * Events not present in `DAUTH_DSOC_MAP` are forwarded to the backbone
 * only — they are domain notifications, not security audits.
 */

import { publish as backbonePublish } from '@dos/platform-core/events';
import type {
  DSOCAuditEvent,
  DSOCEventCategory,
  DSOCSeverity,
} from '@dos/ports/dsoc';
import { getDSOCPort } from '../audit/dsoc-port.registry';

type Route = {
  category: DSOCEventCategory;
  severity: DSOCSeverity;
  alert?: boolean;
  outcome?: DSOCAuditEvent['outcome'];
};

const DAUTH_DSOC_MAP: Record<string, Route> = {
  // Authentication
  'dauth.security_event': { category: 'authn', severity: 'info' },
  'dauth.login.success': { category: 'authn', severity: 'info' },
  'dauth.login.failure': { category: 'authn', severity: 'low', outcome: 'failure' },
  'dauth.account.locked': { category: 'authn', severity: 'high', alert: true },
  'dauth.registration.completed': { category: 'authn', severity: 'info' },
  'dauth.password_reset.requested': { category: 'authn', severity: 'low' },
  'dauth.password_reset.completed': { category: 'authn', severity: 'info' },
  'auth.verification_email_requested': { category: 'authn', severity: 'info' },

  // MFA
  'dauth.mfa.code_sent': { category: 'mfa', severity: 'info' },

  // Sessions
  'dauth.session.revoked': { category: 'session', severity: 'info' },
  'dauth.sessions.bulk_revoked': { category: 'session', severity: 'medium' },
  'session.anomaly.detected': { category: 'threat', severity: 'high', alert: true },

  // SoD
  'dauth.sod.conflicts_detected': { category: 'sod', severity: 'medium', alert: true },
  'dauth.sod.policy_created': { category: 'sod', severity: 'low' },
  'dauth.sod.policy_deactivated': { category: 'sod', severity: 'low' },
  'dauth.sod.waiver_granted': { category: 'sod', severity: 'medium' },

  // Delegation
  'dauth.delegation.expired': { category: 'delegation', severity: 'info' },
  'dauth.delegation.action_executed': { category: 'delegation', severity: 'info' },

  // Authority
  'dauth.authority.granted': { category: 'authz', severity: 'low' },
  'dauth.authority.revoked': { category: 'authz', severity: 'low' },
  'dauth.approval-rule.created': { category: 'authz', severity: 'info' },
  'dauth.approval-rule.deactivated': { category: 'authz', severity: 'info' },

  // Access — roles / permissions / profiles
  'dauth.role.assigned': { category: 'authz', severity: 'info' },
  'dauth.role.revoked': { category: 'authz', severity: 'info' },
  'dauth.role.created': { category: 'authz', severity: 'info' },
  'dauth.role.deactivated': { category: 'authz', severity: 'info' },
  'dauth.permission.assigned': { category: 'authz', severity: 'info' },
  'dauth.permission.revoked': { category: 'authz', severity: 'info' },
  'dauth.permission.created': { category: 'authz', severity: 'info' },
  'dauth.permission.deactivated': { category: 'authz', severity: 'info' },
  'dauth.access_profile.assigned': { category: 'authz', severity: 'info' },
  'dauth.access_profile.revoked': { category: 'authz', severity: 'info' },

  // Maker-checker
  'dauth.maker_checker.submitted': { category: 'authz', severity: 'info' },
  'dauth.maker_checker.approved': { category: 'authz', severity: 'info' },
  'dauth.maker_checker.rejected': { category: 'authz', severity: 'info' },

  // Access reviews
  'dauth.access_review.created': { category: 'authz', severity: 'info' },
  'dauth.access_review.completed': { category: 'authz', severity: 'info' },

  // CSRF
  'csrf.validation.failed': { category: 'threat', severity: 'medium' },
  'csrf.policy.updated': { category: 'config_change', severity: 'low' },

  // Invitations
  'dauth.invitation.created': { category: 'authz', severity: 'info' },
};

function extractActor(payload: Record<string, unknown>): DSOCAuditEvent['actor'] {
  const id =
    (payload.userId as string) ??
    (payload.grantedBy as string) ??
    (payload.assignedBy as string) ??
    (payload.revokedBy as string) ??
    (payload.createdBy as string) ??
    'system';
  return { type: 'user', id };
}

export async function publish(
  eventType: string,
  tenantId: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  // 1. Legacy domain event — unchanged contract for all existing subscribers.
  await backbonePublish(eventType, tenantId, payload);

  // 2. DSOC mirror — only for security-audit-relevant events.
  const route = DAUTH_DSOC_MAP[eventType];
  if (!route) return;

  const event: DSOCAuditEvent = {
    tenantId,
    category: route.category,
    severity: route.severity,
    actor: extractActor(payload),
    action: eventType,
    outcome: route.outcome ?? 'success',
    occurredAt: new Date().toISOString(),
    attributes: payload,
  };

  const port = getDSOCPort();
  if (route.alert) {
    await port.raiseAlert(event);
  } else {
    await port.recordAuditEvent(event);
  }
}

export type { Route as DAuthEventRoute };
export { DAUTH_DSOC_MAP };

import { subscribe } from '@dos/platform-core/events';
import { logger } from '@dos/platform-core/observability';
import { catchHandler, EC } from '@dos/platform-core/resilience';

export function registerDauthEventSubscribers(): void {
  subscribe({
    eventType: 'dauth.security_event',
    subscriberId: 'dauth:security-audit-sync',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        if (event.payload?.eventType === 'access_denied') {
          await logAuthDecision((event.tenantId ?? ''), {
            userId: event.payload.userId as string,
            permissionCode: 'dauth.security_event',
            decision: 'deny',
            reason: `Security event: ${event.payload.eventType}`,
          });
        }
      } catch (err) {
        logger.warn('[DAuth] security event sync failed', { error: (err as Error).message });
      }
    },
  });

  subscribe({
    eventType: 'dauth.access_review.created',
    subscriberId: 'dauth:access-review-notify',
    handler: async (event) => {
      try {
        // @ts-expect-error — notification.service is an optional cross-service dep (notification-service).
        const { createNotification } = await import('../../../modules/notification/services/notification.service.js');
        await createNotification((event.tenantId ?? ''), {
          userId: event.payload?.reviewerId as string,
          title: 'Access Review Assigned',
          body: `You have been assigned an access review for user ${event.payload?.userId}`,
          type: 'action_required',
          module: 'dauth',
          entityType: 'access_review',
          entityId: event.payload?.reviewId as string,
        }).catch(catchHandler(EC.EVENT_BUS));
      } catch {
        logger.warn('[DAuth] access review notification skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.access_review.completed',
    subscriberId: 'dauth:access-review-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.reviewerId as string,
          permissionCode: 'dauth.access_review.complete',
          decision: 'allow',
          reason: `Access review ${event.payload?.reviewId} decision: ${event.payload?.decision}`,
        });
      } catch {
        logger.warn('[DAuth] access review audit log skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.delegation.expired',
    subscriberId: 'dauth:delegation-expiry-notify',
    handler: async (event) => {
      try {
        // @ts-expect-error — notification.service is an optional cross-service dep (notification-service).
        const { createNotification } = await import('../../../modules/notification/services/notification.service.js');
        await createNotification((event.tenantId ?? ''), {
          userId: event.payload?.fromUserId as string,
          title: 'Delegation Expired',
          body: `Your delegation to user ${event.payload?.toUserId} has expired`,
          type: 'info',
          module: 'dauth',
          entityType: 'delegation',
          entityId: event.payload?.delegationId as string,
        }).catch(catchHandler(EC.EVENT_BUS));
      } catch {
        logger.warn('[DAuth] delegation expiry notification skipped');
      }
    },
  });

  // ── Security-critical audit subscribers ─────────────────────────

  subscribe({
    eventType: 'dauth.login.failure',
    subscriberId: 'dauth:login-failure-audit',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string ?? 'unknown', 'login_failure', {
          ip: event.payload?.ip as string,
          metadata: { email: event.payload?.email, reason: event.payload?.reason },
        });
      } catch {
        logger.warn('[DAuth] login failure audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.login.success',
    subscriberId: 'dauth:login-success-audit',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string, 'login_success', {
          ip: event.payload?.ip as string,
          metadata: { method: event.payload?.method },
        });
      } catch {
        logger.warn('[DAuth] login success audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.account.locked',
    subscriberId: 'dauth:account-locked-audit',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string, 'account_locked', {
          metadata: { reason: event.payload?.reason },
        });
        // @ts-expect-error — notification.service is an optional cross-service dep (notification-service).
        const { createNotification } = await import('../../../modules/notification/services/notification.service.js');
        await createNotification((event.tenantId ?? ''), {
          userId: event.payload?.userId as string,
          title: 'Account Locked',
          body: 'Your account has been locked due to too many failed login attempts',
          type: 'security_alert',
          module: 'dauth',
          entityType: 'account',
          entityId: event.payload?.userId as string,
        }).catch(catchHandler(EC.EVENT_BUS));
      } catch {
        logger.warn('[DAuth] account locked audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.session.revoked',
    subscriberId: 'dauth:session-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.userId as string,
          permissionCode: 'dauth.session.revoke',
          decision: 'allow',
          reason: `Session ${event.payload?.sessionId} revoked by ${event.payload?.revokedBy ?? 'system'}`,
        });
      } catch {
        logger.warn('[DAuth] session revoked audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.sessions.bulk_revoked',
    subscriberId: 'dauth:sessions-bulk-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.userId as string,
          permissionCode: 'dauth.sessions.bulk_revoke',
          decision: 'allow',
          reason: `Bulk session revocation: ${event.payload?.count ?? 0} sessions`,
        });
      } catch {
        logger.warn('[DAuth] bulk session revoked audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.sod.conflicts_detected',
    subscriberId: 'dauth:sod-conflicts-escalation',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string ?? 'system', 'sod_violation', {
          metadata: { conflicts: event.payload?.conflicts, count: event.payload?.count },
        });
        // @ts-expect-error — notification.service is an optional cross-service dep (notification-service).
        const { createNotification } = await import('../../../modules/notification/services/notification.service.js');
        await createNotification((event.tenantId ?? ''), {
          userId: event.payload?.securityOfficerUserId as string ?? event.payload?.userId as string,
          title: 'SoD Conflicts Detected',
          body: `${event.payload?.count ?? 0} separation of duties conflict(s) detected and require review`,
          type: 'security_alert',
          module: 'dauth',
          entityType: 'sod_conflict',
          entityId: event.payload?.userId as string,
        }).catch(catchHandler(EC.EVENT_BUS));
      } catch {
        logger.warn('[DAuth] SoD conflicts escalation skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.sod.waiver_granted',
    subscriberId: 'dauth:sod-waiver-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.grantedBy as string,
          permissionCode: 'dauth.sod.waiver_grant',
          decision: 'allow',
          reason: `SoD waiver granted for user ${event.payload?.userId} on rule ${event.payload?.ruleId}`,
        });
      } catch {
        logger.warn('[DAuth] SoD waiver audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.delegation.action_executed',
    subscriberId: 'dauth:delegation-action-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.actingUserId as string,
          permissionCode: event.payload?.action as string ?? 'dauth.delegation.execute',
          decision: 'allow',
          reason: `Delegated action executed on behalf of ${event.payload?.onBehalfOfUserId}`,
        });
      } catch {
        logger.warn('[DAuth] delegation action audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.role.assigned',
    subscriberId: 'dauth:role-assigned-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.assignedBy as string ?? 'system',
          permissionCode: 'dauth.role.assign',
          decision: 'allow',
          reason: `Role ${event.payload?.roleCode} assigned to user ${event.payload?.userId}`,
        });
      } catch {
        logger.warn('[DAuth] role assigned audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.role.revoked',
    subscriberId: 'dauth:role-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.revokedBy as string ?? 'system',
          permissionCode: 'dauth.role.revoke',
          decision: 'allow',
          reason: `Role ${event.payload?.roleCode} revoked from user ${event.payload?.userId}`,
        });
      } catch {
        logger.warn('[DAuth] role revoked audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.permission.assigned',
    subscriberId: 'dauth:permission-assigned-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.assignedBy as string ?? 'system',
          permissionCode: 'dauth.permission.assign',
          decision: 'allow',
          reason: `Permission ${event.payload?.permissionCode} assigned to role ${event.payload?.roleCode}`,
        });
      } catch {
        logger.warn('[DAuth] permission assigned audit skipped');
      }
    },
  });

  subscribe({
    eventType: 'dauth.permission.revoked',
    subscriberId: 'dauth:permission-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.revokedBy as string ?? 'system',
          permissionCode: 'dauth.permission.revoke',
          decision: 'allow',
          reason: `Permission ${event.payload?.permissionCode} revoked from role ${event.payload?.roleCode}`,
        });
      } catch {
        logger.warn('[DAuth] permission revoked audit skipped');
      }
    },
  });

  // ── Maker-checker workflow audit + notification ─────────────────

  subscribe({
    eventType: 'dauth.maker_checker.submitted',
    subscriberId: 'dauth:maker-checker-submitted-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.makerId as string,
          permissionCode: 'dauth.maker_checker.submit',
          decision: 'allow',
          reason: `Maker-checker submission: ${event.payload?.entityType}/${event.payload?.entityId} action=${event.payload?.action}`,
        });
      } catch { logger.warn('[DAuth] maker-checker submitted audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.maker_checker.approved',
    subscriberId: 'dauth:maker-checker-approved-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.checkerId as string,
          permissionCode: 'dauth.maker_checker.approve',
          decision: 'allow',
          reason: `Maker-checker approved: decision ${event.payload?.decisionId}`,
        });
      } catch { logger.warn('[DAuth] maker-checker approved audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.maker_checker.rejected',
    subscriberId: 'dauth:maker-checker-rejected-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.checkerId as string,
          permissionCode: 'dauth.maker_checker.reject',
          decision: 'deny',
          reason: `Maker-checker rejected: decision ${event.payload?.decisionId}, reason: ${event.payload?.reason}`,
        });
      } catch { logger.warn('[DAuth] maker-checker rejected audit skipped'); }
    },
  });

  // ── Identity lifecycle audit ──────────────────────────────────

  subscribe({
    eventType: 'dauth.password_reset.completed',
    subscriberId: 'dauth:password-reset-completed-audit',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string, 'password_reset', {
          metadata: { completedAt: event.payload?.completedAt },
        });
      } catch { logger.warn('[DAuth] password reset completed audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.registration.completed',
    subscriberId: 'dauth:registration-completed-audit',
    handler: async (event) => {
      try {
        const { logSecurityEvent } = await import('../audit/security-event.service.js');
        await logSecurityEvent((event.tenantId ?? ''), event.payload?.userId as string, 'registration', {
          metadata: { email: event.payload?.email },
        });
      } catch { logger.warn('[DAuth] registration completed audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.invitation.created',
    subscriberId: 'dauth:invitation-created-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.invitedBy as string,
          permissionCode: 'dauth.invitation.create',
          decision: 'allow',
          reason: `Invitation created for ${event.payload?.email} with role ${event.payload?.roleCode}`,
        });
      } catch { logger.warn('[DAuth] invitation created audit skipped'); }
    },
  });

  // ── Policy/config change audit + cache invalidation ───────────

  subscribe({
    eventType: 'dauth.sod.policy_created',
    subscriberId: 'dauth:sod-policy-created-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.createdBy as string ?? 'system',
          permissionCode: 'dauth.sod.policy_create',
          decision: 'allow',
          reason: `SoD policy created: ${event.payload?.ruleCode}`,
        });
      } catch { logger.warn('[DAuth] SoD policy created audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.sod.policy_deactivated',
    subscriberId: 'dauth:sod-policy-deactivated-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.deactivatedBy as string ?? 'system',
          permissionCode: 'dauth.sod.policy_deactivate',
          decision: 'allow',
          reason: `SoD policy deactivated: ${event.payload?.ruleCode}`,
        });
      } catch { logger.warn('[DAuth] SoD policy deactivated audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.approval-rule.created',
    subscriberId: 'dauth:approval-rule-created-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.createdBy as string ?? 'system',
          permissionCode: 'dauth.approval_rule.create',
          decision: 'allow',
          reason: `Approval rule created: ${event.payload?.ruleId} for action ${event.payload?.actionCode}`,
        });
      } catch { logger.warn('[DAuth] approval rule created audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.approval-rule.deactivated',
    subscriberId: 'dauth:approval-rule-deactivated-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.deactivatedBy as string ?? 'system',
          permissionCode: 'dauth.approval_rule.deactivate',
          decision: 'allow',
          reason: `Approval rule deactivated: ${event.payload?.ruleId}`,
        });
      } catch { logger.warn('[DAuth] approval rule deactivated audit skipped'); }
    },
  });

  // ── Authority/access change audit + cache invalidation ────────

  subscribe({
    eventType: 'dauth.authority.granted',
    subscriberId: 'dauth:authority-granted-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.grantedBy as string ?? 'system',
          permissionCode: 'dauth.authority.grant',
          decision: 'allow',
          reason: `Authority ${event.payload?.authorityCode} granted to user ${event.payload?.userId}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] authority granted audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.authority.revoked',
    subscriberId: 'dauth:authority-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.revokedBy as string ?? 'system',
          permissionCode: 'dauth.authority.revoke',
          decision: 'allow',
          reason: `Authority ${event.payload?.authorityCode} revoked from user ${event.payload?.userId}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] authority revoked audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.access_profile.assigned',
    subscriberId: 'dauth:access-profile-assigned-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.assignedBy as string ?? 'system',
          permissionCode: 'dauth.access_profile.assign',
          decision: 'allow',
          reason: `Access profile ${event.payload?.profileCode} assigned to user ${event.payload?.userId}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] access profile assigned audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.access_profile.revoked',
    subscriberId: 'dauth:access-profile-revoked-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.revokedBy as string ?? 'system',
          permissionCode: 'dauth.access_profile.revoke',
          decision: 'allow',
          reason: `Access profile ${event.payload?.profileCode} revoked from user ${event.payload?.userId}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] access profile revoked audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.role.created',
    subscriberId: 'dauth:role-created-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.createdBy as string ?? 'system',
          permissionCode: 'dauth.role.create',
          decision: 'allow',
          reason: `Role created: ${event.payload?.roleCode}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] role created audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.role.deactivated',
    subscriberId: 'dauth:role-deactivated-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.deactivatedBy as string ?? 'system',
          permissionCode: 'dauth.role.deactivate',
          decision: 'allow',
          reason: `Role deactivated: ${event.payload?.roleCode}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] role deactivated audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.permission.created',
    subscriberId: 'dauth:permission-created-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.createdBy as string ?? 'system',
          permissionCode: 'dauth.permission.create',
          decision: 'allow',
          reason: `Permission created: ${event.payload?.permissionCode}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] permission created audit skipped'); }
    },
  });

  subscribe({
    eventType: 'dauth.permission.deactivated',
    subscriberId: 'dauth:permission-deactivated-audit',
    handler: async (event) => {
      try {
        const { logAuthDecision } = await import('../audit/decision-log.service.js');
        await logAuthDecision((event.tenantId ?? ''), {
          userId: event.payload?.deactivatedBy as string ?? 'system',
          permissionCode: 'dauth.permission.deactivate',
          decision: 'allow',
          reason: `Permission deactivated: ${event.payload?.permissionCode}`,
        });
        const { invalidatePermissionCache } = await import('../access/access.resolver.js');
        invalidatePermissionCache((event.tenantId ?? ''));
      } catch { logger.warn('[DAuth] permission deactivated audit skipped'); }
    },
  });

  // ── CSRF security subscribers ──────────────────────────────────
  import('../csrf/csrf.subscribers.js')
    .then(({ registerCsrfEventSubscribers }) => registerCsrfEventSubscribers())
    .catch(() => logger.warn('[DAuth] CSRF event subscribers registration skipped'));

  logger.info('[DAuth] Event subscribers registered (37 handlers)');
}

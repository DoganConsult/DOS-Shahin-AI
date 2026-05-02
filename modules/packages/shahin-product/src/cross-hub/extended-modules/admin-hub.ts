// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: ADMIN HUB → other hubs
// Subscribers: admin.tenant_suspended, admin.tenant_activated,
//   admin.user_deactivated, admin.role_changed, admin.plan_upgraded,
//   admin.config_changed
// ============================================

import {
  type SubFn,
  safeCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
  recordAudit,
} from './helpers';

export function registerAdminHub(sub: SubFn): void {

  // admin.tenant_suspended → Operations Hub: pause all cycles
  //                        → Automation Hub: disable all automations
  //                        → Workflow Hub: freeze active workflows
  //                        → Connector Hub: pause all syncs
  //                        → Audit Hub: log suspension event
  sub('admin.tenant_suspended', 'xhub-admin→ops-pause', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'ops.health_degraded', tenantId,
      sourceService: 'cross-hub-integration', severity: 'critical',
      payload: { reason: 'tenant_suspended', suspendedBy: payload.adminId, suspendReason: payload.reason },
    });

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'tenant_lifecycle', entityId: tenantId,
      afterState: { trigger: 'admin.tenant_suspended', reason: payload.reason },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    await safeNotifyAdmins(tenantId, {
      type: 'tenant_suspended',
      title: '[AGRC-OS] Tenant Suspended',
      body: `Tenant suspended by "${payload.adminId || 'system'}". Reason: ${payload.reason || 'N/A'}. All operations paused.`,
      link: '/admin',
    });
  });

  // admin.tenant_activated → Operations Hub: resume cycles
  //                        → Automation Hub: re-enable automations
  //                        → Workspace Hub: refresh workspace state
  //                        → AGRC-OS: trigger full cycle
  sub('admin.tenant_activated', 'xhub-admin→ops-resume', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'tenant_activated', activatedBy: payload.adminId },
    });

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'tenant_reactivation_sync', activatedBy: payload.adminId },
    });

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'tenant_lifecycle', entityId: tenantId,
      afterState: { trigger: 'admin.tenant_activated' },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // admin.user_deactivated → Team Hub: remove from all teams
  //                        → Workflow Hub: reassign all tasks
  //                        → Governance Hub: revoke RACI assignments
  //                        → Audit Hub: log access revocation
  //                        → Risk Hub: flag orphaned controls
  sub('admin.user_deactivated', 'xhub-admin→team-remove', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    await safeCreateTask(tenantId, {
      title: `[URGENT] Remove deactivated user from all teams: ${payload.userName || entityId}`,
      description: `User "${payload.userName}" deactivated. Remove from all teams, revoke RACI, and reassign owned controls/tasks.`,
      assignedTo: admin, dueDate: daysFromNow(1),
      entityType: 'user', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Reassign tasks from deactivated user: ${payload.userName || entityId}`,
      description: `All tasks, controls, and evidence items owned by "${payload.userName}" must be reassigned immediately.`,
      assignedTo: admin, dueDate: daysFromNow(2),
      entityType: 'user', entityId: entityId || '',
    });

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Orphaned controls: user ${payload.userName || entityId} deactivated`,
        description: `Deactivated user may have owned controls, evidence, and RACI assignments that are now orphaned.`,
        category: 'operational', likelihood: 3, impact: 3,
      });
    } catch { /* best effort */ }

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'delete',
      entityType: 'user_access', entityId: entityId || '',
      afterState: { trigger: 'admin.user_deactivated', userName: payload.userName, deactivatedBy: payload.adminId },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // admin.role_changed → Governance Hub: review segregation of duties
  //                    → Audit Hub: log privilege change
  //                    → Risk Hub: flag if elevated to admin
  //                    → Compliance Hub: access control review
  sub('admin.role_changed', 'xhub-admin→governance-sod', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Segregation of duties review: ${payload.userName || entityId}`,
      description: `Admin role changed from "${payload.oldRole}" to "${payload.newRole}" for "${payload.userName}". Verify segregation of duties and least-privilege.`,
      dueDate: daysFromNow(3), entityType: 'user', entityId: entityId || '',
    });

    if (payload.newRole === 'admin' || payload.newRole === 'owner' || payload.newRole === 'super_admin') {
      try {
        const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
        await createRisk(tenantId, {
          title: `[Auto] Elevated privilege: ${payload.userName || entityId} → ${payload.newRole}`,
          description: `User elevated to "${payload.newRole}". Review access scope, audit trail exposure, and segregation of duties.`,
          category: 'governance', likelihood: 2, impact: 5,
        });
      } catch { /* best effort */ }
    }

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'admin_role_change', entityId: entityId || '',
      afterState: { trigger: 'admin.role_changed', oldRole: payload.oldRole, newRole: payload.newRole },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // admin.plan_upgraded → Connector Hub: unlock tier-gated connectors
  //                     → Automation Hub: unlock advanced automation rules
  //                     → Advanced Hub: enable red team / digital twin if in plan
  //                     → Privacy Hub: enable privacy ops if in plan
  //                     → Reports Hub: unlock advanced reporting
  sub('admin.plan_upgraded', 'xhub-admin→connector-unlock', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'plan_upgrade_unlock', oldPlan: payload.oldPlan, newPlan: payload.newPlan },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'plan_upgraded',
      title: '[AGRC-OS] Plan Upgraded',
      body: `Plan upgraded from "${payload.oldPlan}" to "${payload.newPlan}". New features unlocked: ${payload.unlockedFeatures?.join(', ') || 'check settings'}.`,
      link: '/admin',
    });

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'plan_upgrade', entityId: tenantId,
      afterState: { trigger: 'admin.plan_upgraded', oldPlan: payload.oldPlan, newPlan: payload.newPlan },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // admin.config_changed → Operations Hub: reconfigure job cadences
  //                      → Analytics Hub: recalculate baselines
  //                      → Compliance Hub: re-resolve org profile
  //                      → AGRC-OS: trigger immediate cycle
  sub('admin.config_changed', 'xhub-admin→ops-reconfig', async (e) => {
    const { tenantId, payload } = e;

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'admin_config_changed', configKey: payload.configKey, changedBy: payload.adminId },
    });

    await safePublish({
      eventType: 'automation.rule_triggered', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { ruleType: 'config_change_resync', configKey: payload.configKey },
    });

    await recordAudit({
      tenantId, userId: payload.adminId || 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'platform_config', entityId: payload.configKey || 'system',
      afterState: { trigger: 'admin.config_changed', configKey: payload.configKey, oldValue: payload.oldValue, newValue: payload.newValue },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });
}

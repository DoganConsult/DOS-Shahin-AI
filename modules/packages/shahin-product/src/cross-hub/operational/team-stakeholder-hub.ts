// @ts-nocheck — module-layer imports not yet extracted
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Cross-Hub: TEAM + STAKEHOLDER HUBS → other hubs
// Subscribers: team.member_added, team.member_removed, team.role_changed,
//   team.created, team.disbanded, stakeholder.invited, stakeholder.accepted,
//   team.profile_switched
// ============================================

import {
  type SubFn,
  safeQuery, tenantSchema,
  safeCreateTask, safeNotifyAdmins, safePublish,
  daysFromNow, getFirstAdmin,
  recordAudit,
} from './helpers';
import { getFirstRow } from '@dos/db';
import { SYSTEM_JOB_ACTOR } from '@dos/platform-core/constants';

export function registerTeamStakeholderHub(sub: SubFn): void {

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. TEAM HUB → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  // team.member_added → Workflow Hub: assign pending tasks to new member
  //                   → Compliance Hub: assign control ownership
  //                   → Governance Hub: update RACI matrices
  //                   → Knowledge Hub: trigger onboarding materials
  sub('team.member_added', 'xhub-team→workflow-assign', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Onboard team member: ${payload.memberName || payload.fullName || payload.email || (payload.userId?.length === 36 ? 'new member' : payload.userId) || 'new member'}`,
      description: `New member "${payload.memberName}" added to team "${payload.teamName}". Assign controls, review RACI, and provide onboarding materials.`,
      assignedTo: payload.userId, dueDate: daysFromNow(7),
      entityType: 'team', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Update RACI for team change: ${payload.teamName || entityId}`,
      description: `Team "${payload.teamName}" has a new member. Review and update RACI assignments across linked controls, risks, and workflows.`,
      dueDate: daysFromNow(5), entityType: 'team', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'team_member_added', teamId: entityId, userId: payload.userId },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'team_member_added',
      title: '[AGRC-OS] New Team Member',
      body: `"${payload.memberName || payload.userId}" added to team "${payload.teamName}". RACI review and control assignment tasks created.`,
      link: '/team-management',
    });

    try {
      const schema = tenantSchema(tenantId);
      const tplRes = await safeQuery(
        `SELECT workflow_id FROM "${schema}".workflows WHERE name ILIKE '%onboarding%' AND status = 'active' LIMIT 1`
      );
      if (tplRes.rows.length > 0) {
        const { executeWorkflow } = await import('../../../modules/workflow/services/core/workflow.service');
        await executeWorkflow(tenantId, getFirstRow(tplRes)?.workflow_id, {
          type: 'team.member_added',
          data: { userId: payload.userId, teamId: entityId, role: payload.role, memberName: payload.memberName },
        });
      }
    } catch {}
  });

  // team.member_removed → Workflow Hub: reassign orphaned tasks
  //                     → Risk Hub: flag orphaned controls as risk
  //                     → Audit Hub: log access revocation
  //                     → Compliance Hub: recalculate coverage
  //                     → Governance Hub: update RACI
  sub('team.member_removed', 'xhub-team→workflow-reassign', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    await safeCreateTask(tenantId, {
      title: `[URGENT] Reassign tasks from removed member: ${payload.memberName || payload.userId}`,
      description: `Member "${payload.memberName}" removed from team "${payload.teamName}". Reassign all owned tasks, controls, and evidence items immediately.`,
      assignedTo: admin, dueDate: daysFromNow(2),
      entityType: 'team', entityId: entityId || '',
    });

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Orphaned controls risk: ${payload.memberName || payload.userId} removed`,
        description: `Team member removed. Controls and evidence previously owned by "${payload.memberName}" may be orphaned until reassigned.`,
        category: 'operational', likelihood: 3, impact: 3,
      });
    } catch { /* best effort */ }

    await safeCreateTask(tenantId, {
      title: `[Auto] Update RACI: member removed from ${payload.teamName || entityId}`,
      description: `Remove "${payload.memberName}" from all RACI assignments and redistribute responsibilities.`,
      assignedTo: admin, dueDate: daysFromNow(3),
      entityType: 'team', entityId: entityId || '',
    });

    await recordAudit({
      tenantId, userId: 'agrc-os', module: 'cross_hub', action: 'delete',
      entityType: 'team_access', entityId: payload.userId || entityId || '',
      afterState: { trigger: 'team.member_removed', team: payload.teamName, member: payload.memberName },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // team.role_changed → Governance Hub: RACI update + permission review
  //                   → Compliance Hub: access control review
  //                   → Audit Hub: log privilege change for audit trail
  //                   → Risk Hub: flag if elevated privileges
  sub('team.role_changed', 'xhub-team→governance-raci', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Permission review: ${payload.memberName || entityId} role → ${payload.newRole}`,
      description: `Role changed from "${payload.oldRole}" to "${payload.newRole}" for "${payload.memberName}". Verify RACI, access controls, and segregation of duties.`,
      dueDate: daysFromNow(3), entityType: 'team', entityId: entityId || '',
    });

    if (payload.newRole === 'admin' || payload.newRole === 'owner') {
      try {
        const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
        await createRisk(tenantId, {
          title: `[Auto] Elevated privilege risk: ${payload.memberName || entityId}`,
          description: `User "${payload.memberName}" elevated to "${payload.newRole}". Review segregation of duties and least-privilege principle.`,
          category: 'governance', likelihood: 2, impact: 4,
        });
      } catch { /* best effort */ }
    }

    await recordAudit({
      tenantId, userId: 'agrc-os', module: 'cross_hub', action: 'update',
      entityType: 'role_change', entityId: payload.userId || entityId || '',
      afterState: { trigger: 'team.role_changed', oldRole: payload.oldRole, newRole: payload.newRole },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });

  // team.created → Workspace Hub: update workspace structure
  //             → Governance Hub: create initial RACI template
  //             → Knowledge Hub: assign onboarding content pack
  sub('team.created', 'xhub-team→workspace-update', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Setup RACI for new team: ${payload.teamName || entityId}`,
      description: `New GRC team "${payload.teamName}" created. Define RACI assignments for all relevant controls, risks, and workflows.`,
      dueDate: daysFromNow(7), entityType: 'team', entityId: entityId || '',
    });

    await safeCreateTask(tenantId, {
      title: `[Auto] Assign controls to team: ${payload.teamName || entityId}`,
      description: `Map control ownership and evidence responsibilities to the new team.`,
      dueDate: daysFromNow(14), entityType: 'team', entityId: entityId || '',
    });

    await safeNotifyAdmins(tenantId, {
      type: 'team_created',
      title: '[AGRC-OS] New GRC Team Created',
      body: `Team "${payload.teamName}" created. RACI and control assignment tasks auto-generated.`,
      link: '/team-management',
    });

    try {
      const { seedWorkflowTemplates } = await import('../../../modules/workflow/services/templates/workflow-templates.service');
      await seedWorkflowTemplates(tenantId, 'agrc-os');
    } catch {}
  });

  // team.disbanded → Risk Hub: flag orphaned resources
  //               → Workflow Hub: reassign all team tasks
  //               → Compliance Hub: coverage gap check
  //               → Governance Hub: archive RACI
  sub('team.disbanded', 'xhub-team→risk-orphan', async (e) => {
    const { tenantId, entityId, payload } = e;
    const admin = await getFirstAdmin(tenantId);

    try {
      const { createRisk } = await import('../../../modules/risk/services/core/risk.service');
      await createRisk(tenantId, {
        title: `[Auto] Orphaned resources: team "${payload.teamName || entityId}" disbanded`,
        description: `Team disbanded. All controls, evidence, workflows, and RACI assignments previously owned by this team are now orphaned. Immediate reassignment required.`,
        category: 'operational', likelihood: 5, impact: 4,
      });
    } catch { /* best effort */ }

    await safeCreateTask(tenantId, {
      title: `[URGENT] Reassign all resources: team "${payload.teamName || entityId}" disbanded`,
      description: `Team disbanded. Redistribute all controls, tasks, evidence items, and RACI responsibilities to surviving teams.`,
      assignedTo: admin, dueDate: daysFromNow(2),
      entityType: 'team', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'warning',
      payload: { reason: 'team_disbanded', teamId: entityId },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 16b. STAKEHOLDER / INVITATION → other hubs
  // ═══════════════════════════════════════════════════════════════════════════

  sub('stakeholder.invited' as string, 'xhub-stakeholder→onboarding-prep', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Prepare onboarding for invited stakeholder: ${payload.email || entityId}`,
      description: `Invitation sent to "${payload.email}" for role "${payload.role}". Prepare access credentials, onboarding materials, and RACI briefing.`,
      dueDate: daysFromNow(3),
      entityType: 'invitation', entityId: entityId || '',
    });

    await safeNotifyAdmins(tenantId, {
      type: 'stakeholder_invited',
      title: '[AGRC-OS] New Stakeholder Invited',
      body: `"${payload.email}" invited as "${payload.role}". Onboarding preparation task created.`,
      link: '/team-management',
    });
  });

  sub('stakeholder.accepted' as string, 'xhub-stakeholder→welcome-setup', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] Complete onboarding: ${payload.email || entityId} accepted invitation`,
      description: `Stakeholder "${payload.email}" accepted as "${payload.role}". Finalize RACI assignments, grant system access, and schedule orientation.`,
      dueDate: daysFromNow(5),
      entityType: 'invitation', entityId: entityId || '',
    });

    await safePublish({
      eventType: 'compliance.posture_changed', tenantId,
      sourceService: 'cross-hub-integration', severity: 'info',
      payload: { reason: 'stakeholder_accepted', userId: payload.userId, role: payload.role, email: payload.email },
    });

    await safeNotifyAdmins(tenantId, {
      type: 'stakeholder_accepted',
      title: '[AGRC-OS] Stakeholder Onboarded',
      body: `"${payload.email}" accepted invitation as "${payload.role}". Onboarding and RACI setup tasks created.`,
      link: '/team-management',
    });

    await recordAudit({
      tenantId, userId: payload.userId || SYSTEM_JOB_ACTOR, module: 'cross_hub', action: 'create',
      entityType: 'stakeholder_onboard', entityId: payload.userId || entityId || '',
      afterState: { trigger: 'stakeholder.accepted', email: payload.email, role: payload.role },
    }).catch(catchHandler(EC.EVENT_BUS, {}));

    try {
      const schema = tenantSchema(tenantId);
      const tplRes = await safeQuery(
        `SELECT workflow_id FROM "${schema}".workflows WHERE name ILIKE '%role activation%' AND status = 'active' LIMIT 1`
      );
      if (tplRes.rows.length > 0) {
        const { executeWorkflow } = await import('../../../modules/workflow/services/core/workflow.service');
        await executeWorkflow(tenantId, getFirstRow(tplRes)?.workflow_id, {
          type: 'stakeholder.accepted',
          data: { userId: payload.userId, email: payload.email, role: payload.role },
        });
      }
    } catch {}
  });

  sub('team.profile_switched' as string, 'xhub-team→raci-review-profile', async (e) => {
    const { tenantId, entityId, payload } = e;

    await safeCreateTask(tenantId, {
      title: `[Auto] RACI review: profile switched for ${payload.userId || entityId}`,
      description: `Member switched to profile "${payload.roleCode}". Review RACI assignments and permissions to ensure alignment with new role responsibilities.`,
      dueDate: daysFromNow(3),
      entityType: 'member_profile', entityId: entityId || '',
    });

    await recordAudit({
      tenantId, userId: payload.userId || SYSTEM_JOB_ACTOR, module: 'cross_hub', action: 'update',
      entityType: 'profile_switch', entityId: payload.profileId || entityId || '',
      afterState: { trigger: 'team.profile_switched', roleCode: payload.roleCode, profileId: payload.profileId },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  });
}

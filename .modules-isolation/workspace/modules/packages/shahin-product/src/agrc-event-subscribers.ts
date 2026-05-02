// @ts-nocheck — module-layer imports not yet extracted
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/module-sdk';
import { AGRC_EVENT_TYPES } from './agrc-events';
import { registerModuleEventTypes } from '@dos/platform-core/events';

export async function registerAgrcEventSubscribers(): Promise<void> {
  // Auto-generated module subscribers
  try {
    const moduleImport = await import('../../modules/action/source/backend/action/events/bus/action.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerActionSubscribers) {
      moduleImport.registerActionSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/agrc-engine/source/backend/agrc-engine/events/bus/agrc-engine.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAgrcEngineSubscribers) {
      moduleImport.registerAgrcEngineSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../../services/ai-engine-service/src/runtime/ai/events/bus/ai.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAiSubscribers) {
      moduleImport.registerAiSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../../services/ai-engine-service/src/domain/ai-governance/events/bus/ai-governance.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAiGovernanceSubscribers) {
      moduleImport.registerAiGovernanceSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/analytics/source/backend/analytics/events/bus/analytics.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAnalyticsSubscribers) {
      moduleImport.registerAnalyticsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/asset/source/backend/asset/events/bus/asset.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAssetSubscribers) {
      moduleImport.registerAssetSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/attestation/source/backend/attestation/events/bus/attestation.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAttestationSubscribers) {
      moduleImport.registerAttestationSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/audit/source/backend/audit/events/bus/audit.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerAuditSubscribers) {
      moduleImport.registerAuditSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/bcp/source/backend/bcp/events/bus/bcp.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerBcpSubscribers) {
      moduleImport.registerBcpSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/benchmarks/source/backend/benchmarks/events/bus/benchmarks.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerBenchmarksSubscribers) {
      moduleImport.registerBenchmarksSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/compliance/source/backend/compliance/events/bus/compliance.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerComplianceSubscribers) {
      moduleImport.registerComplianceSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/controls/source/backend/controls/events/bus/controls.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerControlsSubscribers) {
      moduleImport.registerControlsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/dashboard/source/backend/dashboard/events/bus/dashboard.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerDashboardSubscribers) {
      moduleImport.registerDashboardSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/dashboard-editor/source/backend/dashboard-editor/events/bus/dashboard-editor.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerDashboardEditorSubscribers) {
      moduleImport.registerDashboardEditorSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/dora/source/backend/dora/events/bus/dora.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerDoraSubscribers) {
      moduleImport.registerDoraSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/evidence/source/backend/evidence/events/bus/evidence.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerEvidenceSubscribers) {
      moduleImport.registerEvidenceSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/exception/source/backend/exception/events/bus/exception.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerExceptionSubscribers) {
      moduleImport.registerExceptionSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/executive/source/backend/executive/events/bus/executive.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerExecutiveSubscribers) {
      moduleImport.registerExecutiveSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/fitch/source/backend/fitch/events/bus/fitch.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerFitchSubscribers) {
      moduleImport.registerFitchSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/governance/source/backend/governance/events/bus/governance.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerGovernanceSubscribers) {
      moduleImport.registerGovernanceSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/governance-ai/source/backend/governance-ai/events/bus/governance-ai.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerGovernanceAiSubscribers) {
      moduleImport.registerGovernanceAiSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/governance-os/source/backend/governance-os/events/bus/governance-os.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerGovernanceOsSubscribers) {
      moduleImport.registerGovernanceOsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/grc-query/source/backend/grc-query/events/bus/grc-query.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerGrcQuerySubscribers) {
      moduleImport.registerGrcQuerySubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/inbox/source/backend/inbox/events/bus/inbox.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerInboxSubscribers) {
      moduleImport.registerInboxSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/incident/source/backend/incident/events/bus/incident.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerIncidentSubscribers) {
      moduleImport.registerIncidentSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/integrations/source/backend/integrations/events/bus/integrations.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerIntegrationsSubscribers) {
      moduleImport.registerIntegrationsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/issues/source/backend/issues/events/bus/issues.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerIssuesSubscribers) {
      moduleImport.registerIssuesSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/journey/source/backend/journey/events/bus/journey.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerJourneySubscribers) {
      moduleImport.registerJourneySubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/knowledge/source/backend/knowledge/events/bus/knowledge.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerKnowledgeSubscribers) {
      moduleImport.registerKnowledgeSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/ksa-regulatory/source/backend/ksa-regulatory/events/bus/ksa-regulatory.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerKsaRegulatorySubscribers) {
      moduleImport.registerKsaRegulatorySubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/local-knowledge/source/backend/local-knowledge/events/bus/local-knowledge.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerLocalKnowledgeSubscribers) {
      moduleImport.registerLocalKnowledgeSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/mcp/source/backend/mcp/events/bus/mcp.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerMcpSubscribers) {
      moduleImport.registerMcpSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/mobile/source/backend/mobile/events/bus/mobile.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerMobileSubscribers) {
      moduleImport.registerMobileSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/notification/source/backend/notification/events/bus/notification.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerNotificationSubscribers) {
      moduleImport.registerNotificationSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/onboarding/source/backend/onboarding/events/bus/onboarding.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerOnboardingSubscribers) {
      moduleImport.registerOnboardingSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/operating-cockpit/source/backend/operating-cockpit/events/bus/operating-cockpit.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerOperatingCockpitSubscribers) {
      moduleImport.registerOperatingCockpitSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/packs/source/backend/packs/events/bus/packs.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerPacksSubscribers) {
      moduleImport.registerPacksSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/playbooks/source/backend/playbooks/events/bus/playbooks.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerPlaybooksSubscribers) {
      moduleImport.registerPlaybooksSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/policy/source/backend/policy/events/bus/policy.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerPolicySubscribers) {
      moduleImport.registerPolicySubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/portals/source/backend/portals/events/bus/portals.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerPortalsSubscribers) {
      moduleImport.registerPortalsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/privacy/source/backend/privacy/events/bus/privacy.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerPrivacySubscribers) {
      moduleImport.registerPrivacySubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/proactive-leadership/source/backend/proactive-leadership/events/bus/proactive-leadership.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerProactiveLeadershipSubscribers) {
      moduleImport.registerProactiveLeadershipSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/qiyas/source/backend/qiyas/events/bus/qiyas.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerQiyasSubscribers) {
      moduleImport.registerQiyasSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/records/source/backend/records/events/bus/records.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerRecordsSubscribers) {
      moduleImport.registerRecordsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/remediation/source/backend/remediation/events/bus/remediation.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerRemediationSubscribers) {
      moduleImport.registerRemediationSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/reporting/source/backend/reporting/events/bus/reporting.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerReportingSubscribers) {
      moduleImport.registerReportingSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/risk/source/backend/risk/events/bus/risk.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerRiskSubscribers) {
      moduleImport.registerRiskSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/team/source/backend/team/events/bus/team.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerTeamSubscribers) {
      moduleImport.registerTeamSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/training/source/backend/training/events/bus/training.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerTrainingSubscribers) {
      moduleImport.registerTrainingSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/vendor/source/backend/vendor/events/bus/vendor.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerVendorSubscribers) {
      moduleImport.registerVendorSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/widgets/source/backend/widgets/events/bus/widgets.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerWidgetsSubscribers) {
      moduleImport.registerWidgetsSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }
  try {
    const moduleImport = await import('../../modules/workflow/source/backend/workflow/events/bus/workflow.consumer').catch(() => null);
    if (moduleImport && moduleImport.registerWorkflowSubscribers) {
      moduleImport.registerWorkflowSubscribers();
    }
  } catch (e) { /* non-fatal missing subscriber */ }

  // Register AGRC product events with platform event bus
  registerModuleEventTypes('agrc', AGRC_EVENT_TYPES as unknown as string[]);
  try {
    const { registerControlProcessCycleSubscribers } = await import('../../modules/compliance/services/misc/control-process-cycle.service');
    registerControlProcessCycleSubscribers();
  } catch (e: unknown) { logger.warn('Control process cycle subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerRunbookSubscribers } = await import('../../modules/platform/services/agrc/agrc-runbook.service');
    registerRunbookSubscribers();
  } catch (e: unknown) { logger.warn('Runbook subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerNotificationBridge } = await import('../../modules/platform/services/agrc/agrc-notification-bridge.service');
    registerNotificationBridge();
  } catch (e: unknown) { logger.warn('Notification bridge registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerCrossHubIntegration } = await import('./cross-hub/index');
    registerCrossHubIntegration();
  } catch (e: unknown) { logger.warn('Cross-Hub Integration registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerCrossModuleChainHandlers } = await import('../../modules/platform/services/cross/cross-module-chain-handler.service');
    registerCrossModuleChainHandlers();
  } catch (e: unknown) { logger.warn('Cross-Module Chain Handlers registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerAutoResolutionSubscribers } = await import('../../modules/workflow/services/tasks/task-auto-resolution.service');
    registerAutoResolutionSubscribers();
  } catch (e: unknown) { logger.warn('Auto-Resolution subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerAgentCoordinationSubscribers } = await import('../../modules/ai/services/agent-coordination.service');
    registerAgentCoordinationSubscribers();
  } catch (e: unknown) { logger.warn('Agent Coordination subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { eventBus } = await import('../../modules/platform/services/event/event-bus.service');

    eventBus.subscribe('vendor.engagement_score_low', 'engagement-enforcement-gate', async (event) => {
      try {
        const { validateVendorGate } = await import('../../modules/governance/services/misc/enforcement-gate.service');
        await validateVendorGate(
          event.tenantId,
          event.entityId || '',
          (event.payload?.vendorName as string) || 'Unknown Vendor',
          (event.payload?.riskScore as number) ?? 0,
          'engagement-os'
        );
      } catch (err: unknown) {
        logger.warn('[Engagement-EventBus] enforcement gate update failed', { error: toErrorMessage(err) });
      }
    });

    eventBus.subscribe('vendor.evidence_rejected', 'engagement-evidence-remediation', async (event) => {
      try {
        const { createTask } = await import('../../modules/workflow/services/tasks/task-board.service');
        await createTask(event.tenantId, {
          title: `Evidence Rejected: ${event.payload?.evidenceTitle || 'Unknown'}`,
          description: 'Evidence was rejected during auto-evaluation. Please review and resubmit.',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (err: unknown) {
        logger.warn('[Engagement-EventBus] evidence remediation task failed', { error: toErrorMessage(err) });
      }
    });

    eventBus.subscribe('regulator.request_received', 'engagement-regulator-notify', async (event) => {
      try {
        const { createNotification } = await import('../../modules/notification/services/notification.service');
        await createNotification(event.tenantId, {
          userId: (event.payload?.complianceOfficerId as string) || '',
          type: 'regulator_request',
          title: 'New Regulator Inquiry',
          body: `A regulator has submitted an inquiry: ${event.payload?.subject || ''}`,
          link: '/regulator-heatmap',
        });
      } catch (err: unknown) {
        logger.warn('[Engagement-EventBus] regulator notification failed', { error: toErrorMessage(err) });
      }
    });

    logger.info('Engagement-OS EventBus subscribers registered');
  } catch (e: unknown) { logger.warn('Engagement EventBus subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerVendorCrossAgentSubscribers } = await import('../../modules/vendor/services/vendor/vendor-cross-agent.service');
    registerVendorCrossAgentSubscribers();
    logger.info('Vendor cross-agent propagation subscribers registered');
  } catch (e: unknown) { logger.warn('Vendor cross-agent subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { registerVendorEnhancementSubscribers } = await import('../../modules/vendor/services/vendor/vendor-enhancements.service');
    registerVendorEnhancementSubscribers();
    logger.info('Vendor enhancement subscribers registered');
  } catch (e: unknown) { logger.warn('Vendor enhancement subscriber registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { eventBus: raciEb } = await import('../../modules/platform/services/event/event-bus.service');
    const autoSyncRaci = async (tenantId: string, entityType: string, entityId: string) => {
      try {
        const { safeQuery, tenantSchema } = await import('../../config/database/database');
        const schema = tenantSchema(tenantId);
        await safeQuery(
          `INSERT INTO "${schema}".raci_sync_queue (entity_type, entity_id, status, created_at)
           VALUES ($1, $2, 'pending', NOW()) ON CONFLICT DO NOTHING`,
          [entityType, entityId],
        );
      } catch { /* RACI sync is best-effort */ }
    };

    const raciSyncHandler = async (event: { tenantId?: string }) => {
      try {
        if (event.tenantId) {
          await autoSyncRaci(event.tenantId);
        }
      } catch (err: unknown) {
        logger.warn('[RACI-AutoSync] sync failed', { error: toErrorMessage(err) });
      }
    };

    raciEb.subscribe('team.role_changed', 'raci-auto-sync-update', raciSyncHandler);
    raciEb.subscribe('team.member_removed', 'raci-auto-sync-delete', raciSyncHandler);
    raciEb.subscribe('team.created', 'raci-auto-sync-create', raciSyncHandler);

    logger.info('RACI→Agent Shadow auto-sync event listeners registered (3 subscriptions)');
  } catch (e: unknown) { logger.warn('RACI auto-sync registration skipped', { error: toErrorMessage(e) }); }

  try {
    const { eventBus: eb } = await import('../../modules/platform/services/event/event-bus.service');

    eb.subscribe('constitution.breach', 'agent-reactive-A07', async (event) => {
      try {
        const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
        await runAgent(event.tenantId, 'A07');
      } catch (err: unknown) { logger.warn('[Agent-Reactive] A07 trigger failed', { error: toErrorMessage(err) }); }
    });

    eb.subscribe('incident.created', 'agent-reactive-A06', async (event) => {
      if (event.severity === 'critical') {
        try {
          const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
          await runAgent(event.tenantId, 'A06');
        } catch (err: unknown) { logger.warn('[Agent-Reactive] A06 trigger failed', { error: toErrorMessage(err) }); }
      }
    });

    eb.subscribe('vendor.risk_changed', 'agent-reactive-A09', async (event) => {
      if (event.payload?.riskRating === 'critical') {
        try {
          const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
          await runAgent(event.tenantId, 'A09');
        } catch (err: unknown) { logger.warn('[Agent-Reactive] A09 trigger failed', { error: toErrorMessage(err) }); }
      }
    });

    eb.subscribe('agent.escalation', 'agent-reactive-A10', async (event) => {
      try {
        const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
        await runAgent(event.tenantId, 'A10');
      } catch (err: unknown) { logger.warn('[Agent-Reactive] A10 trigger failed', { error: toErrorMessage(err) }); }
    });

    eb.subscribe('policy.violated', 'agent-reactive-A08', async (event) => {
      try {
        const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
        await runAgent(event.tenantId, 'A08');
      } catch (err: unknown) { logger.warn('[Agent-Reactive] A08 trigger failed', { error: toErrorMessage(err) }); }
    });

    eb.subscribe('bcp.plan_activated', 'agent-reactive-A11', async (event) => {
      try {
        const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
        await runAgent(event.tenantId, 'A11');
      } catch (err: unknown) { logger.warn('[Agent-Reactive] A11 trigger failed', { error: toErrorMessage(err) }); }
    });

    eb.subscribe('training.deadline_approaching', 'agent-reactive-A12', async (event) => {
      try {
        const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service');
        await runAgent(event.tenantId, 'A12');
      } catch (err: unknown) { logger.warn('[Agent-Reactive] A12 trigger failed', { error: toErrorMessage(err) }); }
    });

    logger.info('Agent-Reactive event-driven triggers registered (7 subscriptions)');
  } catch (e: unknown) { logger.warn('Agent reactive triggers registration skipped', { error: toErrorMessage(e) }); }

  // Navigation module — cross-module event subscriptions (module.enabled/disabled, dauth.role.updated, provisioning.tenant.completed)
  try {
    const { registerNavigationEventSubscriptions } = await import('../../modules/navigation/events/navigation.events');
    registerNavigationEventSubscriptions();
    logger.info('Navigation cross-module event subscriptions registered (4 subscriptions)');
  } catch (e: unknown) { logger.warn('Navigation event subscription registration skipped', { error: toErrorMessage(e) }); }

  // Navigation module — register health check with platform health service (Patch 12)
  try {
    const { registerNavigationHealthCheck } = await import('../../modules/navigation/services/navigation-health.service');
    registerNavigationHealthCheck();
    logger.info('Navigation health check registered with platform health service');
  } catch (e: unknown) { logger.warn('Navigation health check registration skipped', { error: toErrorMessage(e) }); }

  await registerDomainModuleSubscribers();
}

async function registerDomainModuleSubscribers(): Promise<void> {
  const modules = [
    { name: 'onboarding', importFn: () => import('../../modules/onboarding/events/onboarding.subscribers').then(m => m.registerOnboardingSubscribers) },
    { name: 'bootstrap', importFn: () => import('../../modules/bootstrap/events/bootstrap.subscribers').then(m => m.registerBootstrapEventSubscribers) },
    { name: 'risk', importFn: () => import('../../modules/risk/events/risk.subscribers').then(m => m.registerRiskEventSubscribers) },
    { name: 'compliance', importFn: () => import('../../modules/compliance/events/compliance.subscribers').then(m => m.registerComplianceEventSubscribers) },
    { name: 'audit', importFn: () => import('../../modules/audit/events/audit.subscribers').then(m => m.registerAuditEventSubscribers) },
    { name: 'vendor', importFn: () => import('../../modules/vendor/events/vendor.subscribers').then(m => m.registerVendorEventSubscribers) },
    { name: 'incident', importFn: () => import('../../modules/incident/events/incident.subscribers').then(m => m.registerIncidentEventSubscribers) },
    { name: 'bcp', importFn: () => import('../../modules/bcp/events/bcp.subscribers').then(m => m.registerBcpEventSubscribers) },
    { name: 'governance', importFn: () => import('../../modules/governance/events/governance.subscribers').then(m => m.registerGovernanceEventSubscribers) },
    { name: 'policy', importFn: () => import('../../modules/policy/events/policy.subscribers').then(m => m.registerPolicyEventSubscribers) },
    { name: 'evidence', importFn: () => import('../../modules/evidence/events/evidence.subscribers').then(m => m.registerEvidenceEventSubscribers) },
    { name: 'remediation', importFn: () => import('../../modules/remediation/events/remediation.subscribers').then(m => m.registerRemediationEventSubscribers) },
    { name: 'action', importFn: () => import('../../modules/action/events/action.subscribers').then(m => m.registerActionEventSubscribers) },
    { name: 'asset', importFn: () => import('../../modules/asset/events/asset.subscribers').then(m => m.registerAssetEventSubscribers) },
    { name: 'exception', importFn: () => import('../../modules/exception/events/exception.subscribers').then(m => m.registerExceptionEventSubscribers) },
    { name: 'training', importFn: () => import('../../modules/training/events/training.subscribers').then(m => m.registerTrainingEventSubscribers) },
    { name: 'issues', importFn: () => import('../../modules/issues/events/issues.subscribers').then(m => m.registerIssuesEventSubscribers) },
    { name: 'qiyas', importFn: () => import('../../modules/qiyas/events/qiyas.subscribers').then(m => m.registerQiyasEventSubscribers) },
    { name: 'ai-governance', importFn: () => import('../../../services/ai-engine-service/src/domain/ai-governance/events/ai-governance.subscribers').then(m => m.registerAiGovernanceEventSubscribers) },
    // foundation: DELETED — events handled by DOS event bus
    { name: 'reporting', importFn: () => import('../../modules/reporting/events/reporting.subscribers').then(m => m.registerReportingEventSubscribers) },
    { name: 'ai', importFn: () => import('../../../services/ai-engine-service/src/runtime/ai/events/ai.subscribers').then(m => m.registerAiEventSubscribers) },
    { name: 'integrations', importFn: () => import('../../modules/integrations/events/integrations.subscribers').then(m => m.registerIntegrationsEventSubscribers) },
    { name: 'admin', importFn: () => import('../../modules/admin/events/admin.subscribers').then(m => m.registerAdminEventSubscribers) },
    { name: 'workflow', importFn: () => import('../../modules/workflow/events/workflow.subscribers').then(m => m.registerWorkflowEventSubscribers) },
    { name: 'notification', importFn: () => import('../../modules/notification/events/notification.subscribers').then(m => m.registerNotificationEventSubscribers) },
    { name: 'analytics', importFn: () => import('../../modules/analytics/events/analytics.subscribers').then(m => m.registerAnalyticsEventSubscribers) },
    { name: 'team', importFn: () => import('../../modules/team/events/team.subscribers').then(m => m.registerTeamEventSubscribers) },
    { name: 'inbox', importFn: () => import('../../modules/inbox/events/inbox.subscribers').then(m => m.registerInboxEventSubscribers) },
    { name: 'portals', importFn: () => import('../../modules/portals/events/portals.subscribers').then(m => m.registerPortalsEventSubscribers) },
    { name: 'records', importFn: () => import('../../modules/records/events/records.subscribers').then(m => m.registerRecordsEventSubscribers) },
    { name: 'privacy', importFn: () => import('../../modules/privacy/events/privacy.subscribers').then(m => m.registerPrivacyEventSubscribers) },
    { name: 'proactive-leadership', importFn: () => import('../../modules/proactive-leadership/events/proactive-leadership.subscribers').then(m => m.registerProactiveLeadershipEventSubscribers) },
    { name: 'dora', importFn: () => import('../../modules/dora/events/dora.subscribers').then(m => m.registerDoraEventSubscribers) },
    { name: 'journey', importFn: () => import('../../modules/journey/events/journey.subscribers').then(m => m.registerJourneyEventSubscribers) },
    { name: 'widgets', importFn: () => import('../../modules/widgets/events/widgets.subscribers').then(m => m.registerWidgetEventSubscribers) },
  ];

  let registered = 0;
  for (const mod of modules) {
    try {
      const registerFn = await mod.importFn();
      registerFn();
      registered++;
    } catch (e: unknown) {
      logger.warn(`[DomainSubscribers] ${mod.name} subscriber registration skipped`, { error: toErrorMessage(e) });
    }
  }
  logger.info(`[DomainSubscribers] ${registered}/${modules.length} domain module event subscribers registered`);
}

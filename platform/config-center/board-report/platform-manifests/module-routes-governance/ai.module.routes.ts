/**
 * AI module route fragment.
 * Lazy-loaded routes for AI operations and agent management.
 * Component paths use static import() strings so bundlers can split chunks.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const aiModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'home',
  children: {
    '': { redirectTo: 'home', pathMatch: 'full' },
    home: {
      loadComponent: () =>
        import('../../../../ai/ai-os-dashboard/ai-os-dashboard.component').then(m => m.AiOsDashboardComponent),
    },
    'model-registry': {
      loadComponent: () =>
        import('../../../../ai/ai-model-config/ai-model-config.component').then(m => m.AiModelConfigComponent),
    },
    'prompt-library': {
      loadComponent: () =>
        import('../../../../ai/contextual-ai/contextual-ai.component').then(m => m.ContextualAIComponent),
    },
    'audit-trail': {
      loadComponent: () =>
        import('../../../../ai/ai-decision-history/ai-decision-history.component').then(m => m.AiDecisionHistoryComponent),
    },
    'operations-center': {
      loadComponent: () =>
        import('../../../../ai/ai-os-dashboard/ai-os-dashboard.component').then(m => m.AiOsDashboardComponent),
    },
    'policy-management': {
      loadComponent: () =>
        import('../../../../ai/ai-policy-rules/ai-policy-rules.component').then(m => m.AiPolicyRulesComponent),
    },
    'decision-log': {
      loadComponent: () =>
        import('../../../../ai/ai-decision-history/ai-decision-history.component').then(m => m.AiDecisionHistoryComponent),
    },
    'agent-health': {
      loadComponent: () =>
        import('../../../../ai/agent-hub/agent-hub.component').then(m => m.AgentHubComponent),
    },
    explainability: {
      loadComponent: () =>
        import('../../../../ai/contextual-ai/contextual-ai.component').then(m => m.ContextualAIComponent),
    },
    'squad-management': {
      loadComponent: () =>
        import('../../../../ai/ai-squad/ai-squad.component').then(m => m.AISquadComponent),
    },
    guardrails: {
      loadComponent: () =>
        import('../../../../ai/ai-route-rules/ai-route-rules.component').then(m => m.AiRouteRulesComponent),
    },
    'personal-agent': {
      loadComponent: () =>
        import('../../../../ai/copilot/copilot.component').then(m => m.CopilotComponent),
    },
    config: {
      loadComponent: () =>
        import('../../../../ai/ai-settings/ai-settings.component').then(m => m.AiSettingsComponent),
      adminOnly: true,
    },
    create: {
      loadComponent: () =>
        import('../shared/components/generic-module-create-dialog.component').then(m => m.GenericModuleCreateDialogComponent),
      data: { moduleCode: 'ai' },
    },
    ':id': {
      loadComponent: () =>
        import('../shared/components/generic-module-detail.component').then(m => m.GenericModuleDetailComponent),
      data: { moduleCode: 'ai' },
    },
    reports: {
      loadComponent: () =>
        import('../shared/components/generic-module-reports.component').then(m => m.GenericModuleReportsComponent),
      data: { moduleCode: 'ai' },
    },
    lifecycle: {
      loadComponent: () =>
        import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent),
      data: { moduleCode: 'ai' },
    },
  },
};

export const aiStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'ai-hub': {
    loadComponent: () =>
      import('../../../../ai/ai-hub/ai-hub.component').then(m => m.AIHubComponent),
    requiredPermission: 'copilot.assistant.read',
    moduleCode: 'ai',
    agentId: 'A04',
  },
  'ai-suite': {
    loadComponent: () =>
      import('../../../../ai/ai-suite/ai-suite.component').then(m => m.AISuiteComponent),
    requiredPermission: 'copilot.assistant.read',
    moduleCode: 'ai',
  },
  'agent-hub': {
    loadComponent: () =>
      import('../../../../ai/agent-hub/agent-hub.component').then(m => m.AgentHubComponent),
    requiredPermission: 'platform.agent.read',
    moduleCode: 'ai',
  },
  'admin/agrc-engine': {
    loadComponent: () =>
      import('../../../../ai/admin/administration/administration.component').then(m => m.AdministrationComponent),
    requiredPermission: 'agrc_os:read',
    moduleCode: 'ai',
    adminOnly: true,
  },
  'ai-trigger': {
    loadComponent: () =>
      import('../../../../ai/ai-trigger/ai-trigger.component').then(m => m.AITriggerComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'autonomy-engine': {
    loadComponent: () =>
      import('../../../../ai/autonomous-workflow/autonomous-workflow.component').then(m => m.AutonomousWorkflowComponent),
    requiredPermission: 'ai.agent.manage',
    moduleCode: 'ai',
  },
  explainability: {
    loadComponent: () =>
      import('../../../../ai/contextual-ai/contextual-ai.component').then(m => m.ContextualAIComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'mcp-admin': {
    loadComponent: () =>
      import('../../../../ai/ai-settings/ai-settings.component').then(m => m.AiSettingsComponent),
    requiredPermission: 'platform.system.admin',
    moduleCode: 'ai',
    adminOnly: true,
  },
  'ai-squad': {
    loadComponent: () =>
      import('../../../../ai/ai-squad/ai-squad.component').then(m => m.AISquadComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-queue': {
    loadComponent: () =>
      import('../../../../ai/ai-queue/ai-queue.component').then(m => m.AIQueueComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'autonomous-config': {
    loadComponent: () =>
      import('../../../../ai/autonomous-config/autonomous-config.component').then(m => m.AutonomousConfigComponent),
    requiredPermission: 'ai.agent.manage',
    moduleCode: 'ai',
  },
  'ai-os-dashboard': {
    loadComponent: () =>
      import('../../../../ai/ai-os-dashboard/ai-os-dashboard.component').then(m => m.AiOsDashboardComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-os-dashboard/traces/:runId': {
    loadComponent: () =>
      import('../../../../ai/ai-os-dashboard/trace-detail/trace-detail.component').then(m => m.TraceDetailComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-os-dashboard/decisions': {
    loadComponent: () =>
      import('../../../../ai/ai-os-dashboard/decisions-list/decisions-list.component').then(m => m.DecisionsListComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-os-dashboard/decisions/:decisionId': {
    loadComponent: () =>
      import('../../../../ai/ai-os-dashboard/decision-detail/decision-detail.component').then(m => m.DecisionDetailComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  copilot: {
    loadComponent: () =>
      import('../../../../ai/copilot/copilot.component').then(m => m.CopilotComponent),
    requiredPermission: 'copilot.assistant.read',
    moduleCode: 'ai',
  },
  'contextual-ai': {
    loadComponent: () =>
      import('../../../../ai/contextual-ai/contextual-ai.component').then(m => m.ContextualAIComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'agrc-os': {
    loadComponent: () =>
      import('../../../../ai/admin/admin-hub/admin-hub.component').then(m => m.AdminHubComponent),
    requiredPermission: 'platform.agent.read',
    moduleCode: 'ai',
  },
  'executive-command': {
    loadComponent: () =>
      import('../../../../ai/ai-execution-plans/ai-execution-plans.component').then(m => m.AIExecutionPlansComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'autonomous-monitor': {
    loadComponent: () =>
      import('../../../../ai/autonomous-monitor/autonomous-monitor.component').then(m => m.AutonomousMonitorComponent),
    requiredPermission: 'ai.agent.manage',
    moduleCode: 'ai',
  },
  'unified-squad': {
    loadComponent: () =>
      import('../../../../ai/ai-squad/ai-squad.component').then(m => m.AISquadComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'unified-squad/workflow': {
    loadComponent: () =>
      import('../../../../ai/autonomous-workflow/autonomous-workflow.component').then(m => m.AutonomousWorkflowComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'unified-squad/workflow-visualizer': {
    loadComponent: () =>
      import('../../../../ai/autonomous-workflow/autonomous-workflow.component').then(m => m.AutonomousWorkflowComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'unified-squad/agent-monitoring': {
    loadComponent: () =>
      import('../../../../ai/autonomous-monitor/autonomous-monitor.component').then(m => m.AutonomousMonitorComponent),
    requiredPermission: 'admin.system.read',
    moduleCode: 'ai',
    adminOnly: true,
  },
  'unified-squad/erp-config': {
    loadComponent: () =>
      import('../../../../ai/autonomous-config/autonomous-config.component').then(m => m.AutonomousConfigComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-execution-plans': {
    loadComponent: () =>
      import('../../../../ai/ai-execution-plans/ai-execution-plans.component').then(m => m.AIExecutionPlansComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'copilot-channels': {
    loadComponent: () =>
      import('../../../../ai/copilot/copilot.component').then(m => m.CopilotComponent),
    requiredPermission: 'copilot.assistant.read',
    moduleCode: 'ai',
  },
  'copilot-chat': {
    loadComponent: () =>
      import('../../../../ai/copilot/copilot.component').then(m => m.CopilotComponent),
    requiredPermission: 'copilot.assistant.read',
    moduleCode: 'ai',
  },
  'hitl-center': {
    loadComponent: () =>
      import('../../../../ai/ai-recommendation-inbox/ai-recommendation-inbox.component').then(m => m.AiRecommendationInboxComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-recommendation-inbox': {
    loadComponent: () =>
      import('../../../../ai/ai-recommendation-inbox/ai-recommendation-inbox.component').then(m => m.AiRecommendationInboxComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-decision-history': {
    loadComponent: () =>
      import('../../../../ai/ai-decision-history/ai-decision-history.component').then(m => m.AiDecisionHistoryComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-policy-rules': {
    loadComponent: () =>
      import('../../../../ai/ai-policy-rules/ai-policy-rules.component').then(m => m.AiPolicyRulesComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-event-triggers': {
    loadComponent: () =>
      import('../../../../ai/ai-event-triggers/ai-event-triggers.component').then(m => m.AiEventTriggersComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-route-rules': {
    loadComponent: () =>
      import('../../../../ai/ai-route-rules/ai-route-rules.component').then(m => m.AiRouteRulesComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-runtime-config': {
    loadComponent: () =>
      import('../../../../ai/ai-runtime-config/ai-runtime-config.component').then(m => m.AiRuntimeConfigComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-cockpit': {
    loadComponent: () =>
      import('../../../../ai/ai-cockpit/ai-cockpit.component').then(m => m.AiCockpitComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'ai-settings': {
    loadComponent: () =>
      import('../../../../ai/ai-settings/ai-settings.component').then(m => m.AiSettingsComponent),
    requiredPermission: 'ai.agent.read',
    moduleCode: 'ai',
  },
  'inference-admin': {
    loadComponent: () =>
      import('../../../../ai/ai-model-config/ai-model-config.component').then(m => m.AiModelConfigComponent),
    requiredPermission: 'ai.agent.manage',
    moduleCode: 'ai',
    adminOnly: true,
  },
  'ai-model-config': {
    loadComponent: () =>
      import('../../../../ai/ai-model-config/ai-model-config.component').then(m => m.AiModelConfigComponent),
    requiredPermission: 'ai.agent.manage',
    moduleCode: 'ai',
    adminOnly: true,
  },
};

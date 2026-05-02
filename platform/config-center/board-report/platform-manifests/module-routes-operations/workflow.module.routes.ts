/**
 * Workflow module route fragment.
 * Lazy-loaded routes for workflow management and process orchestration.
 */
import type { ModuleRouteGroup, StandaloneRouteEntry } from '../../core/routing/route-registry.types';

export const workflowModuleRouteGroup: ModuleRouteGroup = {
  shell: () => import('../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent),
  defaultRedirect: 'overview',
  children: {
    '': { redirectTo: 'overview', pathMatch: 'full' },

    overview:             { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowHubComponent) },
    definitions:          { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowsComponent) },
    builder:              { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowBuilderComponent) },
    templates:            { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowTemplatesComponent) },
    instances:            { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowExecutionsComponent) },
    approvals:            { loadComponent: () => import('@workflow-module/ui').then(m => m.ApprovalCenterComponent) },
    tasks:                { loadComponent: () => import('@workflow-module/ui').then(m => m.ProcessTasksComponent) },
    inbox:                { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkItemsInboxPageComponent) },
    'work-queue':         { loadComponent: () => import('@workflow-module/ui').then(m => m.KanbanBoardComponent) },
    sla:                  { loadComponent: () => import('@workflow-module/ui').then(m => m.SLAManagementComponent) },
    audit:                { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAuditTrailComponent) },
    reports:              { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAnalyticsComponent) },
    settings:             { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowExtComponent) },

    operations:           { loadComponent: () => import('@workflow-module/ui').then(m => m.OperationsHubComponent) },
    'sla-monitoring':     { loadComponent: () => import('@workflow-module/ui').then(m => m.SlaMonitoringComponent) },
    'action-items':       { loadComponent: () => import('@workflow-module/ui').then(m => m.ActionItemsComponent) },
    timeline:             { loadComponent: () => import('@workflow-module/ui').then(m => m.TimelineComponent) },
    'activity-feed':      { loadComponent: () => import('@workflow-module/ui').then(m => m.ActivityFeedComponent) },
    messaging:            { loadComponent: () => import('@workflow-module/ui').then(m => m.MessagingComponent) },
    subflows:             { loadComponent: () => import('@workflow-module/ui').then(m => m.SubflowsComponent) },
    cooperative:          { loadComponent: () => import('@workflow-module/ui').then(m => m.CooperativeWorkflowsComponent) },
    analytics:            { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAnalyticsComponent) },
    executions:           { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowExecutionsComponent) },
    workflows:            { redirectTo: 'definitions', pathMatch: 'full' },
    designer:             { redirectTo: 'builder', pathMatch: 'full' },
    board:                { redirectTo: 'work-queue', pathMatch: 'full' },
    home:                 { redirectTo: 'overview', pathMatch: 'full' },

    autonomous:           { loadComponent: () => import('../../features/ai-governance/pages/autonomous/autonomous-workflow/autonomous-workflow.component').then(m => m.AutonomousWorkflowComponent) },
    '3level':             { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowSupervisorDashboardComponent) },
    '3level/ai-config':   { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAIConfigComponent) },
    '3level/analytics':   { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAnalyticsComponent) },
    '3level/trace':       { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowExecutionTraceComponent) },
    '3level/guardrails':  { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowGuardrailStatusComponent) },
    ext:                  { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowExtComponent) },
    lifecycle:            { loadComponent: () => import('../shared/components/generic-module-lifecycle.component').then(m => m.GenericModuleLifecycleComponent), data: { moduleCode: 'workflow' } },
  },
};

export const workflowStandaloneRoutes: Record<string, StandaloneRouteEntry> = {
  'workflow-hub': { redirectTo: '/workflow/overview', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'automation-hub': { redirectTo: '/workflow/overview', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'automation': { redirectTo: '/workflow/overview', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'task-board': { redirectTo: '/workflow/work-queue', pathMatch: 'full', requiredPermission: 'task.item.read', moduleCode: 'workflow' },
  'my-tasks': { redirectTo: '/workflow/tasks', pathMatch: 'full', requiredPermission: 'task.item.read', moduleCode: 'workflow' },
  'workflow-templates': { redirectTo: '/workflow/templates', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflows': { redirectTo: '/workflow/definitions', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'playbook': { loadComponent: () => import('../../features/policy/pages/playbook/playbook.component').then(m => m.PlaybookComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflow-ext': { redirectTo: '/workflow/settings', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow', adminOnly: true },
  'autonomous-workflows': { loadComponent: () => import('../../features/ai-governance/pages/autonomous/autonomous-workflow/autonomous-workflow.component').then(m => m.AutonomousWorkflowComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'bulk-tasks': { loadComponent: () => import('@workflow-module/ui').then(m => m.BulkTasksComponent), requiredPermission: 'workflow.instance.write', moduleCode: 'workflow' },
  'workflow-versions': { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowVersionsComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflow-import-export': { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowImportExportComponent), requiredPermission: 'workflow.instance.write', moduleCode: 'workflow' },
  'cooperative-workflows': { loadComponent: () => import('@workflow-module/ui').then(m => m.CooperativeWorkflowsComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'chain-monitor': { loadComponent: () => import('@workflow-module/ui').then(m => m.ChainMonitorComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'sla-dashboard': { loadComponent: () => import('@workflow-module/ui').then(m => m.SLADashboardComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflow-audit-trail': { loadComponent: () => import('@workflow-module/ui').then(m => m.WorkflowAuditTrailComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflow-analytics': { redirectTo: '/workflow/reports', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'workflow-executions': { redirectTo: '/workflow/instances', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'subflows': { loadComponent: () => import('@workflow-module/ui').then(m => m.SubflowsComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'processes': { loadComponent: () => import('@workflow-module/ui').then(m => m.ProcessesComponent), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'approval-center': { redirectTo: '/workflow/approvals', pathMatch: 'full', requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'w/:workspaceId/workflow': { loadChildren: () => import('@workflow-module/ui').then(m => m.WORKFLOW_ROUTES), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' },
  'w/:workspaceId/work-items': { redirectTo: '/workflow/inbox', pathMatch: 'prefix', requiredPermission: 'task.item.read', moduleCode: 'workflow' },
  'w/:workspaceId/playbooks': { loadChildren: () => import('../../features/playbooks/pages/playbooks.routes').then(m => m.PLAYBOOKS_ROUTES), requiredPermission: 'workflow.instance.read', moduleCode: 'workflow' }
};

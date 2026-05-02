// Foundation-Only Bring-Up — universal barrel stub for deferred modules.
//
// tsconfig path mappings redirect every deferred-module import (Compliance,
// Workflow, Inbox, Workflow Module ui, etc.) to this single file so the
// SPA build never has to resolve deleted/broken on-disk source. Each
// deferred symbol resolves to a tiny placeholder component or an inert
// API service. No fake user-facing data is emitted.

export {
  DeferredModulePlaceholderComponent,
  DeferredModuleApiServiceStub,
} from './deferred-module.stub';

import {
  DeferredModulePlaceholderComponent,
  DeferredModuleApiServiceStub,
} from './deferred-module.stub';

// Component aliases (any name a consumer might destructure → placeholder).
// Listed exhaustively so static `m.SomeComponent` access in dynamic imports
// remains type-safe. New names can be appended without code changes.
export const WorkflowHubComponent = DeferredModulePlaceholderComponent;
export const ApprovalCenterComponent = DeferredModulePlaceholderComponent;
export const KanbanBoardComponent = DeferredModulePlaceholderComponent;
export const OperationsHubComponent = DeferredModulePlaceholderComponent;
export const WorkflowBuilderComponent = DeferredModulePlaceholderComponent;
export const WorkflowTemplatesComponent = DeferredModulePlaceholderComponent;
export const WorkflowExecutionsComponent = DeferredModulePlaceholderComponent;
export const WorkflowAnalyticsComponent = DeferredModulePlaceholderComponent;
export const SLAManagementComponent = DeferredModulePlaceholderComponent;
export const SlaMonitoringComponent = DeferredModulePlaceholderComponent;
export const ActionItemsComponent = DeferredModulePlaceholderComponent;
export const TimelineComponent = DeferredModulePlaceholderComponent;
export const ActivityFeedComponent = DeferredModulePlaceholderComponent;
export const ProcessTasksComponent = DeferredModulePlaceholderComponent;
export const MessagingComponent = DeferredModulePlaceholderComponent;
export const SubflowsComponent = DeferredModulePlaceholderComponent;
export const CooperativeWorkflowsComponent = DeferredModulePlaceholderComponent;
export const WorkflowsComponent = DeferredModulePlaceholderComponent;
export const WorkflowListComponent = DeferredModulePlaceholderComponent;
export const WorkflowDesignerComponent = DeferredModulePlaceholderComponent;
export const AutomationHubComponent = DeferredModulePlaceholderComponent;
export const AutomationComponent = DeferredModulePlaceholderComponent;
export const BulkTasksComponent = DeferredModulePlaceholderComponent;
export const WorkflowVersionsComponent = DeferredModulePlaceholderComponent;
export const WorkflowImportExportComponent = DeferredModulePlaceholderComponent;
export const ChainMonitorComponent = DeferredModulePlaceholderComponent;
export const SLADashboardComponent = DeferredModulePlaceholderComponent;
export const WorkflowAuditTrailComponent = DeferredModulePlaceholderComponent;
export const WorkflowExtComponent = DeferredModulePlaceholderComponent;
export const ProcessesComponent = DeferredModulePlaceholderComponent;
export const WorkflowSupervisorDashboardComponent = DeferredModulePlaceholderComponent;
export const WorkflowAIConfigComponent = DeferredModulePlaceholderComponent;
export const WorkflowExecutionTraceComponent = DeferredModulePlaceholderComponent;
export const WorkflowGuardrailStatusComponent = DeferredModulePlaceholderComponent;
export const WorkItemsInboxPageComponent = DeferredModulePlaceholderComponent;
export const InboxOverviewComponent = DeferredModulePlaceholderComponent;
export const InboxHubComponent = DeferredModulePlaceholderComponent;
export const InboxDetailComponent = DeferredModulePlaceholderComponent;
export const InboxDiagnosticsComponent = DeferredModulePlaceholderComponent;
export const InboxDashboardComponent = DeferredModulePlaceholderComponent;
export const InboxAdminComponent = DeferredModulePlaceholderComponent;
export const InboxWidgetComponent = DeferredModulePlaceholderComponent;
export const WORKFLOW_ROUTES: never[] = [];

export const CompliancePageComponent = DeferredModulePlaceholderComponent;
export const ComplianceFrameworksPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceControlsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceObligationsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceAssessmentsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceGapsPageComponent = DeferredModulePlaceholderComponent;
export const CompliancePosturePageComponent = DeferredModulePlaceholderComponent;
export const ComplianceAttestationsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceExceptionsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceTemplatesPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceFindingsPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceRoadmapPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceCalendarPageComponent = DeferredModulePlaceholderComponent;
export const ComplianceRegulatoryChangesComponent = DeferredModulePlaceholderComponent;
export const ComplianceHeatMapPageComponent = DeferredModulePlaceholderComponent;
export const AssertionDashboardComponent = DeferredModulePlaceholderComponent;
export const ObligationWorkspaceComponent = DeferredModulePlaceholderComponent;
export const ObligationDetailPageComponent = DeferredModulePlaceholderComponent;
export const RegulatoryReasoningStudioComponent = DeferredModulePlaceholderComponent;
export const FindingsComponent = DeferredModulePlaceholderComponent;
export const IntelligenceHubComponent = DeferredModulePlaceholderComponent;
export const ControlPostureComponent = DeferredModulePlaceholderComponent;
// Inert API service stubs.
export const ComplianceFeatureApiService = DeferredModuleApiServiceStub;
export const WorkflowApiService = DeferredModuleApiServiceStub;
export const WorkItemsApiService = DeferredModuleApiServiceStub;
export const InboxApiService = DeferredModuleApiServiceStub;
// DTO type aliases — kept as `unknown` so consumers compile.
export type WorkflowDto = unknown;
export type WorkItemDto = unknown;
export type WorkflowInstanceDto = unknown;
export type WorkflowAnalyticsDto = unknown;
export type AutomationRuleDto = unknown;
export type AutomationLogEntryDto = unknown;
export type WorkflowTemplateDto = unknown;

export default DeferredModulePlaceholderComponent;

import { Routes } from '@angular/router';
import { WorkItemsInboxPageComponent } from './work-items-inbox/work-items-inbox.page';
import { WorkflowDesignerRedirectComponent } from './workflow-hub/workflow-designer-redirect.component';
import { WorkflowSupervisorDashboardComponent } from './workflow-3level/workflow-supervisor-dashboard.component';
import { WorkflowAIConfigComponent as WorkflowAIConfigAdminComponent } from './workflow-3level/workflow-ai-config.component';
import { WorkflowAnalyticsComponent } from './workflow-3level/workflow-analytics.component';
import { WorkflowExecutionTraceComponent } from './workflow-3level/workflow-execution-trace.component';
import { WorkflowGuardrailStatusComponent } from './workflow-3level/workflow-guardrail-status.component';

export const WORKFLOW_ROUTES: Routes = [
  { path: 'designer', component: WorkflowDesignerRedirectComponent },
  { path: 'inbox', component: WorkItemsInboxPageComponent },
  { path: 'supervisor', component: WorkflowSupervisorDashboardComponent },
  { path: 'ai-config', component: WorkflowAIConfigAdminComponent },
  { path: 'analytics', component: WorkflowAnalyticsComponent },
  { path: 'execution-trace', component: WorkflowExecutionTraceComponent },
  { path: 'guardrails', component: WorkflowGuardrailStatusComponent },
];

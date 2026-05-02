import { Routes } from '@angular/router';
import { WorkflowHubComponent } from './pages/workflow-hub.component';

export const WORKFLOW_ROUTES: Routes = [
  { path: '', component: WorkflowHubComponent, data: { breadcrumb: 'Workflow', permission: 'workflow.read' } }
];

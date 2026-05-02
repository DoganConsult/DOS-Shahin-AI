import { Routes } from '@angular/router';
import { AiGovernanceHubComponent } from './pages/ai-governance-hub.component';

export const AI_GOVERNANCE_ROUTES: Routes = [
  { path: '', component: AiGovernanceHubComponent, data: { breadcrumb: 'AiGovernance', permission: 'ai-governance.read' } }
];

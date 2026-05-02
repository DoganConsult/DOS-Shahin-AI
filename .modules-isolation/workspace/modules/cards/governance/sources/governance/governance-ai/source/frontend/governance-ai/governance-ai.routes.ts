import { Routes } from '@angular/router';
import { GovernanceAiHubComponent } from './pages/governance-ai-hub.component';

export const GOVERNANCE_AI_ROUTES: Routes = [
  { path: '', component: GovernanceAiHubComponent, data: { breadcrumb: 'GovernanceAi', permission: 'governance-ai.read' } }
];

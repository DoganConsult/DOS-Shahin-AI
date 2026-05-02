import { Routes } from '@angular/router';
import { RiskHubComponent } from './pages/risk-hub.component';

export const RISK_ROUTES: Routes = [
  { path: '', component: RiskHubComponent, data: { breadcrumb: 'Risk', permission: 'risk.read' } }
];

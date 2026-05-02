import { Routes } from '@angular/router';
import { RemediationHubComponent } from './pages/remediation-hub.component';

export const REMEDIATION_ROUTES: Routes = [
  { path: '', component: RemediationHubComponent, data: { breadcrumb: 'Remediation', permission: 'remediation.read' } }
];

import { Routes } from '@angular/router';
import { ComplianceHubComponent } from '../pages/compliance-hub.component';

export const COMPLIANCE_ROUTES: Routes = [
  { path: '', component: ComplianceHubComponent, data: { breadcrumb: 'Compliance', permission: 'compliance.read' } }
];

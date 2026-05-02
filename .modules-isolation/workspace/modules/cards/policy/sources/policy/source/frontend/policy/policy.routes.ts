import { Routes } from '@angular/router';
import { PolicyHubComponent } from './pages/policy-hub.component';

export const POLICY_ROUTES: Routes = [
  { path: '', component: PolicyHubComponent, data: { breadcrumb: 'Policy', permission: 'policy.read' } }
];

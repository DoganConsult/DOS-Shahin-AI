import { Routes } from '@angular/router';
import { IntegrationsHubComponent } from './pages/integrations-hub.component';

export const INTEGRATIONS_ROUTES: Routes = [
  { path: '', component: IntegrationsHubComponent, data: { breadcrumb: 'Integrations', permission: 'integrations.read' } }
];

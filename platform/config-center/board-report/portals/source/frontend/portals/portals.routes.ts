import { Routes } from '@angular/router';
import { PortalsHubComponent } from './pages/portals-hub.component';

export const PORTALS_ROUTES: Routes = [
  { path: '', component: PortalsHubComponent, data: { breadcrumb: 'Portals', permission: 'portals.read' } }
];

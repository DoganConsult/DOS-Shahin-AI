import { Routes } from '@angular/router';
import { DoraHubComponent } from './pages/dora-hub.component';

export const DORA_ROUTES: Routes = [
  { path: '', component: DoraHubComponent, data: { breadcrumb: 'Dora', permission: 'dora.read' } }
];

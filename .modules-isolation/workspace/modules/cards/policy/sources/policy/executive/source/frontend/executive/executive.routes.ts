import { Routes } from '@angular/router';
import { ExecutiveHubComponent } from './pages/executive-hub.component';

export const EXECUTIVE_ROUTES: Routes = [
  { path: '', component: ExecutiveHubComponent, data: { breadcrumb: 'Executive', permission: 'executive.read' } }
];

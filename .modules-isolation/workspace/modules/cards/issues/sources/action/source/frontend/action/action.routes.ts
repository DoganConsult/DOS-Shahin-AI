import { Routes } from '@angular/router';
import { ActionHubComponent } from './pages/action-hub.component';

export const ACTION_ROUTES: Routes = [
  { path: '', component: ActionHubComponent, data: { breadcrumb: 'Action', permission: 'action.read' } }
];

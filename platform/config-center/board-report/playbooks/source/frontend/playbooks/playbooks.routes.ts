import { Routes } from '@angular/router';
import { PlaybooksHubComponent } from './pages/playbooks-hub.component';

export const PLAYBOOKS_ROUTES: Routes = [
  { path: '', component: PlaybooksHubComponent, data: { breadcrumb: 'Playbooks', permission: 'playbooks.read' } }
];

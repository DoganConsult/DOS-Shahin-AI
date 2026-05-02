import { Routes } from '@angular/router';
import { ProactiveLeadershipHubComponent } from './pages/proactive-leadership-hub.component';

export const PROACTIVE_LEADERSHIP_ROUTES: Routes = [
  { path: '', component: ProactiveLeadershipHubComponent, data: { breadcrumb: 'ProactiveLeadership', permission: 'proactive-leadership.read' } }
];

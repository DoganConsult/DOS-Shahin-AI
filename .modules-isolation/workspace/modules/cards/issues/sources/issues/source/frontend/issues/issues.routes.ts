import { Routes } from '@angular/router';
import { IssuesHubComponent } from './pages/issues-hub.component';

export const ISSUES_ROUTES: Routes = [
  { path: '', component: IssuesHubComponent, data: { breadcrumb: 'Issues', permission: 'issues.read' } }
];

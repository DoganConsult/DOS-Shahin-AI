import { Routes } from '@angular/router';
import { GrcQueryHubComponent } from './pages/grc-query-hub.component';

export const GRC_QUERY_ROUTES: Routes = [
  { path: '', component: GrcQueryHubComponent, data: { breadcrumb: 'GrcQuery', permission: 'grc-query.read' } }
];

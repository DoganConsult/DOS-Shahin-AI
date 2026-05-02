import { Routes } from '@angular/router';
import { BcpHubComponent } from './pages/bcp-hub.component';

export const BCP_ROUTES: Routes = [
  { path: '', component: BcpHubComponent, data: { breadcrumb: 'Bcp', permission: 'bcp.read' } }
];

import { Routes } from '@angular/router';
import { QiyasHubComponent } from '../pages/qiyas-hub.component';

export const QIYAS_ROUTES: Routes = [
  { path: '', component: QiyasHubComponent, data: { breadcrumb: 'Qiyas', permission: 'qiyas.read' } }
];

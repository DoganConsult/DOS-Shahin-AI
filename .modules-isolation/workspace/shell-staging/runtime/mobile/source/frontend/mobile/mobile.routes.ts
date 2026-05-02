import { Routes } from '@angular/router';
import { MobileHubComponent } from './pages/mobile-hub.component';

export const MOBILE_ROUTES: Routes = [
  { path: '', component: MobileHubComponent, data: { breadcrumb: 'Mobile', permission: 'mobile.read' } }
];

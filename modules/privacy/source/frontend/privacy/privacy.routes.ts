import { Routes } from '@angular/router';
import { PrivacyHubComponent } from './pages/privacy-hub.component';

export const PRIVACY_ROUTES: Routes = [
  { path: '', component: PrivacyHubComponent, data: { breadcrumb: 'Privacy', permission: 'privacy.read' } }
];

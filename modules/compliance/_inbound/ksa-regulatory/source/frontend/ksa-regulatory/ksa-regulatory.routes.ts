import { Routes } from '@angular/router';
import { KsaRegulatoryHubComponent } from './pages/ksa-regulatory-hub.component';

export const KSA_REGULATORY_ROUTES: Routes = [
  { path: '', component: KsaRegulatoryHubComponent, data: { breadcrumb: 'KsaRegulatory', permission: 'ksa-regulatory.read' } }
];

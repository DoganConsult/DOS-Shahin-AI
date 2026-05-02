import { Routes } from '@angular/router';
import { AttestationHubComponent } from './pages/attestation-hub.component';

export const ATTESTATION_ROUTES: Routes = [
  { path: '', component: AttestationHubComponent, data: { breadcrumb: 'Attestation', permission: 'attestation.read' } }
];

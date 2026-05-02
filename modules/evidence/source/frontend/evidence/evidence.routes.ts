import { Routes } from '@angular/router';
import { EvidenceHubComponent } from './pages/evidence-hub.component';

export const EVIDENCE_ROUTES: Routes = [
  { path: '', component: EvidenceHubComponent, data: { breadcrumb: 'Evidence', permission: 'evidence.read' } }
];

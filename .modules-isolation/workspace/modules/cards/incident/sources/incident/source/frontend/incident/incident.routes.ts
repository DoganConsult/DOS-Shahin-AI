import { Routes } from '@angular/router';
import { IncidentHubComponent } from './pages/incident-hub.component';

export const INCIDENT_ROUTES: Routes = [
  { path: '', component: IncidentHubComponent, data: { breadcrumb: 'Incident', permission: 'incident.read' } }
];

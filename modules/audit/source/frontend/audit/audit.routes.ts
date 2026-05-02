import { Routes } from '@angular/router';
import { AuditHubComponent } from './pages/audit-hub.component';

export const AUDIT_ROUTES: Routes = [
  { path: '', component: AuditHubComponent, data: { breadcrumb: 'Audit', permission: 'audit.read' } }
];

import { Routes } from '@angular/router';
import { ReportingHubComponent } from './pages/reporting-hub.component';

export const REPORTING_ROUTES: Routes = [
  { path: '', component: ReportingHubComponent, data: { breadcrumb: 'Reporting', permission: 'reporting.read' } }
];

import { Routes } from '@angular/router';
import { RecordsHubComponent } from './pages/records-hub.component';

export const RECORDS_ROUTES: Routes = [
  { path: '', component: RecordsHubComponent, data: { breadcrumb: 'Records', permission: 'records.read' } }
];

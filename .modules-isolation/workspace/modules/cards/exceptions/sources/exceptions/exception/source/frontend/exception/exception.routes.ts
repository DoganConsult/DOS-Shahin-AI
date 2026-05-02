import { Routes } from '@angular/router';
import { ExceptionHubComponent } from './pages/exception-hub.component';

export const EXCEPTION_ROUTES: Routes = [
  { path: '', component: ExceptionHubComponent, data: { breadcrumb: 'Exception', permission: 'exception.read' } }
];

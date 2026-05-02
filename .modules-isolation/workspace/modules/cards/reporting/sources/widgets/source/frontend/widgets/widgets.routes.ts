import { Routes } from '@angular/router';
import { WidgetsHubComponent } from './pages/widgets-hub.component';

export const WIDGETS_ROUTES: Routes = [
  { path: '', component: WidgetsHubComponent, data: { breadcrumb: 'Widgets', permission: 'widgets.read' } }
];

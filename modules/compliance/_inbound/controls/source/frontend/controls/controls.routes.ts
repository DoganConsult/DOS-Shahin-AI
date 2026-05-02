import { Routes } from '@angular/router';
import { ControlsHubComponent } from './pages/controls-hub.component';

export const CONTROLS_ROUTES: Routes = [
  { path: '', component: ControlsHubComponent, data: { breadcrumb: 'Controls', permission: 'controls.read' } }
];

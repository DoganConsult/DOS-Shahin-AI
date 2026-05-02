import { Routes } from '@angular/router';
import { AgrcEngineHubComponent } from './pages/agrc-engine-hub.component';

export const AGRC_ENGINE_ROUTES: Routes = [
  { path: '', component: AgrcEngineHubComponent, data: { breadcrumb: 'AgrcEngine', permission: 'agrc-engine.read' } }
];

import { Routes } from '@angular/router';
import { PacksHubComponent } from './pages/packs-hub.component';

export const PACKS_ROUTES: Routes = [
  { path: '', component: PacksHubComponent, data: { breadcrumb: 'Packs', permission: 'packs.read' } }
];

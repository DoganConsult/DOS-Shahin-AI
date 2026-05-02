import { Routes } from '@angular/router';
import { AssetHubComponent } from './pages/asset-hub.component';

export const ASSET_ROUTES: Routes = [
  { path: '', component: AssetHubComponent, data: { breadcrumb: 'Asset', permission: 'asset.read' } }
];

import { Routes } from '@angular/router';
import { BenchmarksHubComponent } from './pages/benchmarks-hub.component';

export const BENCHMARKS_ROUTES: Routes = [
  { path: '', component: BenchmarksHubComponent, data: { breadcrumb: 'Benchmarks', permission: 'benchmarks.read' } }
];

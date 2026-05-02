import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./pages/team-hub/team-hub.component').then(m => m.TeamHubComponent),
    title: 'Teams Hub'
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/team-detail/team-detail.component').then(m => m.TeamDetailComponent),
    title: 'Team Details'
  }
] as Routes;

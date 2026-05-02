import { Routes } from '@angular/router';
import { inject } from '@angular/core';
// Using any placeholder for component imports during scaffolding to guarantee routing
import { FitchDashboardComponent } from './pages/fitch-dashboard/fitch-dashboard.component';

export const FITCH_ROUTES: Routes = [
  {
    path: '',
    component: FitchDashboardComponent,
    data: { permission: 'fitch.rating.read' }
  }
];

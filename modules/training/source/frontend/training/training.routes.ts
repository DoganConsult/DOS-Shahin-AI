import { Routes } from '@angular/router';
import { TrainingHubComponent } from './pages/training-hub.component';

export const TRAINING_ROUTES: Routes = [
  { path: '', component: TrainingHubComponent, data: { breadcrumb: 'Training', permission: 'training.read' } }
];

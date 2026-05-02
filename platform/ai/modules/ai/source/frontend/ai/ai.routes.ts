import { Routes } from '@angular/router';
import { AiHubComponent } from './pages/ai-hub.component';
import { AiCockpitComponent } from './pages/ai-cockpit/ai-cockpit.component';
import { AiTimelineComponent } from './pages/ai-timeline/ai-timeline.component';

export const AI_ROUTES: Routes = [
  { path: '', component: AiHubComponent, data: { breadcrumb: 'Ai', permission: 'ai.read' } },
  { path: 'cockpit', component: AiCockpitComponent, data: { breadcrumb: 'AI Cockpit', permission: 'ai.squad.read' } },
  { path: 'timeline', component: AiTimelineComponent, data: { breadcrumb: 'AI Timeline', permission: 'ai.squad.read' } }
];

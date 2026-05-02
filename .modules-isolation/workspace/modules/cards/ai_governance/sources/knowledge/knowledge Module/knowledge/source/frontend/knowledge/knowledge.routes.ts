import { Routes } from '@angular/router';
import { KnowledgeHubComponent } from './pages/knowledge-hub.component';

export const KNOWLEDGE_ROUTES: Routes = [
  { path: '', component: KnowledgeHubComponent, data: { breadcrumb: 'Knowledge', permission: 'knowledge.read' } }
];

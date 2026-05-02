import { Routes } from '@angular/router';
import { LocalKnowledgeHubComponent } from './pages/local-knowledge-hub.component';

export const LOCAL_KNOWLEDGE_ROUTES: Routes = [
  { path: '', component: LocalKnowledgeHubComponent, data: { breadcrumb: 'LocalKnowledge', permission: 'local-knowledge.read' } }
];

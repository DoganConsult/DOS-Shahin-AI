import { Routes } from '@angular/router';

export const KNOWLEDGE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/knowledge-hub/knowledge-hub.component').then(m => m.KnowledgeHubComponent),
    title: 'Knowledge Hub'
  },
  {
    path: 'categories',
    loadComponent: () => import('./pages/knowledge-category-browser/knowledge-category-browser.component').then(m => m.KnowledgeCategoryBrowserComponent),
    title: 'Category Browser'
  },
  {
    path: 'editor/:id',
    loadComponent: () => import('./pages/knowledge-editor/knowledge-editor.component').then(m => m.KnowledgeEditorComponent),
    title: 'Knowledge Editor'
  },
  {
    path: 'editor',
    loadComponent: () => import('./pages/knowledge-editor/knowledge-editor.component').then(m => m.KnowledgeEditorComponent),
    title: 'New Knowledge Article'
  }
];

export default KNOWLEDGE_ROUTES;

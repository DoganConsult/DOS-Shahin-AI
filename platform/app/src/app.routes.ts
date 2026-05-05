/**
 * Application routes — Dynamic UI template-only routing.
 *
 * All page routing resolved from dos.ui_route_template_binding via
 * DynamicTemplatePageComponent. No hardcoded module routes.
 */
import { Routes } from '@angular/router';

const dynamicPageRoute = () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent);

export const routes: Routes = [
  // Root → dynamic page (marketing home resolved from DB)
  {
    path: '',
    loadComponent: dynamicPageRoute,
    pathMatch: 'full',
    data: { contractRoute: '/', componentKey: 'marketing.home.page' },
  },
  // All other routes → dynamic template page from DB
  {
    path: '**',
    loadComponent: dynamicPageRoute,
  },
];

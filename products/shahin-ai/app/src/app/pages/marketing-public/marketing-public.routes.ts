import { Routes } from '@angular/router';

export const MARKETING_PUBLIC_ROUTES: Routes = [
  { path: 'platform', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/platform', componentKey: 'marketing.platform.page', isPublic: true } },
  { path: 'resources', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/resources', componentKey: 'marketing.resources.page', isPublic: true } },
  { path: 'resources/executive-kit', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/resources/executive-kit', componentKey: 'marketing.executive-kit.page', isPublic: true } },
  { path: 'pricing',  loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/pricing',  componentKey: 'marketing.pricing.page',  isPublic: true } },
  { path: 'trust',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/trust',    componentKey: 'marketing.trust.page',    isPublic: true } },
  { path: 'security', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/security', componentKey: 'marketing.security.page', isPublic: true } },
  { path: 'contact',  loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/contact',  componentKey: 'marketing.contact.page',  isPublic: true } },
  { path: 'about',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/about',    componentKey: 'marketing.about.page',    isPublic: true } },
  { path: 'legal',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/legal',    componentKey: 'marketing.legal.page',    isPublic: true } },
  { path: 'docs',        redirectTo: '/resources', pathMatch: 'full' },
  { path: 'blog',        redirectTo: '/resources', pathMatch: 'full' },
  { path: 'whitepapers', redirectTo: '/resources', pathMatch: 'full' },
];


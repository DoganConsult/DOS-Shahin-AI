import { Routes } from '@angular/router';

export const MARKETING_PUBLIC_ROUTES: Routes = [
  // Wave 4 — /platform now has a registered route (uses pricing template as placeholder
  // until a dedicated marketing.platform.page template is built).
  { path: 'platform', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent),
    data: { contractRoute: '/platform', componentKey: 'marketing.pricing.page', isPublic: true } },
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
  // Wave 4 — /docs, /blog, /whitepapers are external until dedicated pages ship.
  // Angular redirectTo only handles internal paths; external hrefs are handled in brand.routes.ts
  // (resource hrefs kept as /docs etc so they resolve here with a placeholder until content exists).
  { path: 'docs',        redirectTo: '/platform', pathMatch: 'full' },
  { path: 'blog',        redirectTo: '/platform', pathMatch: 'full' },
  { path: 'whitepapers', redirectTo: '/platform', pathMatch: 'full' },
];


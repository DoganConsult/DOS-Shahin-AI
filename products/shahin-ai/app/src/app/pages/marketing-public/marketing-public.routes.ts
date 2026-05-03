import { Routes } from '@angular/router';

export const MARKETING_PUBLIC_ROUTES: Routes = [
  { path: 'pricing',  loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/pricing',  componentKey: 'marketing.pricing.page'  } },
  { path: 'trust',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/trust',    componentKey: 'marketing.trust.page'    } },
  { path: 'security', loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/security', componentKey: 'marketing.security.page' } },
  { path: 'contact',  loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/contact',  componentKey: 'marketing.contact.page'  } },
  { path: 'about',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/about',    componentKey: 'marketing.about.page'    } },
  { path: 'legal',    loadComponent: () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent), data: { contractRoute: '/legal',    componentKey: 'marketing.legal.page'    } },
];

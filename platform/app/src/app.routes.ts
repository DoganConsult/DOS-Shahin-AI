/**
 * Application routes — Dynamic UI template-only routing.
 *
 * All page routing resolved from dos.ui_route_template_binding via
 * DynamicTemplatePageComponent. No hardcoded module routes.
 *
 * Layout split:
 *   - PUBLIC paths (marketing + auth) → DynamicTemplatePageComponent directly
 *     (no workspace shell chrome — these render as standalone full-bleed pages)
 *   - WORKSPACE paths (everything else) → ShellHostComponent layout wrapper →
 *     DynamicTemplatePageComponent as child. ShellHostComponent reads workspace
 *     shell surfaces from the ui-os runtime and gates header/sidebar/main zones
 *     via zoneHas(). The zone metadata is populated by migration
 *     20260506_3140_workspace_shell_zone_metadata_repair.sql.
 */
import { Routes } from '@angular/router';

import { workspaceShellGuard } from './workspace-shell.guard';

const dynamicPageRoute = () => import('@platform/shell').then(m => m.DynamicTemplatePageComponent);
const shellHostRoute   = () => import('@platform/shell').then(m => m.ShellHostComponent);

/**
 * Public paths that render WITHOUT workspace shell chrome.
 * Marketing landing, auth pages, and info pages.
 */
const PUBLIC_PATHS: Routes = [
  // Root "/" — render_mode='redirect' contract.
  //
  // The DB row in dos.dynamic_ui_route_metadata (route='/', render_mode='redirect')
  // owns the typed redirect target (anonymous → /login, authenticated →
  // /workspace-home, default → /login). DynamicTemplatePageComponent calls
  // RouteMetadataService.resolve('/') and short-circuits to router.navigateByUrl(target);
  // it NEVER calls /api/ui-os/template-binding for "/".
  //
  // No `data: { componentKey: ... }` is attached here on purpose — assigning
  // a hardcoded componentKey to "/" would imply a static landing component
  // and contradict the DB-stored redirect contract (Zero Static / Zero
  // Legacy doctrine).
  {
    path: '',
    loadComponent: dynamicPageRoute,
    pathMatch: 'full',
  },
  // Auth pages — public, unauthenticated
  { path: 'login',           loadComponent: dynamicPageRoute },
  { path: 'register',        loadComponent: dynamicPageRoute },
  { path: 'forgot-password', loadComponent: dynamicPageRoute },
  { path: 'mfa',             loadComponent: dynamicPageRoute },
  { path: 'reset-password',  loadComponent: dynamicPageRoute },
  // Marketing pages
  { path: 'marketing',       loadComponent: dynamicPageRoute },
  { path: 'pricing',         loadComponent: dynamicPageRoute },
  { path: 'trust',           loadComponent: dynamicPageRoute },
  { path: 'security',        loadComponent: dynamicPageRoute },
  { path: 'contact',         loadComponent: dynamicPageRoute },
  { path: 'about',           loadComponent: dynamicPageRoute },
  { path: 'legal',           loadComponent: dynamicPageRoute },
  { path: 'platform',        loadComponent: dynamicPageRoute },
  { path: 'resources',       loadComponent: dynamicPageRoute },
  { path: 'resources/executive-kit', loadComponent: dynamicPageRoute },
  // Stale /auth/<page> entries → canonical short paths
  { path: 'auth/login', redirectTo: '/login', pathMatch: 'full' },
  { path: 'auth/register', redirectTo: '/register', pathMatch: 'full' },
  { path: 'auth/forgot-password', redirectTo: '/forgot-password', pathMatch: 'full' },
  { path: 'auth/mfa', redirectTo: '/mfa', pathMatch: 'full' },
  { path: 'auth/reset-password', redirectTo: '/reset-password', pathMatch: 'full' },
];

export const routes: Routes = [
  // 1. Public paths — no shell wrapper
  ...PUBLIC_PATHS,

  // 2. Workspace paths — ShellHostComponent provides header, sidebar,
  //    status bar, command search, etc. Its <router-outlet /> renders
  //    the child DynamicTemplatePageComponent.
  {
    path: '',
    loadComponent: shellHostRoute,
    canActivate: [workspaceShellGuard],
    children: [
      {
        path: '**',
        loadComponent: dynamicPageRoute,
      },
    ],
  },
];

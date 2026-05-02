// ============================================
// AGRC-OS — Dynamic Route Builder
// Reads component registry to produce Angular
// Routes[] at module evaluation time.
// All routes are registered; guards handle
// runtime module/role/permission checks.
// ============================================

import { Route, Routes } from '@angular/router';
import { grcAuthGuard } from '../../core/platform/guards/grc-auth.guard';
import { onboardingGuard } from '../../core/platform/guards/onboarding.guard';
import { grcRoleGuard } from '../../core/platform/guards/grc-role.guard';
import { grcAdminGuard } from '../../core/platform/guards/grc-admin.guard';
import { enterprisePermissionGuard } from '../../core/platform/guards/enterprise-permission.guard';
import { moduleAccessGuard } from '../../core/platform/guards/module-access.guard';
import {
  MODULE_ROUTE_GROUPS,
  MODULE_ROUTE_METADATA,
  STANDALONE_ROUTES,
  REDIRECT_MAP,
  StandaloneRouteEntry,
} from './component-registry';

/**
 * Build all authenticated shell child routes from the component registry.
 * Called once at module evaluation time. Guards handle runtime access control.
 */
export function buildAuthenticatedRoutes(): Routes {
  const routes: Routes = [];

  // 1. Redirects (always registered — they're cheap and prevent 404s)
  for (const [from, to] of Object.entries(REDIRECT_MAP)) {
    routes.push({ path: from, redirectTo: to, pathMatch: 'full' as const });
  }

  // 2. Module hub routes (with children)
  for (const [modulePath, group] of Object.entries(MODULE_ROUTE_GROUPS)) {
    const meta = MODULE_ROUTE_METADATA[modulePath];
    const children: Routes = [];

    for (const [childPath, entry] of Object.entries(group.children)) {
      if (entry.redirectTo) {
        children.push({
          path: childPath,
          redirectTo: entry.redirectTo,
          pathMatch: entry.pathMatch ?? ('full' as const),
        });
      } else if (entry.loadComponent) {
        const childRoute: Route = {
          path: childPath,
          loadComponent: entry.loadComponent,
        };
        if (entry.data) childRoute.data = entry.data;
        // Admin-gated module hub children get their own canActivate with grcAdminGuard
        if (entry.adminOnly || entry.data?.['adminOnly']) {
          childRoute.canActivate = [grcAuthGuard, grcAdminGuard, enterprisePermissionGuard];
        }
        children.push(childRoute);
      } else if (entry.loadChildren) {
        children.push({
          path: childPath,
          loadChildren: entry.loadChildren,
        });
      }
    }

    const moduleRoute: Route = {
      path: modulePath,
      children,
      canActivate: [grcAuthGuard, onboardingGuard, grcRoleGuard, enterprisePermissionGuard, moduleAccessGuard],
      data: {
        ...(meta?.requiredPermission ? { requiredPermission: meta.requiredPermission } : {}),
        ...(meta?.moduleCode ? { moduleCode: meta.moduleCode, module: meta.moduleCode } : {}),
        ...(meta?.agentId ? { agentId: meta.agentId, agentName: meta.agentName } : {}),
        ...(meta?.preload ? { preload: true } : {}),
      },
    };

    if (group.shell) {
      moduleRoute.loadComponent = group.shell;
    }

    routes.push(moduleRoute);
  }

  // 3. Standalone routes
  for (const [path, entry] of Object.entries(STANDALONE_ROUTES)) {
    routes.push(buildStandaloneRoute(path, entry));
  }

  return routes;
}

function buildStandaloneRoute(path: string, entry: StandaloneRouteEntry): Route {
  // Redirect route
  if (entry.redirectTo) {
    return {
      path,
      redirectTo: entry.redirectTo,
      pathMatch: entry.pathMatch ?? ('full' as const),
    };
  }

  const guards = [grcAuthGuard, enterprisePermissionGuard];

  // Add onboarding guard for non-admin routes
  if (!entry.adminOnly) {
    guards.splice(1, 0, onboardingGuard, grcRoleGuard);
  }

  // Admin guard
  if (entry.adminOnly) {
    guards.splice(1, 0, grcAdminGuard);
  }

  // Module access guard when moduleCode is set
  if (entry.moduleCode) {
    guards.push(moduleAccessGuard);
  }

  const route: Route = {
    path,
    canActivate: guards,
    data: {
      ...(entry.requiredPermission ? { requiredPermission: entry.requiredPermission } : {}),
      ...(entry.moduleCode ? { moduleCode: entry.moduleCode, module: entry.moduleCode } : {}),
      ...(entry.agentId ? { agentId: entry.agentId, agentName: entry.agentName } : {}),
      ...(entry.data ?? {}),
    },
  };

  if (entry.loadComponent) {
    route.loadComponent = entry.loadComponent;
  }
  if (entry.loadChildren) {
    route.loadChildren = entry.loadChildren;
  }

  return route;
}

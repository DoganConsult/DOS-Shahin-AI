import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import type { DosNavItem } from '@dos/ui-contracts';
import type { NavCtx, NavSource, NavSourceResult } from './nav-source';

type DynamicUiNavItem = DosNavItem & {
  permission?: string | null;
};

const NON_WORKSPACE_PATHS = new Set([
  '/',
  '/about',
  '/contact',
  '/dauth',
  '/forgot-password',
  '/legal',
  '/login',
  '/mfa',
  '/platform',
  '/pricing',
  '/profile',
  '/register',
  '/reset-password',
  '/security',
  '/settings',
  '/tenant-profile',
  '/tenant-settings',
  '/trust',
]);

function isWorkspaceNavItem(item: DynamicUiNavItem): boolean {
  const route = typeof item.route === 'string' ? item.route.trim() : '';
  const group = typeof item.group === 'string' ? item.group.trim() : '';
  const moduleCode = typeof item.moduleCode === 'string' ? item.moduleCode.trim() : '';
  const permission = item.requiredPermission ?? item.permission ?? undefined;

  if (!route || NON_WORKSPACE_PATHS.has(route)) return false;
  if (route.startsWith('/admin/')) return false;
  if (group === 'marketing' || moduleCode === 'marketing') return false;
  if (!permission) return false;
  return true;
}

/**
 * L1 — Dynamic UI nav source.
 * GET /api/ui-os/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The ui-os-service serves DB-driven nav from
 * dos.dynamic_ui_routes + dos.navigation_registry.
 */
@Injectable({ providedIn: 'root' })
export class DynamicUiNavSource implements NavSource {
  readonly id = 'dynamic-ui';
  private readonly http = inject(HttpClient);

  async resolve(_ctx: NavCtx): Promise<NavSourceResult> {
    const result = await firstValueFrom(
      this.http
        .get<{ items?: DynamicUiNavItem[] }>('/api/ui-os/workspace/nav', { withCredentials: true })
        .pipe(timeout(800), catchError(() => of(null))),
    );
    if (!result || !Array.isArray(result.items)) return null;
    return result.items.map((it) => {
      return {
        ...it,
        requiredPermission: it.requiredPermission ?? it.permission ?? undefined,
        group: it.group ?? this.id,
      };
    }).filter(isWorkspaceNavItem);
  }
}

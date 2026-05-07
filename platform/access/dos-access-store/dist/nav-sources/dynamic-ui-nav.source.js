var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
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
function isWorkspaceNavItem(item) {
    const route = item.action?.kind === 'navigate' ? item.action.path.trim() : '';
    const group = typeof item.group === 'string' ? item.group.trim() : '';
    const moduleCode = typeof item.moduleCode === 'string' ? item.moduleCode.trim() : '';
    const permission = item.requiredPermission ?? item.permission ?? undefined;
    if (!route || NON_WORKSPACE_PATHS.has(route))
        return false;
    if (route.startsWith('/admin/'))
        return false;
    if (group === 'marketing' || moduleCode === 'marketing')
        return false;
    if (!permission)
        return false;
    return true;
}
/**
 * L1 — Dynamic UI nav source.
 * GET /api/ui-os/workspace/nav with 800ms timeout. Tolerant: any
 * non-2xx, network error, timeout, or malformed payload returns null
 * (skip layer). The ui-os-service serves DB-driven nav from
 * dos.dynamic_ui_routes + dos.navigation_registry.
 */
let DynamicUiNavSource = class DynamicUiNavSource {
    id = 'dynamic-ui';
    http = inject(HttpClient);
    async resolve(_ctx) {
        const result = await firstValueFrom(this.http
            .get('/api/ui-os/workspace/nav', { withCredentials: true })
            .pipe(timeout(800), catchError(() => of(null))));
        if (!result || !Array.isArray(result.items))
            return null;
        return result.items.map((it) => {
            return {
                ...it,
                requiredPermission: it.requiredPermission ?? it.permission ?? undefined,
                group: it.group ?? this.id,
            };
        }).filter(isWorkspaceNavItem);
    }
};
DynamicUiNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], DynamicUiNavSource);
export { DynamicUiNavSource };
//# sourceMappingURL=dynamic-ui-nav.source.js.map
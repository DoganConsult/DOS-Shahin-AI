var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject } from '@angular/core';
import { AccessStore } from '../access.store';
/**
 * L6 — Survival fallback.
 *
 * Returns the 5 core workspace routes ONLY when:
 *   (a) every higher source (L1..L5) returned null, AND
 *   (b) `!access.loaded()` — i.e. no real session yet.
 *
 * Once any real source contributes anything, this source is suppressed.
 *
 * Constant name MUST be `CORE_WORKSPACE_NAV` — the lint guard
 * `lint-no-static-nav-fallback.mjs` rejects `STATIC_*_NAV_CHILDREN`.
 */
export const CORE_WORKSPACE_NAV = [
    { id: 'workspace.home', label: 'Workspace', route: '/workspace-home', enabled: true, group: 'core' },
    { id: 'workspace.profile', label: 'Profile', route: '/profile', enabled: true, group: 'core' },
    { id: 'workspace.settings', label: 'Settings', route: '/settings', enabled: true, group: 'core' },
    { id: 'workspace.tenant-profile', label: 'Tenant Profile', route: '/tenant-profile', enabled: true, group: 'core' },
    { id: 'workspace.tenant-settings', label: 'Tenant Settings', route: '/tenant-settings', enabled: true, group: 'core' },
];
let SurvivalFallbackNavSource = class SurvivalFallbackNavSource {
    id = 'survival-fallback';
    access = inject(AccessStore);
    async resolve(_ctx) {
        if (this.access.loaded())
            return null;
        return CORE_WORKSPACE_NAV.map((it) => ({
            ...it,
            ...{ __tier: 'product' },
        }));
    }
};
SurvivalFallbackNavSource = __decorate([
    Injectable({ providedIn: 'root' })
], SurvivalFallbackNavSource);
export { SurvivalFallbackNavSource };
//# sourceMappingURL=survival-fallback.source.js.map
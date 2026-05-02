// WorkspaceNavigationAdapter — platform-owned orchestrator for the 6-layer
// nav resolver. Moved here from products/shahin-ai/app/src/app/shell/ so the
// platform `ShellHostComponent` can inject it cleanly without reaching into
// product code (Three-tier ownership rule).
//
// L1..L3, L5, L6 are platform-owned NavSources injected directly. L4 is
// product-owned and supplied via the WORKSPACE_NAV_PRODUCT_SOURCE token —
// products register their `ProductCompositionNavSource` against that token
// in app.config.ts. When no L4 provider is registered the adapter skips it.
//
// Merge logic (NOT first-non-null wins):
//   1. Run L1..L5 concurrently; collect every contribution.
//   2. Merge by item.id. Highest-priority layer that emits the id owns
//      `enabled` and `disabledReason`. Lower layers fill missing metadata
//      (icon/route/permission/group/order/labels).
//   3. L6 (survival fallback) runs ONLY when every L1..L5 returned null
//      AND `!access.loaded()`.
//   4. Per-item filter pipeline (tier-aware):
//      - missing required permission → disabled, 'missing-permission'
//      - tier='dna': never 'not-entitled'; only 'backend-offline' (probe
//        failed) or 'route-not-wired' (no route)
//      - tier='module': not in access.modules() → 'not-entitled'
//      - tier='product': enabled if routed; else 'route-not-wired'
//   5. Disabled-reason precedence:
//      trial-expired > not-entitled > trial-limit-reached > missing-permission
//      > backend-offline > route-not-wired > coming-soon
//   6. Group by `group`; emit DosShellNavConfig.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, inject, signal } from '@angular/core';
import { AccessStore } from '../access.store';
import { PlatformReadinessService } from '../platform-readiness.service';
import { DynamicUiNavSource } from './dynamic-ui-nav.source';
import { PlatformDnaNavSource } from './platform-dna-nav.source';
import { ModuleLibraryNavSource } from './module-library-nav.source';
import { AccessStoreNavSource } from './access-store-nav.source';
import { SurvivalFallbackNavSource } from './survival-fallback.source';
import { WORKSPACE_NAV_PRODUCT_SOURCE } from './nav-source';
const DEFAULT_ACCOUNT_MENU = [
    { id: 'profile', labelKey: 'shell.account.menu.profile', route: '/profile' },
    { id: 'settings', labelKey: 'shell.account.menu.settings', route: '/settings' },
    { id: 'logout', labelKey: 'shell.account.menu.logout', destructive: true },
];
let WorkspaceNavigationAdapter = class WorkspaceNavigationAdapter {
    access = inject(AccessStore);
    readiness = inject(PlatformReadinessService);
    // L1..L3 + L5 — platform-owned source implementations
    l1 = inject(DynamicUiNavSource);
    l2 = inject(PlatformDnaNavSource);
    l3 = inject(ModuleLibraryNavSource);
    // L4 — product-owned, supplied via DI token. Optional.
    l4 = inject(WORKSPACE_NAV_PRODUCT_SOURCE, { optional: true });
    l5 = inject(AccessStoreNavSource);
    // L6 — survival fallback
    l6 = inject(SurvivalFallbackNavSource);
    _config = signal({ groups: [] });
    navConfig = this._config.asReadonly();
    _account = signal(DEFAULT_ACCOUNT_MENU);
    accountMenuConfig = this._account.asReadonly();
    /** Resolve and publish nav config. Idempotent; safe to call from multiple consumers. */
    async refresh() {
        const ctx = { access: this.access };
        const orderedSources = this.l4
            ? [this.l1, this.l2, this.l3, this.l4, this.l5]
            : [this.l1, this.l2, this.l3, this.l5];
        const results = await Promise.all(orderedSources.map((s) => s.resolve(ctx).catch(() => null)));
        const allNull = results.every((r) => r === null);
        const merged = new Map();
        if (allNull && !this.access.loaded()) {
            const fallback = (await this.l6.resolve(ctx)) ?? [];
            for (const it of fallback)
                merged.set(it.id, it);
        }
        else {
            results.forEach((items) => {
                if (!items)
                    return;
                for (const it of items) {
                    const existing = merged.get(it.id);
                    if (!existing) {
                        merged.set(it.id, { ...it });
                    }
                    else {
                        const filled = {
                            ...it,
                            ...existing,
                            icon: existing.icon ?? it.icon,
                            route: existing.route ?? it.route,
                            labelKey: existing.labelKey ?? it.labelKey,
                            requiredPermission: existing.requiredPermission ?? it.requiredPermission,
                            moduleCode: existing.moduleCode ?? it.moduleCode,
                            group: existing.group ?? it.group,
                        };
                        merged.set(it.id, filled);
                    }
                }
            });
        }
        const filtered = [];
        for (const it of merged.values()) {
            const tier = it.__tier ?? 'product';
            const reasons = [];
            if (it.requiredPermission && !this.access.hasPermission(it.requiredPermission)) {
                reasons.push('missing-permission');
            }
            if (tier === 'dna') {
                const moduleCode = it.moduleCode || it.id.split('.')[0];
                const r = this.readiness.disabledReason(moduleCode, !!it.route);
                if (r === 'backend-offline')
                    reasons.push('backend-offline');
                else if (r === 'route-not-wired')
                    reasons.push('route-not-wired');
            }
            else if (tier === 'module') {
                const moduleCode = it.moduleCode;
                if (moduleCode && this.access.trialExpiredModules().includes(moduleCode)) {
                    reasons.push('trial-expired');
                }
                if (moduleCode && this.access.trialLimitsHitModules().includes(moduleCode)) {
                    reasons.push('trial-limit-reached');
                }
                if (moduleCode && !this.access.modules().includes(moduleCode)
                    && !this.access.trialExpiredModules().includes(moduleCode)) {
                    reasons.push('not-entitled');
                }
                if (!it.route)
                    reasons.push('route-not-wired');
            }
            else {
                if (!it.route)
                    reasons.push('route-not-wired');
            }
            const PRECEDENCE = [
                'trial-expired',
                'not-entitled',
                'trial-limit-reached',
                'missing-permission',
                'backend-offline',
                'route-not-wired',
                'coming-soon',
            ];
            const winner = PRECEDENCE.find((p) => reasons.includes(p));
            const next = winner
                ? { ...it, enabled: false, disabledReason: winner }
                : { ...it, enabled: true, disabledReason: undefined };
            filtered.push(next);
        }
        const groupMap = new Map();
        for (const it of filtered) {
            const gid = it.group ?? 'misc';
            let g = groupMap.get(gid);
            if (!g) {
                g = { id: gid, label: this.titleCase(gid), order: defaultOrder(gid), items: [] };
                groupMap.set(gid, g);
            }
            const { __tier: _t, ...clean } = it;
            g.items.push(clean);
        }
        const groups = Array.from(groupMap.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        this._config.set({ groups });
    }
    titleCase(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }
};
WorkspaceNavigationAdapter = __decorate([
    Injectable({ providedIn: 'root' })
], WorkspaceNavigationAdapter);
export { WorkspaceNavigationAdapter };
function defaultOrder(group) {
    switch (group) {
        case 'workspace':
        case 'core': return 10;
        case 'tenant': return 20;
        case 'foundation': return 30;
        case 'modules': return 40;
        case 'primary': return 50;
        case 'secondary': return 60;
        case 'platform': return 70;
        default: return 999;
    }
}
//# sourceMappingURL=workspace-navigation.adapter.js.map
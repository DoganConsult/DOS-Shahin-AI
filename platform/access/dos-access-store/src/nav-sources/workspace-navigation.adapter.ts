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
//      AND `!access.loaded()`. It contributes no stub rows — merge yields empty
//      nav until other layers contribute once bootstrap/session resolves.
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

import { Injectable, inject, signal } from '@angular/core';
import type {
  DosNavDisabledReason,
  DosNavGroup,
  DosNavItem,
  DosShellNavConfig,
  ShellAccountMenuEntry,
} from '@dos/ui-contracts';
import { AccessStore } from '../access.store';
import { PlatformReadinessService } from '../platform-readiness.service';
import { DynamicUiNavSource } from './dynamic-ui-nav.source';
import { PlatformDnaNavSource } from './platform-dna-nav.source';
import { ModuleLibraryNavSource } from './module-library-nav.source';
import { AccessStoreNavSource } from './access-store-nav.source';
import { SurvivalFallbackNavSource } from './survival-fallback.source';
import { WORKSPACE_NAV_PRODUCT_SOURCE, type NavCtx, type NavSource, type NavSourceResult } from './nav-source';

interface MergedItem extends DosNavItem {
  __tier?: 'dna' | 'module' | 'product';
}

// Account menu is 100% DB-driven — seeded in dos.workspace_shell_binding
// props.accountMenu for workspace.frame.header-menu. No hardcoded fallback.

@Injectable({ providedIn: 'root' })
export class WorkspaceNavigationAdapter {
  private readonly access = inject(AccessStore);
  private readonly readiness = inject(PlatformReadinessService);

  // L1..L3 + L5 — platform-owned source implementations
  private readonly l1 = inject(DynamicUiNavSource);
  private readonly l2 = inject(PlatformDnaNavSource);
  private readonly l3 = inject(ModuleLibraryNavSource);
  // L4 — product-owned, supplied via DI token. Optional.
  private readonly l4 = inject<NavSource | null>(WORKSPACE_NAV_PRODUCT_SOURCE, { optional: true });
  private readonly l5 = inject(AccessStoreNavSource);
  // L6 — survival fallback
  private readonly l6 = inject(SurvivalFallbackNavSource);

  private readonly _config = signal<DosShellNavConfig>({ groups: [] });
  readonly navConfig = this._config.asReadonly();

  private readonly _account = signal<ReadonlyArray<ShellAccountMenuEntry>>([]);
  readonly accountMenuConfig = this._account.asReadonly();

  /** Resolve and publish nav config. Idempotent; safe to call from multiple consumers. */
  async refresh(): Promise<void> {
    const ctx: NavCtx = { access: this.access };

    // Phase 1: resolve L1 first so we can pass its results to L5 for dedup.
    const l1Result = await this.l1.resolve(ctx).catch((): NavSourceResult => null);
    const ctxWithL1: NavCtx = { ...ctx, l1Items: l1Result ?? [] };

    // Phase 2: resolve L2..L5 concurrently with the enriched context.
    const remainingSources: ReadonlyArray<NavSource> = this.l4
      ? [this.l2, this.l3, this.l4, this.l5]
      : [this.l2, this.l3, this.l5];

    const remainingResults = await Promise.all(
      remainingSources.map((s) => s.resolve(ctxWithL1).catch((): NavSourceResult => null)),
    );

    const results: ReadonlyArray<NavSourceResult> = [l1Result, ...remainingResults];

    const allNull = results.every((r) => r === null);
    const merged = new Map<string, MergedItem>();

    if (allNull && !this.access.loaded()) {
      const fallback = (await this.l6.resolve(ctx)) ?? [];
      for (const it of fallback) merged.set(it.id, it as MergedItem);
    } else {
      results.forEach((items, i) => {
        if (!items) return;
        // L5 re-resolve with L1 context so it can skip duplicates
        // (already resolved above; result is in results[l5Index])
        for (const it of items) {
          const existing = merged.get(it.id);
          if (!existing) {
            merged.set(it.id, { ...it } as MergedItem);
          } else {
            const filled: MergedItem = {
              ...it,
              ...existing,
              icon:               existing.icon ?? it.icon,
              route:              existing.route ?? it.route,
              labelKey:           existing.labelKey ?? it.labelKey,
              requiredPermission: existing.requiredPermission ?? it.requiredPermission,
              moduleCode:         existing.moduleCode ?? it.moduleCode,
              group:              existing.group ?? it.group,
            };
            merged.set(it.id, filled);
          }
        }
      });
    }

    const filtered: MergedItem[] = [];
    for (const it of merged.values()) {
      const tier = it.__tier ?? 'product';
      const reasons: DosNavDisabledReason[] = [];

      if (it.requiredPermission && !this.access.hasPermission(it.requiredPermission)) {
        reasons.push('missing-permission');
      }

      if (tier === 'dna') {
        const moduleCode = it.moduleCode || it.id.split('.')[0];
        const r = this.readiness.disabledReason(moduleCode, !!it.route);
        if (r === 'backend-offline') reasons.push('backend-offline');
        else if (r === 'route-not-wired') reasons.push('route-not-wired');
      } else if (tier === 'module') {
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
        if (!it.route) reasons.push('route-not-wired');
      } else {
        if (!it.route) reasons.push('route-not-wired');
      }

      const PRECEDENCE: DosNavDisabledReason[] = [
        'trial-expired',
        'not-entitled',
        'trial-limit-reached',
        'missing-permission',
        'backend-offline',
        'route-not-wired',
        'coming-soon',
      ];
      const winner = PRECEDENCE.find((p) => reasons.includes(p));
      const next: MergedItem = winner
        ? { ...it, enabled: false, disabledReason: winner }
        : { ...it, enabled: true, disabledReason: undefined };
      filtered.push(next);
    }

    const groupMap = new Map<string, DosNavGroup>();
    for (const it of filtered) {
      const gid = it.group ?? 'misc';
      let g = groupMap.get(gid);
      if (!g) {
        g = { id: gid, label: this.groupLabelOf(gid), order: defaultOrder(gid), items: [] };
        groupMap.set(gid, g);
      }
      const { __tier: _t, ...clean } = it;
      g.items.push(clean as DosNavItem);
    }
    const groups = Array.from(groupMap.values()).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    this._config.set({ groups });
  }

  private groupLabelOf(gid: string): string {
    const DISPLAY: Record<string, string> = {
      'workspace':          'Workspace',
      'core':               'Core',
      'foundation':         'Foundation',
      'config-center':      'Config Center',
      'compliance':         'Compliance',
      'risk':               'Risk',
      'dauth':              'Identity & Access',
      'access':             'Access Control',
      'dnoc':               'Network Operations',
      'dsoc':               'Security Operations',
      'ai-platform':        'AI Platform',
      'dos-platform':       'DOS Platform',
      'runtime':            'Runtime',
      'ui-system':          'UI System',
      'tenant-management':  'Tenant Management',
      'multi-tenant-mgmt':  'Multi-Tenant Mgmt',
      'foundation-admin':   'Foundation Admin',
      'modules':            'Modules',
      'misc':               'Other',
      'primary':            'Main',
      'secondary':          'Secondary',
    };
    return DISPLAY[gid] ?? (gid.charAt(0).toUpperCase() + gid.slice(1));
  }
}

function defaultOrder(group: string): number {
  switch (group) {
    // Core platform — always first
    case 'workspace': case 'core':  return 10;
    // GRC modules — business content
    case 'foundation':              return 20;
    case 'compliance':              return 30;
    case 'risk':                    return 40;
    // Config & platform admin
    case 'config-center':           return 50;
    case 'access':                  return 60;
    case 'dauth':                   return 70;
    case 'dnoc':                    return 80;
    case 'dsoc':                    return 90;
    case 'ai-platform':             return 100;
    case 'dos-platform':            return 110;
    case 'runtime':                 return 120;
    case 'ui-system':               return 130;
    case 'tenant-management':       return 140;
    case 'multi-tenant-mgmt':       return 150;
    case 'foundation-admin':        return 160;
    // Catch-all buckets
    case 'modules':                 return 900;
    case 'primary':                 return 910;
    case 'secondary':               return 920;
    case 'misc':                    return 990;
    default:                        return 999;
  }
}

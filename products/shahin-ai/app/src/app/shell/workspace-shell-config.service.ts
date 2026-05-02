// WorkspaceShellConfigService — DB-driven shell config, NO hardcoded
// user-facing strings.
//
// Every label rendered in the workspace shell (chrome, account menu,
// nav groups, nav items, header actions) is resolved through
// WorkspaceResolverService. The resolver mirrors the row shape of
// dos.i18n_translations + dos.dynamic_ui_navigation; today the
// translations live in a stub map inside the resolver, but tomorrow
// only that one service swaps to a backend call — this file is
// untouched.
//
// This service is a thin product-side accessor:
//   - locale / direction (read from <html>, set by bootstrap from DB)
//   - labels / action lists / account menu — all delegated to resolver
//   - account-menu route map (the only product-specific piece, since
//     the routes themselves are platform/product convention; the
//     LABELS for those routes still come from the resolver)

import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { DosBottomNavItem, DosAccountMenuItem } from '@dos/ui-system';
import { AccessStore, CORE_WORKSPACE_NAV } from '@dos/access-store';
import { WorkspaceResolverService } from './workspace-resolver.service';

interface WorkspaceHeaderConfig {
  title: string;
  subtitle?: string;
}

export interface ShellHeaderActionDef {
  id: 'search' | 'language' | 'notifications' | 'help' | 'theme';
  label: string;
  icon: string;
  badge?: number | null;
}

/** Shell labels — every value resolved through the i18n port (resolver). */
export interface ShellLabels {
  brandFallback: string;
  tenantPillPrefix: string;
  accountAria: string;
  accountFallback: string;
  signOut: string;
  searchAria: string;
  languageAria: string;
  notificationsAria: string;
  helpAria: string;
  themeAria: string;
  navAria: string;
}

// ────────────────────────────────────────────────────────────────────
// Account-menu route map — the ONLY product-specific table left here.
// Labels are NOT in this file — they come from the resolver via
// `shell.account.menu.<id>` keys.
// ────────────────────────────────────────────────────────────────────
const ACCOUNT_ROUTES: Record<string, string> = {
  profile:           '/profile',
  settings:          '/settings',
  'tenant-profile':  '/tenant-profile',
  'tenant-settings': '/tenant-settings',
  logout:            '/api/auth/logout',
};

/** id → resolver i18n key. */
const ACCOUNT_LABEL_KEYS: Record<string, string> = {
  profile:           'shell.account.menu.profile',
  settings:          'shell.account.menu.settings',
  'tenant-profile':  'shell.account.menu.tenant_profile',
  'tenant-settings': 'shell.account.menu.tenant_settings',
  logout:            'shell.account.menu.logout',
};

@Injectable({ providedIn: 'root' })
export class WorkspaceShellConfigService {
  private readonly access = inject(AccessStore);
  private readonly router = inject(Router);
  private readonly resolver = inject(WorkspaceResolverService);

  /** Reads <html dir> (set by bootstrap interceptor from DB preferences). */
  readonly direction = computed<'ltr' | 'rtl'>(() => {
    if (typeof document === 'undefined') return 'ltr';
    return (document.documentElement.dir as 'ltr' | 'rtl') || 'ltr';
  });

  readonly locale = computed<'en' | 'ar'>(() => {
    if (typeof document === 'undefined') return 'en';
    const l = (document.documentElement.lang || 'en').toLowerCase();
    return l.startsWith('ar') ? 'ar' : 'en';
  });

  /** All shell labels — resolved through the i18n port. */
  readonly labels = computed<ShellLabels>(() => {
    // Touch the locale signal so re-resolve fires on language switch.
    void this.locale();
    const t = (k: string) => this.resolver.string(k);
    return {
      brandFallback:     t('shell.brand.fallback'),
      tenantPillPrefix:  t('shell.tenant.prefix'),
      accountAria:       t('shell.account.aria'),
      accountFallback:   t('shell.account.fallback'),
      signOut:           t('shell.signout'),
      searchAria:        t('shell.search.aria'),
      languageAria:      t('shell.language.aria'),
      notificationsAria: t('shell.notifications.aria'),
      helpAria:          t('shell.help.aria'),
      themeAria:         t('shell.theme.aria'),
      navAria:           t('shell.nav.aria'),
    };
  });

  /** Bottom nav for mobile — derived from CORE_WORKSPACE_NAV (platform). */
  readonly mobileBottomNav = computed<DosBottomNavItem[]>(() => {
    const url = this.router.url.split('?')[0];
    return CORE_WORKSPACE_NAV.slice(0, 4).map((it) => ({
      id: it.id,
      label: this.resolver.navItemLabel(it.label, it.id),
      route: it.route,
      active: it.route === url,
    } as DosBottomNavItem));
  });

  /** Account menu — labels through resolver, routes through platform map. */
  readonly accountMenu = computed<Array<DosAccountMenuItem & { route: string }>>(() => {
    void this.locale();
    const isAdmin = this.access.isTenantAdmin();
    const ids = ['profile', 'settings', 'tenant-profile'];
    if (isAdmin) ids.push('tenant-settings');
    ids.push('logout');
    return ids.map((id) => ({
      id,
      label: this.resolver.string(ACCOUNT_LABEL_KEYS[id] ?? `shell.account.menu.${id}`),
      route: ACCOUNT_ROUTES[id] ?? '#',
      destructive: id === 'logout',
    }));
  });

  /** Header icon strip — labels resolved by locale. */
  readonly headerActions = computed<ShellHeaderActionDef[]>(() => {
    const L = this.labels();
    return [
      { id: 'search',        label: L.searchAria,        icon: 'search',         badge: null },
      { id: 'language',      label: L.languageAria,      icon: 'language',       badge: null },
      { id: 'notifications', label: L.notificationsAria, icon: 'notifications',  badge: null },
      { id: 'help',          label: L.helpAria,          icon: 'help',           badge: null },
      { id: 'theme',         label: L.themeAria,         icon: 'theme',          badge: null },
    ];
  });

  /** Header config — title from live tenant, never a hardcoded brand. */
  readonly header = computed<WorkspaceHeaderConfig>(() => {
    const t = this.access.me()?.tenant;
    return { title: t?.name || t?.code || this.labels().brandFallback };
  });

  /** Sidebar nav GROUP label — delegate to resolver. */
  navGroupLabel(idOrLabel: string | undefined | null): string {
    return this.resolver.navGroupLabel(idOrLabel);
  }

  /** Sidebar nav ITEM label — delegate to resolver. */
  navItemLabel(idOrLabel: string | undefined | null, fallbackId?: string): string {
    return this.resolver.navItemLabel(idOrLabel, fallbackId);
  }
}

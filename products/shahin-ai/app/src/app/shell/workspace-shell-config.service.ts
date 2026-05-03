// WorkspaceShellConfigService — DB-driven shell config, NO hardcoded
// user-facing strings.
//
// Scope:
// - shell labels through WorkspaceResolverService
// - mobile nav from CORE_WORKSPACE_NAV
// - account menu labels through resolver
// - account menu routes only as product/platform route conventions
//
// Do not add module-page logic here.

import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import type { DosAccountMenuItem, DosBottomNavItem } from '@dos/ui-system';
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

type AccountMenuId =
  | 'profile'
  | 'settings'
  | 'tenant-profile'
  | 'tenant-settings'
  | 'logout';

const ACCOUNT_ROUTES: Record<AccountMenuId, string> = {
  profile: '/profile',
  settings: '/settings',
  'tenant-profile': '/tenant-profile',
  'tenant-settings': '/tenant-settings',
  logout: '/api/auth/logout',
};

const ACCOUNT_LABEL_KEYS: Record<AccountMenuId, string> = {
  profile: 'shell.account.menu.profile',
  settings: 'shell.account.menu.settings',
  'tenant-profile': 'shell.account.menu.tenant_profile',
  'tenant-settings': 'shell.account.menu.tenant_settings',
  logout: 'shell.account.menu.logout',
};

@Injectable({ providedIn: 'root' })
export class WorkspaceShellConfigService {
  private readonly access = inject(AccessStore);
  private readonly router = inject(Router);
  private readonly resolver = inject(WorkspaceResolverService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly currentUrl = signal(this.normalizeUrl(this.router.url));
  private readonly htmlDirection = signal<'ltr' | 'rtl'>(this.readDirection());
  private readonly htmlLocale = signal<'en' | 'ar'>(this.readLocale());

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(this.normalizeUrl(event.urlAfterRedirects));
      });

    this.watchHtmlAttributes();
  }

  readonly direction = computed<'ltr' | 'rtl'>(() => this.htmlDirection());

  readonly locale = computed<'en' | 'ar'>(() => this.htmlLocale());

  readonly labels = computed<ShellLabels>(() => {
    void this.locale();

    const t = (key: string) => this.resolver.string(key);

    return {
      brandFallback: t('shell.brand.fallback'),
      tenantPillPrefix: t('shell.tenant.prefix'),
      accountAria: t('shell.account.aria'),
      accountFallback: t('shell.account.fallback'),
      signOut: t('shell.signout'),
      searchAria: t('shell.search.aria'),
      languageAria: t('shell.language.aria'),
      notificationsAria: t('shell.notifications.aria'),
      helpAria: t('shell.help.aria'),
      themeAria: t('shell.theme.aria'),
      navAria: t('shell.nav.aria'),
    };
  });

  readonly mobileBottomNav = computed<DosBottomNavItem[]>(() => {
    const url = this.currentUrl();

    return CORE_WORKSPACE_NAV.slice(0, 4).map((item) => ({
      id: item.id,
      label: this.resolver.navItemLabel(item.label, item.id),
      route: item.route,
      active: this.isRouteActive(item.route, url),
    } as DosBottomNavItem));
  });

  readonly accountMenu = computed<Array<DosAccountMenuItem & { route: string }>>(() => {
    void this.locale();

    const ids: AccountMenuId[] = ['profile', 'settings', 'tenant-profile'];

    if (this.access.isTenantAdmin()) {
      ids.push('tenant-settings');
    }

    ids.push('logout');

    return ids.map((id) => ({
      id,
      label: this.resolver.string(ACCOUNT_LABEL_KEYS[id]),
      route: ACCOUNT_ROUTES[id],
      destructive: id === 'logout',
    }));
  });

  readonly headerActions = computed<ShellHeaderActionDef[]>(() => {
    const labels = this.labels();

    return [
      { id: 'search', label: labels.searchAria, icon: 'search', badge: null },
      { id: 'language', label: labels.languageAria, icon: 'language', badge: null },
      { id: 'notifications', label: labels.notificationsAria, icon: 'notifications', badge: null },
      { id: 'help', label: labels.helpAria, icon: 'help', badge: null },
      { id: 'theme', label: labels.themeAria, icon: 'theme', badge: null },
    ];
  });

  readonly header = computed<WorkspaceHeaderConfig>(() => {
    const tenant = this.access.me()?.tenant;

    return {
      title: tenant?.name || tenant?.code || this.labels().brandFallback,
    };
  });

  navGroupLabel(idOrLabel: string | undefined | null): string {
    return this.resolver.navGroupLabel(idOrLabel);
  }

  navItemLabel(idOrLabel: string | undefined | null, fallbackId?: string): string {
    return this.resolver.navItemLabel(idOrLabel, fallbackId);
  }

  private normalizeUrl(url: string): string {
    const clean = (url || '/').split('?')[0].split('#')[0];
    return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
  }

  private isRouteActive(route: string, currentUrl: string): boolean {
    const target = this.normalizeUrl(route);

    return currentUrl === target || currentUrl.startsWith(`${target}/`);
  }

  private readDirection(): 'ltr' | 'rtl' {
    if (typeof document === 'undefined') return 'ltr';
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  }

  private readLocale(): 'en' | 'ar' {
    if (typeof document === 'undefined') return 'en';

    const lang = document.documentElement.lang?.toLowerCase() || 'en';
    return lang.startsWith('ar') ? 'ar' : 'en';
  }

  private watchHtmlAttributes(): void {
    if (
      typeof document === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return;
    }

    const observer = new MutationObserver(() => {
      this.htmlDirection.set(this.readDirection());
      this.htmlLocale.set(this.readLocale());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir', 'lang'],
    });

    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
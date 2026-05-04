import { Injectable, computed, signal, inject } from '@angular/core';
import { BootstrapStore } from '../../services/platform/bootstrap.store';
import { AccessStore } from '@dos/access-store';
import { NavigationService } from './navigation.service';
import { NavItem, NavigationViewModel, CanonicalModuleCode } from './navigation.models';
import { RouteRegistryStore } from '../../routing/route-registry.store';
import { ProductsModulesConfigService } from '../../config/products-modules-config.service';

@Injectable({ providedIn: 'root' })
export class NavigationStore {
  private bootstrap = inject(BootstrapStore);
  private accessStore = inject(AccessStore);
  private navigationService = inject(NavigationService);
  private routeRegistry = inject(RouteRegistryStore);
  private productsModulesConfig = inject(ProductsModulesConfigService);

  readonly expanded = signal(true);
  readonly loaded = signal(false);

  readonly nav = computed<NavigationViewModel>(() => {
    const registryCatalog = this.routeRegistry.catalog();
    const data = this.bootstrap.data();
    const quickActions = data ? this.navigationService.build(data as any).quickActions : [];

    // Authoritative visibility source: AccessStore.visibleModules() (from
    // /api/access/my-permissions). Until access has loaded, we render an
    // empty primary so the sidebar does NOT flash the legacy all-modules
    // catalog (legacy hardcoded primary nav) before the truth arrives.
    if (!this.accessStore.loaded()) {
      return { primary: [], secondary: [], quickActions };
    }

    // Prefer server-published route catalog when available.
    if (registryCatalog?.navigation?.primary?.length) {
      let regPrimary = registryCatalog.navigation.primary.map((item: Record<string, unknown>) => this.apiItemToNavItem(item));
      let regSecondary = registryCatalog.navigation.secondary?.map((item: Record<string, unknown>) => this.apiItemToNavItem(item)) ?? [];

      regPrimary = this.filterNavByVisibleModules(regPrimary);
      regSecondary = this.filterNavByVisibleModules(regSecondary);

      return { primary: regPrimary, secondary: regSecondary, quickActions };
    }

    return { primary: [], secondary: [], quickActions };
  });

  async load(): Promise<void> {
    // Load in parallel: route-catalog (primary), products-modules (visibility/labels)
    await Promise.allSettled([
      this.routeRegistry.load(),
      this.productsModulesConfig.load(),
    ]);

    this.loaded.set(true);
  }

  private filterNavByVisibleModules(items: NavItem[]): NavItem[] {
    // AccessStore is the canonical authority for module visibility.
    if (this.accessStore.loaded()) {
      const canonicalModules = this.accessStore.visibleModules();
      const hasWildcard = canonicalModules.includes('*');
      // Items without a `module` are platform-scoped chrome (Home, etc.) and
      // remain visible. Module-scoped items are kept ONLY when the access
      // contract lists them. Empty visibleModules ⇒ hide all module-scoped
      // items (do NOT expose the legacy catalog).
      return items
        .filter(item => !item.module || hasWildcard || canonicalModules.includes(item.module))
        .map(item => ({
          ...item,
          children: item.children?.length
            ? this.filterNavByVisibleModules(item.children)
            : item.children,
        }))
        // Drop parents that lost all their children to filtering and have no
        // own route — prevents empty section headers in the sidebar.
        .filter(item => !!item.route || (item.children?.length ?? 0) > 0);
    }
    // Access not loaded → render nothing rather than the legacy catalog.
    return [];
  }

  toggle() { this.expanded.update((v) => !v); }
  collapse() { this.expanded.set(false); }
  expand() { this.expanded.set(true); }

  clear() {
    this.loaded.set(false);
    this.routeRegistry.clear();
    this.productsModulesConfig.clear();
  }

  /**
   * Convert API navigation item (from route-catalog) to NavItem format.
   */
  private apiItemToNavItem(item: Record<string, unknown>): NavItem {
    return {
      id: (item['navKey'] ?? item['id'] ?? '') as string,
      navKey: item['navKey'] as string | undefined,
      labelEn: (item['labelEn'] ?? item['label_en'] ?? '') as string,
      labelAr: (item['labelAr'] ?? item['label_ar'] ?? '') as string,
      route: item['route'] as string | undefined,
      icon: item['icon'] as string | undefined,
      module: (item['moduleCode'] ?? item['module_code']) as CanonicalModuleCode | undefined,
      children: ((item['children'] ?? []) as Record<string, unknown>[]).map((c: Record<string, unknown>) => this.apiItemToNavItem(c)),
    };
  }
}

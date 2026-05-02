// ============================================
// Resolver: load route catalog (and products-modules) before shell activates.
// Ensures RouteRegistryStore and ProductsModulesConfig are ready so
// moduleAccessGuard and sidebar nav have correct data on first paint.
// ============================================

import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { NavigationStore } from '../../core/platform/navigation/navigation.store';

export const navigationCatalogResolver: ResolveFn<boolean> = async () => {
  const nav = inject(NavigationStore);
  if (nav.loaded()) return true;
  await nav.load().catch((e: unknown) => { console.warn('[NavResolver] catalog load failed:', e); });
  return true;
};

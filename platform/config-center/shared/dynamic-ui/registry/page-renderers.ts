// Spec §6 — Renderer Registry (generic first, custom second).
//
// Generic page renderers keyed by `pageType`. The Dynamic UI route resolver
// must consult COMPONENT_MAP first (custom component for the route's
// component_key) and fall back to PAGE_RENDERERS keyed by route.pageType.

import type { Type } from '@angular/core';
import type { PageType } from '../services/index';

export const PAGE_RENDERERS: Record<PageType, () => Promise<Type<unknown>>> = {
  overview: () =>
    import('@foundation-module/ui').then(m => m.FoundationOverviewComponent as unknown as Type<unknown>),
  list: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
  object: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
  workflow: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
  analytics: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
  audit: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
  settings: () =>
    import('../../../core/platform/shell/shell-host.component').then(m => m.ShellHostComponent as unknown as Type<unknown>),
};

export function resolvePageRenderer(pageType: PageType | string | null | undefined): (() => Promise<Type<unknown>>) | null {
  if (!pageType) return null;
  return PAGE_RENDERERS[pageType as PageType] ?? null;
}

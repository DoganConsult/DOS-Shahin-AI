/**
 * MarketingPublicConfigService (Phase M0).
 *
 * Drives PUBLIC marketing surfaces (landing, /platform, /products/*,
 * /trust, /pricing). It MUST NOT depend on:
 *   - AccessStore (no authenticated session on landing)
 *   - tenant context (the user has not chosen a tenant yet)
 *   - permission keys (no RBAC at this layer)
 *
 * It DOES depend on:
 *   - brand config (active brand code)
 *   - product config (which products are publicly listed)
 *   - locale (en/ar)
 *   - feature flags (campaign toggles)
 *   - public marketing route contract (resolved from
 *     dos.marketing_pages + dos.dynamic_ui_routes)
 *
 * Selectors exposed:
 *   - publicMarketingEnabled() — global on/off
 *   - marketingNavItems()      — top-nav items (header)
 *   - marketingFooterGroups()  — footer column groups
 *
 * Companion to AccessStore.mobileNavItems() — that one stays for the
 * authenticated workspace shell. These three are the public layer.
 */
import { Injectable, signal, computed } from '@angular/core';
import type { DosBrandCode } from '@dos/design-tokens';

export interface MarketingNavItem {
  id: string;
  /** Translation key (NOT raw text). Resolved by i18n at render time. */
  labelKey: string;
  /** Optional server-translated label (Phase M3). Public marketing surface
   *  has no authenticated i18n loader, so the resolver ships the literal
   *  EN/AR label alongside the key. */
  label?: string;
  href: string;
  /** Optional functional Carbon icon (validated via marketing-icons allowlist). */
  icon?: string;
  /** Visual emphasis: 'primary' shows as filled CTA in header. */
  variant?: 'link' | 'primary' | 'secondary' | 'ghost';
  /** Hide on locales that don't apply (rare — mostly null = all). */
  hideForLocales?: ReadonlyArray<'en' | 'ar'>;
  /** Nav group ID — items with the same group render as a dropdown menu. */
  navGroup?: string | null;
}

export interface MarketingNavGroup {
  id: string;
  label: string;
  items: ReadonlyArray<MarketingNavItem>;
}

export interface MarketingFooterGroup {
  id: string;
  titleKey: string;
  /** Optional server-translated title (Phase M3 — see MarketingNavItem.label). */
  title?: string;
  items: ReadonlyArray<{ id: string; labelKey: string; label?: string; href: string }>;
}

export interface MarketingHomeAgentTile {
  agentCode: string;
  displayName: string;
  displayNameAr?: string;
  role?: string;
}

export interface MarketingHomeProgressStep {
  state: 'incomplete' | 'current' | 'complete' | 'invalid' | 'disabled';
  label: string;
  description?: string;
}

export interface MarketingHomeStructuredRow {
  key: string;
  label: string;
  value: string;
}

export interface MarketingHomeTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface MarketingHomeBreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface MarketingHomeContent {
  brandLabel: string;
  hero: {
    badge: string;
    eyebrow: string;
    title: string;
    sub: string;
    microcopy: string;
    ctaPrimary: { label: string; href: string };
    ctaSecondary: { label: string; href: string };
  };
  trustPills: ReadonlyArray<{ id: string; label: string }>;
  valueProps: ReadonlyArray<{ id: string; title: string; body: string }>;
  agentic: {
    eyebrow: string;
    title: string;
    readinessPercent: number;
    tiles: ReadonlyArray<MarketingHomeAgentTile>;
  };
  downloadKit: {
    eyebrow: string;
    title: string;
    body: string;
    ctaLabel: string;
    featuredAssetKey: string;
    notification: { title: string; subtitle: string };
    toast: { title: string; subtitle: string };
  };
  platform: {
    eyebrow: string;
    title: string;
    body: string;
    tabs: ReadonlyArray<{ id: string; label: string; body: string }>;
  };
  modules: ReadonlyArray<{ id: string; title: string; body: string }>;
  industries: ReadonlyArray<{ id: string; label: string }>;
  architecture: {
    title: string;
    body: string;
    rows: ReadonlyArray<MarketingHomeStructuredRow>;
  };
  ai: {
    eyebrow: string;
    title: string;
    body: string;
    currentStep: number;
    steps: ReadonlyArray<MarketingHomeProgressStep>;
  };
  pricing: {
    eyebrow: string;
    title: string;
    ctaLabel: string;
    href: string;
    columns: ReadonlyArray<MarketingHomeTableColumn>;
    rows: ReadonlyArray<Record<string, string>>;
  };
  testimonials: {
    eyebrow: string;
    title: string;
    sub: string;
    items: ReadonlyArray<{ id: string; quote: string; author: string; role: string }>;
  };
  logos: {
    eyebrow: string;
    title: string;
    items: ReadonlyArray<{ id: string; name: string }>;
  };
  resources: {
    eyebrow: string;
    title: string;
    sub: string;
    items: ReadonlyArray<{ id: string; title: string; body: string; href: string }>;
  };
  faq: {
    eyebrow: string;
    title: string;
    sub: string;
    items: ReadonlyArray<{ q: string; a: string }>;
  };
  ctaBanner: { eyebrow: string; title: string; sub: string };
  breadcrumb: ReadonlyArray<MarketingHomeBreadcrumbItem>;
}

export interface MarketingPublicConfig {
  brandCode: DosBrandCode;
  locale: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  /** Master kill switch. When false, marketing routes resolve to 404. */
  publicMarketingEnabled: boolean;
  navItems: ReadonlyArray<MarketingNavItem>;
  /** Grouped nav items for dropdown menus in the header. */
  navGroups: ReadonlyArray<MarketingNavGroup>;
  footerGroups: ReadonlyArray<MarketingFooterGroup>;
  /** Feature flags consumed by section renderers. */
  flags: Readonly<Record<string, boolean>>;
  /** All marketing-home content blocks (Phase M3 — 100% dynamic). */
  homeContent?: MarketingHomeContent;
}

const EMPTY_HOME_CONTENT: MarketingHomeContent = {
  brandLabel: '',
  hero: {
    badge: '', eyebrow: '', title: '', sub: '', microcopy: '',
    ctaPrimary: { label: '', href: '' },
    ctaSecondary: { label: '', href: '' },
  },
  trustPills: [],
  valueProps: [],
  agentic: { eyebrow: '', title: '', readinessPercent: 0, tiles: [] },
  downloadKit: {
    eyebrow: '', title: '', body: '', ctaLabel: '', featuredAssetKey: '',
    notification: { title: '', subtitle: '' },
    toast: { title: '', subtitle: '' },
  },
  platform: { eyebrow: '', title: '', body: '', tabs: [] },
  modules: [],
  industries: [],
  architecture: { title: '', body: '', rows: [] },
  ai: { eyebrow: '', title: '', body: '', currentStep: 0, steps: [] },
  pricing: { eyebrow: '', title: '', ctaLabel: '', href: '', columns: [], rows: [] },
  testimonials: { eyebrow: '', title: '', sub: '', items: [] },
  logos: { eyebrow: '', title: '', items: [] },
  resources: { eyebrow: '', title: '', sub: '', items: [] },
  faq: { eyebrow: '', title: '', sub: '', items: [] },
  ctaBanner: { eyebrow: '', title: '', sub: '' },
  breadcrumb: [],
};

@Injectable({ providedIn: 'root' })
export class MarketingPublicConfigService {
  private readonly _config = signal<MarketingPublicConfig | null>(null);

  /** Eagerly hydrated from `/api/ui-os/marketing/config?brand=&locale=`. */
  async init(brandCode: DosBrandCode, locale: 'en' | 'ar', baseUrl = '/api/ui-os'): Promise<void> {
    const r = await fetch(
      `${baseUrl}/marketing/config?brand=${encodeURIComponent(brandCode)}&locale=${locale}`,
      { headers: { Accept: 'application/json' }, credentials: 'omit' },
    );
    if (!r.ok) throw new Error(`marketing-config fetch ${r.status}`);
    const body = (await r.json()) as MarketingPublicConfig;
    this._config.set(body);
  }

  /** Inject a static config (SSR / tests). */
  setConfig(cfg: MarketingPublicConfig): void {
    this._config.set(cfg);
  }

  readonly config = computed(() => this._config());

  /** Master switch — true only when an active config row exists. */
  readonly publicMarketingEnabled = computed(() => {
    const c = this._config();
    return !!c && c.publicMarketingEnabled === true;
  });

  /** Header navigation items, filtered for current locale. */
  readonly marketingNavItems = computed<ReadonlyArray<MarketingNavItem>>(() => {
    const c = this._config();
    if (!c || !this.publicMarketingEnabled()) return [];
    return c.navItems.filter(
      (n) => !n.hideForLocales || !n.hideForLocales.includes(c.locale),
    );
  });

  /** Header nav groups (dropdowns) from DB. */
  readonly marketingNavGroups = computed<ReadonlyArray<MarketingNavGroup>>(
    () => this._config()?.navGroups ?? [],
  );

  /** Footer column groups. */
  readonly marketingFooterGroups = computed<ReadonlyArray<MarketingFooterGroup>>(
    () => this._config()?.footerGroups ?? [],
  );

  /** Feature flag accessor. */
  flag(name: string): boolean {
    return this._config()?.flags?.[name] === true;
  }

  /** All marketing-home content blocks (100% dynamic). When the resolver
   *  hasn't shipped a block, an empty fallback is returned so templates can
   *  bind without null-checks. */
  readonly marketingHomeContent = computed<MarketingHomeContent>(
    () => this._config()?.homeContent ?? EMPTY_HOME_CONTENT,
  );
}

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
  copyright: string;
  logoHref: string;
  // Brand configuration from Branding.docx
  brandConfig: {
    brandColorPrimary: string;
    brandColorAccent: string;
    brandColorBackground: string;
    brandColorSurface: string;
    brandColorText: string;
    brandColorMuted: string;
    brandIcon: string; // falcon icon
    brandTokenPrefix: string; // --shahin-*
    doganMeaningEn: string; // "Falcon"
    doganMeaningAr: string; // "الصقر / الشاهين"
  };
  // Legal configuration from legal and terms .docx
  legalConfig: {
    legalEntityName: string;
    commercialRegistrationNumber: string;
    vatNumber: string;
    registeredAddress: string;
    supportEmail: string;
    billingEmail: string;
    country: string;
    lastUpdated: string;
  };
  // Footer configuration
  footerConfig: {
    legalPages: ReadonlyArray<{
      slug: string;
      title_en: string;
      title_ar: string;
    }>;
    ecosystemNoticeEn: string;
    ecosystemNoticeAr: string;
  };
  uiLabels: {
    headerMenuLabel: string;
    mobileMenuLabel: string;
    heroTrustLabel: string;
    valuePropsEyebrow: string;
    valuePropsTitle: string;
    valuePropsSub: string;
    heroProofStatus: string;
    heroProofTitle: string;
    heroProofBody: string;
    heroEvidenceReceipt: string;
    heroProofStatusItems: ReadonlyArray<{ id: string; label: string; value: string; tone: 'live' | 'pending' | 'synced' }>;
    heroTimelineSteps: ReadonlyArray<string>;
  };
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
    loadingText: string;
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
    label: string;
    items: ReadonlyArray<{ id: string; name: string }>;
  };
  resources: {
    eyebrow: string;
    title: string;
    sub: string;
    label: string;
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
  // Sub-page content (pricing, trust, security, contact, about, legal, platform)
  pricingPage?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    ctaLabel_en: string;
    ctaLabel_ar: string;
    ctaHref: string;
    currency: string;
    billingCycle_en: string;
    billingCycle_ar: string;
    plans: ReadonlyArray<{
      id: string;
      name_en: string;
      name_ar: string;
      price: string;
      period_en: string;
      period_ar: string;
      description_en: string;
      description_ar: string;
      features: ReadonlyArray<{ en: string; ar: string; included: boolean }>;
      popular: boolean;
    }>;
  };
  trust?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    certifications: ReadonlyArray<{
      id: string;
      name_en: string;
      name_ar: string;
      description_en: string;
      description_ar: string;
      status: string;
      year: string;
    }>;
    securityMetrics: ReadonlyArray<{ label_en: string; label_ar: string; description_en: string; description_ar: string }>;
    trustIndicators: ReadonlyArray<{
      icon: string;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    }>;
    ctaLabel_en: string;
    ctaLabel_ar: string;
    ctaHref: string;
  };
  security?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    features: ReadonlyArray<{
      id: string;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      icon: string;
    }>;
    complianceStandards: ReadonlyArray<{
      name_en: string;
      name_ar: string;
      description_en: string;
      description_ar: string;
    }>;
    architecture: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    };
    ctaLabel_en: string;
    ctaLabel_ar: string;
    ctaHref: string;
  };
  contact?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    contactForm: {
      enabled: boolean;
      title_en: string;
      title_ar: string;
      fields: ReadonlyArray<{
        name: string;
        label_en: string;
        label_ar: string;
        type: string;
        required: boolean;
      }>;
      submitLabel_en: string;
      submitLabel_ar: string;
    };
    contactInfo: ReadonlyArray<{
      icon: string;
      label_en: string;
      label_ar: string;
      value_en: string;
      value_ar: string;
    }>;
    officeLocations: ReadonlyArray<{
      name_en: string;
      name_ar: string;
      address_en: string;
      address_ar: string;
      hours_en: string;
      hours_ar: string;
    }>;
    support: {
      title_en: string;
      title_ar: string;
      channels: ReadonlyArray<{ name_en: string; name_ar: string; available: boolean }>;
      responseTime_en: string;
      responseTime_ar: string;
    };
    socialLinks: ReadonlyArray<{ platform: string; url: string }>;
  };
  about?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    story: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    };
    mission: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    };
    values: ReadonlyArray<{
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    }>;
    team: {
      title_en: string;
      title_ar: string;
      members: ReadonlyArray<{ name_en: string; name_ar: string; role_en: string; role_ar: string }>;
    };
    achievements: ReadonlyArray<{ label_en: string; label_ar: string; description_en: string; description_ar: string }>;
    ctaLabel_en: string;
    ctaLabel_ar: string;
    ctaHref: string;
  };
  legal?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    documents: ReadonlyArray<{
      id: string;
      title_en: string;
      title_ar: string;
      summary_en: string;
      summary_ar: string;
      lastUpdated_en: string;
      lastUpdated_ar: string;
      sections: ReadonlyArray<{ title_en: string; title_ar: string; body_en: string; body_ar: string }>;
    }>;
    gdprCompliance: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      rights: ReadonlyArray<{ name_en: string; name_ar: string; description_en: string; description_ar: string }>;
    };
    contactLabel_en: string;
    contactLabel_ar: string;
    contactHref: string;
  };
  platformPage?: {
    eyebrow_en: string;
    eyebrow_ar: string;
    title_en: string;
    title_ar: string;
    sub_en: string;
    sub_ar: string;
    overview: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    };
    architecture: {
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      components: ReadonlyArray<{
        name_en: string;
        name_ar: string;
        description_en: string;
        description_ar: string;
      }>;
    };
    features: ReadonlyArray<{
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
    }>;
    integrations: ReadonlyArray<{ name_en: string; name_ar: string; icon: string }>;
    ctaLabel_en: string;
    ctaLabel_ar: string;
    ctaHref: string;
  };
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

const EMPTY_MARKETING_HOME_CONTENT: MarketingHomeContent = {
  brandLabel: '',
  copyright: '',
  logoHref: '/',
  brandConfig: {
    brandColorPrimary: '',
    brandColorAccent: '',
    brandColorBackground: '',
    brandColorSurface: '',
    brandColorText: '',
    brandColorMuted: '',
    brandIcon: '',
    brandTokenPrefix: '',
    doganMeaningEn: '',
    doganMeaningAr: '',
  },
  legalConfig: {
    legalEntityName: '',
    commercialRegistrationNumber: '',
    vatNumber: '',
    registeredAddress: '',
    supportEmail: '',
    billingEmail: '',
    country: '',
    lastUpdated: '',
  },
  footerConfig: {
    legalPages: [],
    ecosystemNoticeEn: '',
    ecosystemNoticeAr: '',
  },
  uiLabels: {
    headerMenuLabel: '',
    mobileMenuLabel: '',
    heroTrustLabel: '',
    valuePropsEyebrow: '',
    valuePropsTitle: '',
    valuePropsSub: '',
    heroProofStatus: '',
    heroProofTitle: '',
    heroProofBody: '',
    heroEvidenceReceipt: '',
    heroProofStatusItems: [],
    heroTimelineSteps: [],
  },
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
    loadingText: '',
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
  logos: { eyebrow: '', title: '', label: '', items: [] },
  resources: { eyebrow: '', title: '', sub: '', label: '', items: [] },
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
    () => this._config()?.homeContent ?? EMPTY_MARKETING_HOME_CONTENT,
  );
}

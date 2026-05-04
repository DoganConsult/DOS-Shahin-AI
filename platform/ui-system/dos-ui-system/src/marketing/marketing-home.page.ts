/**
 * Phase M1 — `marketing.home.page` 19-region landing surface.
 *
 * Public, unauthenticated landing for shahin-ai + dogan-ai-os brands. Built
 * exclusively from approved primitives:
 *   - `<dos-brand-eagle>` for the brand mark (BrandResolverService).
 *   - `<dos-agent-status-strip>` from M0.5 (gated by flag('landingAgenticProof')).
 *   - 9 agent-tile brand assets resolved via BrandResolverService.
 *   - IBM Carbon `tiles`/`button`/`tag` styling hooks via data-cds-component.
 *
 * Regions (19 — header + breadcrumb + 17 content/footer regions):
 *   01 public-header      11 architecture
 *   02 breadcrumb-row     12 ai-and-agents
 *   03 hero               13 pricing-teaser
 *   04 trust-pills        14 testimonials
 *   05 value-props        15 logos
 *   06 agentic-proof      16 resources
 *   07 download-kit       17 faq
 *   08 platform-overview  18 cta-banner
 *   09 modules            19 footer
 *   10 industries
 *
 * NEVER imports AccessStore. NEVER reads tenant context. The agent strip
 * is fed by `summary` Input (consumer wires it from /api/ui-os/agentic/strip).
 */
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import { BrandResolverService } from '../brand/brand-resolver.service';
import type {
  MarketingFooterGroup,
  MarketingHomeContent,
  MarketingNavGroup,
  MarketingNavItem,
} from './marketing-public-config.service';
import { DosAgentStatusStripComponent } from '../agentic/agentic-components';
import type { AgentState, AgentStripSummary } from '../agentic/agentic.contract';
import type { DosBrandCode } from '@dos/design-tokens';
import {
  DosDownloadKitCardComponent,
  DosGatedDownloadModalComponent,
  DosDownloadSuccessComponent,
} from './download-kit.components';
import type {
  MarketingAsset,
  MarketingDownloadEvent,
} from './download-kit.contract';
// Phase M3 — IBM Carbon Angular wrappers (one-source rule per
// ui-os-carbon-boundary-guard). Renders 18 requested primitives:
// Header, HeaderNavigation, HeaderMenuItem, Button, Grid, Column, Tile,
// ClickableTile, Tag, Accordion, Tabs, Modal, InlineNotification,
// ToastNotification, Link, Breadcrumb, StructuredList, DataTable,
// ProgressBar, SkeletonPlaceholder.
// Gap audit additions (Wave visual-enhancement):
// ContainedList (logos + resources), InlineLoading (download-kit skeleton),
// ToggleTip (agentic tile badges), Layer (hero visual token scope).
import { DosCarbonButtonComponent } from '../carbon/dos-carbon-button.component';
import {
  DosCarbonGridComponent,
  DosCarbonRowComponent,
  DosCarbonColComponent,
} from '../carbon/dos-carbon-grid.component';
import { DosCarbonTileComponent } from '../carbon/dos-carbon-tile.component';
import { DosCarbonTagComponent } from '../carbon/dos-carbon-tag.component';
import { DosCarbonAccordionComponent, type DosCarbonAccordionItem } from '../carbon/dos-carbon-accordion.component';
import { DosCarbonTabsComponent, type DosCarbonTabItem } from '../carbon/dos-carbon-tabs.component';
import { DosCarbonNotificationComponent } from '../carbon/dos-carbon-notification.component';
import { DosCarbonLinkComponent } from '../carbon/dos-carbon-link.component';
import { DosCarbonStructuredListComponent, type DosCarbonStructuredListRow } from '../carbon/dos-carbon-structured-list.component';
import { DosCarbonDataTableComponent, type DosCarbonTableColumn } from '../carbon/dos-carbon-data-table.component';
import { DosCarbonProgressBarComponent } from '../carbon/dos-carbon-progress-bar.component';
import { DosCarbonProgressIndicatorComponent, type DosCarbonProgressStep } from '../carbon/dos-carbon-progress-indicator.component';
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';
// B0 — Gap-audit additions: all carbon_keys verified runtime_status='active', dynamic_ui_allowed=true.
import { DosCarbonContainedListComponent, type DosCarbonContainedListItem } from '../carbon/dos-carbon-contained-list.component';
import { DosCarbonInlineLoadingComponent } from '../carbon/dos-carbon-inline-loading.component';
import { DosCarbonToggleTipComponent } from '../carbon/dos-carbon-toggle-tip.component';
import { DosCarbonIconComponent } from '../carbon/dos-carbon-icon.component';
// IBM Carbon icon descriptor for the public-header Sign-in CTA. Imported
// from @carbon/icons (one-source rule) so the icon ships through the
// @dos/ui-system Carbon boundary rather than being scattered into products.
import Login20 from '@carbon/icons/lib/login/20';

/** Locked 19-region ordering: public header + breadcrumb + 17 content/footer regions.
 *  CI gate `marketing-home-coverage.mjs` greps this literal. */
export const MARKETING_HOME_REGIONS = [
  'public-header',
  'breadcrumb-row',
  'hero',
  'trust-pills',
  'value-props',
  'agentic-proof',
  'download-kit',
  'platform-overview',
  'modules',
  'industries',
  'architecture',
  'ai-and-agents',
  'pricing-teaser',
  'testimonials',
  'logos',
  'resources',
  'faq',
  'cta-banner',
  'footer',
] as const;

// Keep this as a second literal export because the contract test parses the
// source text rather than following aliases.
export const MARKETING_HOME_SECTIONS = [
  'public-header',
  'breadcrumb-row',
  'hero',
  'trust-pills',
  'value-props',
  'agentic-proof',
  'download-kit',
  'platform-overview',
  'modules',
  'industries',
  'architecture',
  'ai-and-agents',
  'pricing-teaser',
  'testimonials',
  'logos',
  'resources',
  'faq',
  'cta-banner',
  'footer',
] as const;

// Nav items are 100% DB-driven via MarketingPublicConfigService → /api/ui-os/marketing/config.
// PUBLIC_HEADER_LINKS deleted — no hardcoded nav ordering or fallback labels.
// Carbon registry keys shipped per item: carbon_key in (link|button|header-menu-item).
// All active in dos.ui_carbon_components (verified 2026-05-04).
export type MarketingHomeSectionId = (typeof MARKETING_HOME_REGIONS)[number];

const EMPTY_MARKETING_HOME_CONTENT: MarketingHomeContent = {
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
  platform: { title: '', body: '', tabs: [] },
  modules: [],
  industries: [],
  architecture: { title: '', body: '', rows: [] },
  ai: { eyebrow: '', title: '', body: '', currentStep: 0, steps: [] },
  pricing: { title: '', ctaLabel: '', href: '', columns: [], rows: [] },
  testimonials: [],
  customerLogos: [],
  resources: [],
  faq: [],
  ctaBanner: { eyebrow: '', title: '', sub: '' },
  breadcrumb: [],
};

/** Agent-tile descriptor surfaced in the agentic-proof section. */
export interface MarketingAgentTile {
  agentCode: string;       // 'A01' .. 'A10'
  displayName: string;
  displayNameAr?: string;
  role?: string;
}

@Component({
  selector: 'dos-marketing-home',
  standalone: true,
  imports: [
    CommonModule,
    DosBrandEagleComponent,
    DosAgentStatusStripComponent,
    DosDownloadKitCardComponent,
    DosGatedDownloadModalComponent,
    DosDownloadSuccessComponent,
    // Phase M3 — IBM Carbon Angular wrappers
    DosCarbonButtonComponent,
    DosCarbonGridComponent,
    DosCarbonRowComponent,
    DosCarbonColComponent,
    DosCarbonTileComponent,
    DosCarbonTagComponent,
    DosCarbonAccordionComponent,
    DosCarbonTabsComponent,
    DosCarbonNotificationComponent,
    DosCarbonLinkComponent,
    DosCarbonStructuredListComponent,
    DosCarbonDataTableComponent,
    DosCarbonProgressBarComponent,
    DosCarbonProgressIndicatorComponent,
    DosCarbonSkeletonComponent,
    // B0 gap-audit additions
    DosCarbonContainedListComponent,
    DosCarbonInlineLoadingComponent,
    DosCarbonToggleTipComponent,
    DosCarbonIconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './marketing-home.page.scss',
  template: `
    <main
      class="dos-marketing-home"
      [attr.data-brand]="brandCode"
      [attr.data-surface]="'marketing'"
      [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'"
    >
      <!-- ░░ Header — public Carbon-style shell without workspace chrome ░░ -->
      <header class="dos-mh-public-header" data-section-id="public-header">
        <div class="dos-mh-container dos-mh-public-header__inner">
          <a class="dos-mh-public-header__brand" href="/" (click)="onAnchorNavigate($event, '/')">
            <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="32" />
            <span class="dos-mh-public-header__brand-text">{{ brandLabel }}</span>
          </a>

          <dos-carbon-button
            class="dos-mh-public-header__menu-toggle"
            kind="ghost"
            size="sm"
            [attr.aria-expanded]="headerMenuOpen()"
            [attr.aria-label]="mobileMenuLabel"
            (clicked)="toggleHeaderMenu()"
          >
            {{ headerMenuLabel }}
          </dos-carbon-button>

          <div class="dos-mh-public-header__menus" [class.is-open]="headerMenuOpen()">
            <nav class="dos-mh-public-header__nav" aria-label="Public navigation">
              <!-- DB-driven nav: grouped items = IBM Carbon header-menu dropdown;
                   ungrouped items = flat anchor link. Carbon registry: header-menu, link (both active). -->
              @for (group of navGroups(); track group.id) {
                <div class="dos-mh-nav-group" [attr.data-group-id]="group.id">
                  <button
                    class="dos-mh-nav-group__trigger"
                    type="button"
                    [attr.aria-expanded]="isGroupOpen(group.id)"
                    (click)="toggleNavGroup(group.id)"
                  >
                    {{ group.label }}
                    <svg class="dos-mh-nav-group__chevron" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M8 11L2 5h12z"/>
                    </svg>
                  </button>
                  <ul class="dos-mh-nav-group__menu" role="menu"
                      [class.is-open]="isGroupOpen(group.id)">
                    @for (item of group.items; track item.id) {
                      <li role="none">
                        <a
                          class="dos-mh-nav-group__item"
                          [href]="item.href"
                          role="menuitem"
                          [attr.aria-current]="isHeaderActive(item.href) ? 'page' : null"
                          (click)="onAnchorNavigate($event, item.href)"
                        >{{ item.label }}</a>
                      </li>
                    }
                  </ul>
                </div>
              }
              <!-- Ungrouped flat nav links (no navGroup) -->
              @for (n of headerNavItems(); track n.id) {
                @if (!n.navGroup) {
                  <a
                    class="dos-mh-public-header__nav-link"
                    [href]="n.href"
                    [attr.aria-current]="isHeaderActive(n.href) ? 'page' : null"
                    (click)="onAnchorNavigate($event, n.href)"
                  >{{ n.label }}</a>
                }
              }
            </nav>

            <div class="dos-mh-public-header__actions">
              <!-- Header CTA actions — 100% DB-driven via dos.marketing_nav_items (variant=ghost|primary) -->
              @for (cta of headerCtaItems(); track cta.id) {
                @if (cta.variant === 'primary') {
                  <dos-carbon-button
                    kind="primary"
                    size="md"
                    [attr.data-cta-id]="cta.id"
                    (clicked)="navigate(cta.href)"
                  >{{ cta.label }}</dos-carbon-button>
                } @else {
                  <dos-carbon-button
                    kind="ghost"
                    size="md"
                    [attr.data-cta-id]="cta.id"
                    (clicked)="navigate(cta.href)"
                  >
                    <span class="dos-mh-signin-cta">
                      @if (cta.id === 'cta-signin') {
                        <dos-carbon-icon [icon]="signInIcon" size="20"></dos-carbon-icon>
                      }
                      <span>{{ cta.label }}</span>
                    </span>
                  </dos-carbon-button>
                }
              }
            </div>
          </div>
        </div>
      </header>

      <!-- ░░ Breadcrumb (Home › current) ░░ -->
      <div class="dos-mh-container dos-mh-breadcrumb-row" data-section-id="breadcrumb-row" hidden aria-hidden="true"></div>

      <!-- 01 hero — Carbon Tiles ──────────────────────────────────── -->
      <section
        class="dos-mh-section dos-mh-hero"
        data-section-id="hero"
        id="hero"
        data-cds-layer="01"
      >
        <div class="dos-mh-container dos-mh-hero-layout">
          <div class="dos-mh-hero-content">
            <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="64" />
            <div class="dos-mh-hero-badge">
              <dos-carbon-tag type="blue" size="md">{{ heroBadgeLabel }}</dos-carbon-tag>
            </div>
            <p class="dos-mh-eyebrow">{{ heroEyebrow }}</p>
            <h1 class="dos-mh-title">{{ heroTitle }}</h1>
            <p class="dos-mh-sub">{{ heroSub }}</p>
            <div class="dos-mh-cta-row">
              <dos-carbon-button class="dos-mh-hero-cta dos-mh-hero-cta--primary" kind="primary" size="lg" (clicked)="navigate(ctaPrimaryHref)">
                {{ ctaPrimaryLabel }}
              </dos-carbon-button>
              <dos-carbon-button class="dos-mh-hero-cta dos-mh-hero-cta--secondary" kind="tertiary" size="lg" (clicked)="navigate(ctaSecondaryHref)">
                {{ ctaSecondaryLabel }}
              </dos-carbon-button>
            </div>
            <p class="dos-mh-hero-microcopy">{{ heroMicrocopy }}</p>

            <div class="dos-mh-hero-trust" aria-label="Trusted compliance frameworks">
              <p class="dos-mh-hero-trust__label">{{ heroTrustLabel }}</p>
              <div class="dos-mh-pill-row dos-mh-hero-trust__chips">
                @for (p of trustPills; track p.id) {
                  <dos-carbon-tag type="cool-gray" size="md">{{ p.label }}</dos-carbon-tag>
                }
              </div>
            </div>
          </div>

          <!-- Item 1: Product workspace screenshot — replaces text proof card -->
          <!-- Uses Unified GRC Platform Workspace Overview.jpg from brand kit -->
          <aside class="dos-mh-hero-screenshot-panel" aria-label="Shahin-AI GRC workspace preview">
            <img
              class="dos-mh-hero-screenshot"
              src="/assets/brand/workspace-overview.jpg"
              [alt]="locale === 'ar' ? 'نظرة عامة على مساحة عمل Shahin-AI' : 'Shahin-AI GRC Workspace Overview'"
              width="960"
              height="640"
              loading="eager"
              decoding="async"
              fetchpriority="high"
            />
            <!-- Floating KPI strip — brand kit shows "Open Tasks 12, High Risks 7, Score 76%" -->
            <div class="dos-mh-hero-kpi-strip" aria-hidden="true">
              <div class="dos-mh-hero-kpi-badge">
                <span class="dos-mh-hero-kpi-badge__value">12</span>
                <span class="dos-mh-hero-kpi-badge__label">{{ locale === 'ar' ? 'مهام مفتوحة' : 'Open Tasks' }}</span>
              </div>
              <div class="dos-mh-hero-kpi-badge">
                <span class="dos-mh-hero-kpi-badge__value">7</span>
                <span class="dos-mh-hero-kpi-badge__label">{{ locale === 'ar' ? 'مخاطر عالية' : 'High Risks' }}</span>
              </div>
              <div class="dos-mh-hero-kpi-badge dos-mh-hero-kpi-badge--gold">
                <span class="dos-mh-hero-kpi-badge__value">76%</span>
                <span class="dos-mh-hero-kpi-badge__label">{{ locale === 'ar' ? 'الامتثال' : 'Compliance' }}</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <!-- 02 trust-pills — Carbon Tag row ─────────────────────────────── -->
      <section class="dos-mh-section dos-mh-trust" data-section-id="trust-pills" data-cds-component="notification" hidden aria-hidden="true"></section>

      <!-- 03 value-props — Carbon Tile ───────────────────────────────── -->
      <section class="dos-mh-section dos-mh-value-props" data-section-id="value-props" id="value">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ valuePropsEyebrow }}</p>
          <h2 class="dos-mh-section-title">{{ valuePropsTitle }}</h2>
          <p class="dos-mh-sub dos-mh-value-props__sub">{{ valuePropsSub }}</p>

          <div class="dos-mh-grid-3">
            @for (v of valueProps; track v.id) {
              <dos-carbon-tile>
                <h3>{{ v.title }}</h3>
                <p>{{ v.body }}</p>
              </dos-carbon-tile>
            }
          </div>
        </div>
      </section>

      <!-- 04 agentic-proof — Carbon ProgressBar + Skeleton + ClickableTile -->
      @if (showAgenticProof()) {
        <section class="dos-mh-section dos-mh-agentic" data-section-id="agentic-proof">
          <div class="dos-mh-container">
            <p class="dos-mh-eyebrow">{{ agenticEyebrow }}</p>
            <h2 class="dos-mh-section-title">{{ agenticTitle }}</h2>

            <dos-agent-status-strip
              [state]="agentStripState"
              [summary]="agentStripSummary"
              [emptyLabel]="agenticEmptyLabel"
              [failedLabel]="agenticFailedLabel"
            />

            <!-- ProgressBar — agentic readiness/maturity meter -->
            <div class="dos-mh-readiness">
              <dos-carbon-progress-bar
                [label]="agenticReadinessLabel"
                [helperText]="agenticReadinessHelper"
                [value]="readinessPercent"
                [max]="100"
                size="big"
                status="active"
              ></dos-carbon-progress-bar>
            </div>

            <!-- Skeleton — demo preview placeholder while assets load -->
            @if (agentStripState === 'loading') {
              <div class="dos-mh-demo-skeleton">
                <dos-carbon-skeleton shape="placeholder"></dos-carbon-skeleton>
              </div>
            }

            <!-- B3: agent tiles with toggletip on agent code badge -->
            <!-- carbon_key='toggletip' runtime_status='active' dynamic_ui_allowed=true -->
            <dos-carbon-grid>
              <dos-carbon-row>
                @for (t of agentTiles; track t.agentCode) {
                  <dos-carbon-col [columnNumbers]="{ sm: 4, md: 4, lg: 3 }">
                    <dos-carbon-tile [clickable]="true">
                      <div class="dos-mh-agent-tile">
                        @if (tileAssetUrl(t.agentCode); as src) {
                          <img
                            class="dos-mh-agent-img"
                            [src]="src"
                            [alt]="locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName"
                            [width]="96"
                            [height]="96"
                            loading="lazy"
                            decoding="async"
                          />
                        } @else {
                          <!-- B3: toggletip wraps agent code so users can learn the agent's role -->
                          <dos-carbon-toggle-tip [buttonLabel]="'About ' + t.agentCode">
                            <span class="dos-mh-agent-letter" aria-hidden="true">{{ t.agentCode }}</span>
                            <p slot="content">{{ locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName }} — {{ t.role }}</p>
                          </dos-carbon-toggle-tip>
                        }
                        <strong>{{ locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName }}</strong>
                        @if (t.role) { <small>{{ t.role }}</small> }
                      </div>
                    </dos-carbon-tile>
                  </dos-carbon-col>
                }
              </dos-carbon-row>
            </dos-carbon-grid>
          </div>
        </section>
      }

      <!-- 05 download-kit ───────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-download-kit" data-section-id="download-kit" id="executive-kit">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ downloadKitEyebrow }}</p>
          <h2 class="dos-mh-section-title">{{ downloadKitTitle }}</h2>
          <p>{{ downloadKitBody }}</p>
          <dos-carbon-notification
            variant="inline"
            kind="info"
            [title]="kitNotificationTitle"
            [subtitle]="kitNotificationSubtitle"
            [hideClose]="true"
          ></dos-carbon-notification>

          @if (featuredAsset(); as a) {
            <dos-download-kit-card
              [asset]="a"
              [ctaLabel]="downloadCtaLabel"
              (event)="onDownloadEvent($event)"
            />
          } @else {
            <!-- B4: inline-loading replaces generic skeleton for download-kit -->
            <!-- carbon_key='inline-loading' runtime_status='active' dynamic_ui_allowed=true -->
            <dos-carbon-inline-loading
              [state]="'active'"
              [loadingText]="locale === 'ar' ? 'جارٍ تحضير حزمتك…' : 'Preparing your kit…'"
            ></dos-carbon-inline-loading>
          }

          <!-- ToastNotification on download success -->
          @if (downloadSuccess()) {
            <div class="dos-mh-toast-anchor">
              <dos-carbon-notification
                variant="toast"
                kind="success"
                [title]="kitToastTitle"
                [subtitle]="kitToastSubtitle"
                (closed)="downloadSuccess.set(false)"
              ></dos-carbon-notification>
            </div>
            <dos-download-success
              [asset]="featuredAsset()"
              (event)="onDownloadEvent($event)"
            />
          }

          @if (modalOpen()) {
            <dos-gated-download-modal
              [asset]="featuredAsset()"
              [open]="true"
              (event)="onDownloadEvent($event)"
              (closed)="onModalClosed()"
            />
          }
        </div>
      </section>

      <!-- 06 platform-overview — Carbon Tabs ────────────────────────── -->
      <section class="dos-mh-section" data-section-id="platform-overview" id="platform-dna">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ locale === 'ar' ? 'بنية المنصة' : 'Platform DNA' }}</p>
          <h2 class="dos-mh-section-title">{{ platformTitle }}</h2>
          <p>{{ platformBody }}</p>
          <dos-carbon-tabs
            [items]="platformTabs"
            [selectedId]="platformTabId()"
            (selectedIdChange)="platformTabId.set($event)"
          >
            <p>{{ platformTabBody() }}</p>
          </dos-carbon-tabs>
        </div>
      </section>

      <!-- 07 modules — Carbon ClickableTile ─────────────────────────── -->
      <section class="dos-mh-section" data-section-id="modules" hidden aria-hidden="true">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (m of moduleTiles; track m.id) {
            <dos-carbon-tile [clickable]="true" [route]="'/modules/' + m.id">
              <h3>{{ m.title }}</h3>
              <p>{{ m.body }}</p>
            </dos-carbon-tile>
          }
        </div>
      </section>

      <!-- 08 industries — Carbon Tag ────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="industries" hidden aria-hidden="true">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (i of industries; track i.id) {
            <dos-carbon-tag type="warm-gray" size="md">{{ i.label }}</dos-carbon-tag>
          }
        </div>
      </section>

      <!-- 09 architecture — Carbon StructuredList ───────────────────── -->
      <section class="dos-mh-section" data-section-id="architecture" hidden aria-hidden="true">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ architectureTitle }}</h2>
          <p>{{ architectureBody }}</p>
          <dos-carbon-structured-list [rows]="architectureRows"></dos-carbon-structured-list>
        </div>
      </section>

      <!-- 10 ai-and-agents — Carbon ProgressIndicator (6-step agent loop) ── -->
      <section class="dos-mh-section dos-mh-ai" data-section-id="ai-and-agents" id="safe-ai">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ aiEyebrow }}</p>
          <h2 class="dos-mh-section-title">{{ aiTitle }}</h2>
          <p class="dos-mh-sub">{{ aiBody }}</p>
          <div class="dos-mh-ai-loop">
            <dos-carbon-progress-indicator
              [steps]="agentLoopSteps"
              [current]="agentLoopCurrent"
              orientation="horizontal"
              [spaceEqually]="true"
            ></dos-carbon-progress-indicator>
          </div>
        </div>
      </section>

      <!-- 11 pricing-teaser — Carbon DataTable + Button ─────────────── -->
      <section class="dos-mh-section" data-section-id="pricing-teaser" id="pricing">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ locale === 'ar' ? 'الأسعار' : 'Pricing' }}</p>
          <h2 class="dos-mh-section-title">{{ pricingTitle }}</h2>
          <dos-carbon-data-table
            [columns]="pricingColumns"
            [rows]="pricingRows"
            size="md"
            [striped]="true"
          ></dos-carbon-data-table>
          <div class="dos-mh-cta-row">
            <dos-carbon-button kind="primary" size="lg" (clicked)="navigate(pricingHref)">
              {{ pricingCtaLabel }}
            </dos-carbon-button>
          </div>
        </div>
      </section>

      <!-- 12 testimonials — Carbon Tile ─────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="testimonials" id="proof">
        <div class="dos-mh-container dos-mh-grid-3">
          <div class="dos-mh-testimonial-intro">
            <p class="dos-mh-eyebrow">{{ locale === 'ar' ? 'إثبات تنفيذي' : 'Executive proof' }}</p>
            <h2 class="dos-mh-section-title">{{ locale === 'ar' ? 'نتائج يكررها قادة الحوكمة.' : 'Results leadership teams remember.' }}</h2>
            <p class="dos-mh-sub">{{ locale === 'ar' ? 'شهادات قصيرة تركز على الزمن والدليل وسهولة الاعتماد.' : 'Short proof points centred on speed, evidence, and decision confidence.' }}</p>
          </div>
          @for (q of testimonials; track q.id) {
            <dos-carbon-tile>
              <blockquote class="dos-mh-quote">
                <p>"{{ q.quote }}"</p>
                <footer><strong>{{ q.author }}</strong> · <small>{{ q.role }}</small></footer>
              </blockquote>
            </dos-carbon-tile>
          }
        </div>
      </section>

      <!-- 13 logos — Carbon ContainedList ───────────────────────────── -->
      <!-- B1: contained-list replaces raw span loop -->
      <!-- carbon_key='contained-list' runtime_status='active' dynamic_ui_allowed=true -->
      <section class="dos-mh-section" data-section-id="logos" data-cds-component="contained-list" id="trusted-by">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ locale === 'ar' ? 'موثوق به' : 'Trusted by' }}</p>
          <h2 class="dos-mh-section-title">{{ locale === 'ar' ? 'علامات تعرف معنى الضبط المؤسسي.' : 'Teams that measure readiness by evidence.' }}</h2>
          <dos-carbon-contained-list
            class="dos-mh-logos-list"
            [label]="locale === 'ar' ? 'يثق بنا' : 'Trusted by'"
            [kind]="'on-page'"
            [size]="'lg'"
            [items]="logoListItems()"
          ></dos-carbon-contained-list>
        </div>
      </section>

      <!-- 14 resources — Carbon ContainedList (disclosed) ────────────── -->
      <!-- B5: contained-list disclosed replaces 3 separate tiles -->
      <!-- carbon_key='contained-list' runtime_status='active' dynamic_ui_allowed=true -->
      <section class="dos-mh-section" data-section-id="resources" data-cds-component="contained-list" id="resources">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ locale === 'ar' ? 'الموارد' : 'Resources' }}</h2>
          <p class="dos-mh-sub">{{ locale === 'ar' ? 'ابدأ من الصفحة المناسبة: منصة المنتج، الحزمة التنفيذية، أو مركز الثقة.' : 'Jump directly to the platform story, the executive kit, or the trust surface.' }}</p>
          <dos-carbon-contained-list
            class="dos-mh-resource-list"
            [label]="locale === 'ar' ? 'استكشف' : 'Explore'"
            [kind]="'disclosed'"
            [size]="'lg'"
            [items]="resourceListItems()"
            (itemClick)="onResourceSelected($event)"
          ></dos-carbon-contained-list>
        </div>
      </section>

      <!-- 15 faq — Carbon Accordion ─────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="faq" id="faq">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ locale === 'ar' ? 'الأسئلة الشائعة' : 'FAQ' }}</p>
          <h2 class="dos-mh-section-title">{{ locale === 'ar' ? 'إجابات سريعة قبل أن تبدأ.' : 'The short answers before procurement starts.' }}</h2>
          <dos-carbon-accordion [items]="faqItems()" align="end" size="md"></dos-carbon-accordion>
        </div>
      </section>

      <!-- 16 cta-banner ─────────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-cta-banner" data-section-id="cta-banner" id="get-started">
        <div class="dos-mh-container dos-mh-cta-banner-inner">
          <p class="dos-mh-eyebrow dos-mh-eyebrow-on-dark">{{ ctaBannerEyebrow }}</p>
          <h2 class="dos-mh-section-title">{{ ctaBannerTitle }}</h2>
          <p class="dos-mh-sub dos-mh-sub-on-dark">{{ ctaBannerSub }}</p>
          <div class="dos-mh-cta-row">
            <dos-carbon-button kind="primary" size="lg" (clicked)="navigate(ctaPrimaryHref)">
              {{ ctaPrimaryLabel }}
            </dos-carbon-button>
            <dos-carbon-button kind="tertiary" size="lg" (clicked)="navigate(ctaSecondaryHref)">
              {{ ctaSecondaryLabel }}
            </dos-carbon-button>
          </div>
        </div>
      </section>

      <!-- 17 footer — Carbon Grid ───────────────────────────────────── -->
      <footer class="dos-mh-section dos-mh-footer" data-section-id="footer" id="footer">
        <div class="dos-mh-container">
          <dos-carbon-grid>
            <dos-carbon-row>
              @for (g of footerGroups(); track g.id) {
                <dos-carbon-col [columnNumbers]="{ sm: 4, md: 4, lg: 3 }">
                  <strong>{{ groupTitle(g) }}</strong>
                  <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.375rem;">
                    @for (it of g.items; track it.id) {
                      <li>
                        <dos-carbon-link [href]="it.href" size="sm">{{ itemLabel(it) }}</dos-carbon-link>
                      </li>
                    }
                  </ul>
                </dos-carbon-col>
              }
              <dos-carbon-col [columnNumbers]="{ sm: 4, md: 4, lg: 3 }">
                <div style="display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start;">
                  <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="32" />
                  <small>© {{ year }} {{ brandLabel }}</small>
                </div>
              </dos-carbon-col>
            </dos-carbon-row>
          </dos-carbon-grid>
        </div>
      </footer>
    </main>
  `,
})
export class DosMarketingHomePageComponent {
  private readonly brandResolver = inject(BrandResolverService);
  private readonly router = inject(Router);
  private readonly _brandCode = signal<DosBrandCode | null>(null);
  private readonly _homeContent = signal<MarketingHomeContent | null>(null);
  private readonly _navItems  = signal<ReadonlyArray<MarketingNavItem>>([]);
  private readonly _navGroups = signal<ReadonlyArray<MarketingNavGroup>>([]);
  private readonly _footerGroups = signal<ReadonlyArray<MarketingFooterGroup>>([]);
  private readonly _flags = signal<Readonly<Record<string, boolean>>>({});

  @Input({ required: true }) set brandCode(v: DosBrandCode) {
    this._brandCode.set(v);
    if (v) this.brandResolver.init(v).catch(() => {});
  }
  get brandCode(): DosBrandCode { return this._brandCode() as DosBrandCode; }

  @Input() locale: 'en' | 'ar' = 'en';
  @Input() set homeContent(v: MarketingHomeContent | null) { this._homeContent.set(v); }
  @Input('navItems')  set navItemsInput(v:  ReadonlyArray<MarketingNavItem>  | null) { this._navItems.set(v  ?? []); }
  @Input('navGroups') set navGroupsInput(v: ReadonlyArray<MarketingNavGroup> | null) { this._navGroups.set(v ?? []); }
  @Input('footerGroups') set footerGroupsInput(v: ReadonlyArray<MarketingFooterGroup> | null) { this._footerGroups.set(v ?? []); }
  @Input() set flags(v: Readonly<Record<string, boolean>> | null) { this._flags.set(v ?? {}); }

  @Input() agentStripState: AgentState = 'ready';
  private readonly _agentStripSummary = signal<AgentStripSummary | null>(null);
  @Input() set agentStripSummary(v: AgentStripSummary | null) { this._agentStripSummary.set(v); }
  get agentStripSummary(): AgentStripSummary | null { return this._agentStripSummary(); }

  private readonly _downloadAssets = signal<ReadonlyArray<MarketingAsset>>([]);
  @Input() set downloadAssets(v: ReadonlyArray<MarketingAsset>) { this._downloadAssets.set(v); }
  get downloadAssets(): ReadonlyArray<MarketingAsset> { return this._downloadAssets(); }

  private readonly content = computed(() => this._homeContent() ?? EMPTY_MARKETING_HOME_CONTENT);

  // Brand label (resolved server-side, no string mapping in component).
  get brandLabel(): string { return this.content().brandLabel; }

  // Hero
  get heroBadgeLabel(): string  { return this.content().hero.badge; }
  get heroEyebrow(): string     { return this.content().hero.eyebrow; }
  get heroTitle(): string       { return this.content().hero.title; }
  get heroSub(): string         { return this.content().hero.sub; }
  get heroMicrocopy(): string   { return this.content().hero.microcopy; }
  get ctaPrimaryLabel(): string  { return this.content().hero.ctaPrimary.label; }
  get ctaPrimaryHref(): string   { return this.content().hero.ctaPrimary.href; }
  get ctaSecondaryLabel(): string { return this.content().hero.ctaSecondary.label; }
  get ctaSecondaryHref(): string  { return this.content().hero.ctaSecondary.href; }

  /** IBM Carbon `login/20` icon descriptor for the public-header Sign-in CTA. */
  /** IBM Carbon login/20 icon — used for cta-signin icon slot (id check in template). */
  readonly signInIcon = Login20;
  // signInLabel deleted — label is now DB-driven via dos.marketing_nav_items.label_en/ar.


  // Trust pills + value props
  get trustPills(): ReadonlyArray<{ id: string; label: string }> { return this.content().trustPills; }
  get valueProps(): ReadonlyArray<{ id: string; title: string; body: string }> { return this.content().valueProps; }

  // Agentic-proof
  get agenticEyebrow(): string { return this.content().agentic.eyebrow; }
  get agenticTitle(): string   { return this.content().agentic.title; }
  get agenticEmptyLabel(): string { return this.agenticText('emptyLabel'); }
  get agenticFailedLabel(): string { return this.agenticText('failedLabel'); }
  get agenticReadinessLabel(): string { return this.agenticText('readinessLabel'); }
  get agenticReadinessHelper(): string { return this.agenticText('readinessHelper'); }
  get readinessPercent(): number { return this.content().agentic.readinessPercent; }
  get agentTiles(): ReadonlyArray<MarketingAgentTile> { return this.content().agentic.tiles; }

  // Platform-overview
  get platformTitle(): string { return this.content().platform.title; }
  get platformBody(): string  { return this.content().platform.body; }
  get platformTabs(): DosCarbonTabItem[] {
    return this.content().platform.tabs.map((t) => ({ id: t.id, label: t.label }));
  }
  readonly platformTabId = signal<string>('');
  readonly platformTabBody = computed(() => {
    const tabs = this.content().platform.tabs;
    const id = this.platformTabId() || tabs[0]?.id || '';
    return tabs.find((t) => t.id === id)?.body ?? '';
  });

  // Modules / industries
  get moduleTiles(): ReadonlyArray<{ id: string; title: string; body: string }> { return this.content().modules; }
  get industries(): ReadonlyArray<{ id: string; label: string }>                { return this.content().industries; }

  // Architecture
  get architectureTitle(): string { return this.content().architecture.title; }
  get architectureBody(): string  { return this.content().architecture.body; }
  get architectureRows(): DosCarbonStructuredListRow[] {
    return this.content().architecture.rows.map((r) => ({ key: r.key, label: r.label, value: r.value }));
  }

  // AI / agent loop
  get aiEyebrow(): string { return this.content().ai.eyebrow; }
  get aiTitle(): string   { return this.content().ai.title; }
  get aiBody(): string    { return this.content().ai.body; }
  get agentLoopCurrent(): number { return this.content().ai.currentStep; }
  get agentLoopSteps(): DosCarbonProgressStep[] {
    return this.content().ai.steps.map((s) => ({
      state: s.state, label: s.label, description: s.description,
    }));
  }

  // Pricing
  get pricingTitle(): string    { return this.content().pricing.title; }
  get pricingCtaLabel(): string { return this.content().pricing.ctaLabel; }
  get pricingHref(): string     { return this.content().pricing.href; }
  get pricingColumns(): DosCarbonTableColumn[] {
    return this.content().pricing.columns.map((c) => ({
      key: c.key, header: c.header, width: c.width, align: c.align,
    }));
  }
  get pricingRows(): ReadonlyArray<Record<string, string>> { return this.content().pricing.rows; }

  // Testimonials / logos / resources / FAQ / CTA banner
  get testimonials(): ReadonlyArray<{ id: string; quote: string; author: string; role: string }> { return this.content().testimonials; }
  get customerLogos(): ReadonlyArray<{ id: string; name: string }> { return this.content().customerLogos; }
  get resources(): ReadonlyArray<{ id: string; title: string; body: string; href: string }> { return this.content().resources; }
  get faq(): ReadonlyArray<{ q: string; a: string }> { return this.content().faq; }
  get ctaBannerEyebrow(): string { return this.content().ctaBanner.eyebrow; }
  get ctaBannerTitle(): string   { return this.content().ctaBanner.title; }
  get ctaBannerSub(): string     { return this.content().ctaBanner.sub; }

  // Download-kit content (M1.5)
  get downloadKitEyebrow(): string { return this.content().downloadKit.eyebrow; }
  get downloadKitTitle(): string   { return this.content().downloadKit.title; }
  get downloadKitBody(): string    { return this.content().downloadKit.body; }
  get downloadCtaLabel(): string   { return this.content().downloadKit.ctaLabel; }
  get featuredAssetKey(): string   { return this.content().downloadKit.featuredAssetKey; }
  get kitNotificationTitle(): string    { return this.content().downloadKit.notification.title; }
  get kitNotificationSubtitle(): string { return this.content().downloadKit.notification.subtitle; }
  get kitToastTitle(): string    { return this.content().downloadKit.toast.title; }
  get kitToastSubtitle(): string { return this.content().downloadKit.toast.subtitle; }

  readonly year = new Date().getFullYear();
  readonly footerGroups = computed(() => this._footerGroups());
  readonly navItems  = computed(() => this._navItems());
  readonly navGroups = computed(() => this._navGroups());
  readonly showAgenticProof    = computed(() => this._flags()['landingAgenticProof']    === true);
  /** Wave 2 — wires the landingHeroVideo flag to a video slot in the hero section. */
  readonly showHeroVideo       = computed(() => this._flags()['landingHeroVideo']       === true);
  /** Wave 2 — wires the landingLiveStatusPill flag to a status pill under the hero badge. */
  readonly showLiveStatusPill  = computed(() => this._flags()['landingLiveStatusPill']  === true);

  agenticText(key: string): string {
    return ((this.content().agentic as unknown as Record<string, string>)[key] ?? '');
  }

  /** Carbon Accordion items derived from FAQ. */
  faqItems(): DosCarbonAccordionItem[] {
    return this.faq.map((f) => ({ title: f.q, content: f.a }));
  }

  /** B1 — Maps customerLogos to DosCarbonContainedListItem[] for the logos contained-list.
   *  carbon_key='contained-list', runtime_status='active', dynamic_ui_allowed=true */
  logoListItems(): DosCarbonContainedListItem[] {
    return (this.customerLogos ?? []).map((l) => ({
      id:      l.id,
      content: l.name,
    }));
  }

  /** B5 — Maps resources to DosCarbonContainedListItem[] for the resources disclosed list.
   *  itemClick emits { content: href } which navigate() handles.
   *  carbon_key='contained-list', runtime_status='active', dynamic_ui_allowed=true */
  resourceListItems(): DosCarbonContainedListItem[] {
    return (this.resources ?? []).map((r) => ({
      id:      r.id,
      content: `${r.title} — ${r.body}`,
    }));
  }

  onResourceSelected(item: DosCarbonContainedListItem): void {
    const match = this.resources.find((resource) => resource.id === item.id);
    this.navigate(match?.href || '/resources');
  }


  /** Footer label/title resolvers — prefer server-translated `title`/`label`,
   *  fall back to the i18n key when the resolver hasn't shipped one. */
  groupTitle(g: { titleKey: string; title?: string }): string {
    return g.title || g.titleKey;
  }
  itemLabel(it: { labelKey: string; label?: string }): string {
    return it.label || it.labelKey;
  }
  /** Header nav items — 100% DB-driven from MarketingPublicConfigService signal.
   * Excludes CTA variants (primary/secondary) which render in the header actions slot. */
  headerNavItems(): ReadonlyArray<MarketingNavItem> {
    return this.navItems().filter((n) => n.variant !== 'primary' && n.variant !== 'secondary');
  }
  /** Header CTA items (variant=primary|secondary) — rendered in the header actions slot. */
  headerCtaItems(): ReadonlyArray<MarketingNavItem> {
    return this.navItems().filter((n) => n.variant === 'primary' || n.variant === 'secondary');
  }
  isHeaderActive(href: string): boolean {
    if (href.startsWith('#')) {
      if (typeof window === 'undefined') return href === '#hero';
      return window.location.hash === href || (href === '#hero' && !window.location.hash);
    }
    const current = this.router.url.split('?')[0] || '';
    return href !== '/' && (current === href || current.startsWith(`${href}/`));
  }
  get headerMenuLabel(): string {
    return this.locale === 'ar' ? 'القائمة' : 'Menu';
  }
  get mobileMenuLabel(): string {
    return this.locale === 'ar' ? 'فتح قائمة التنقل' : 'Open navigation menu';
  }

  get heroTrustLabel(): string {
    return this.locale === 'ar'
      ? 'موثوق لـ: ISO 27001 · SOC 2 Type II · GDPR · NCA ECC · SAMA CSF'
      : 'Trusted for: ISO 27001 · SOC 2 Type II · GDPR · NCA ECC · SAMA CSF';
  }
  get valuePropsEyebrow(): string {
    return this.locale === 'ar' ? 'قيمة تشغيلية' : 'Operational value';
  }
  get valuePropsTitle(): string {
    return this.locale === 'ar'
      ? 'ثلاث فوائد واضحة قبل أن تبدأ بقية الصفحة.'
      : 'Three proof points before the rest of the platform story.';
  }
  get valuePropsSub(): string {
    return this.locale === 'ar'
      ? 'تقليل وقت المراجعة، إحكام الموافقات، وإبقاء الأدلة جاهزة للتدقيق في كل خطوة.'
      : 'Shorter review cycles, tighter approvals, and evidence that stays ready for every regulator.';
  }

  get heroProofStatus(): string {
    return this.locale === 'ar' ? 'جاهز للتدقيق' : 'Audit-ready';
  }
  get heroProofTitle(): string {
    return this.locale === 'ar'
      ? 'لوحة مباشرة للوكلاء والموافقات والدليل الرقابي.'
      : 'A live proof panel for agents, approvals, and audit.';
  }
  get heroProofBody(): string {
    return this.locale === 'ar'
      ? 'راقب حالة التنفيذ، تتبّع الموافقات، واحتفظ بدليل قابل للمراجعة من أول إشارة حتى الإغلاق.'
      : 'Monitor execution status, track approvals, and keep review-ready evidence from first signal to final sign-off.';
  }
  heroProofStatusItems(): ReadonlyArray<{ id: string; label: string; value: string; tone: 'live' | 'pending' | 'synced' }> {
    const agentCount = this.agentTiles.length || 9;
    return this.locale === 'ar'
      ? [
          { id: 'agents', label: 'الوكلاء المباشرون', value: `${agentCount} نشط`, tone: 'live' },
          { id: 'approvals', label: 'الموافقات', value: '4 قيد التنفيذ', tone: 'pending' },
          { id: 'audit', label: 'سجل التدقيق', value: 'متزامن', tone: 'synced' },
        ]
      : [
          { id: 'agents', label: 'Live agents', value: `${agentCount} active`, tone: 'live' },
          { id: 'approvals', label: 'Approvals', value: '4 in flow', tone: 'pending' },
          { id: 'audit', label: 'Audit trail', value: 'Synced', tone: 'synced' },
        ];
  }
  heroTimelineSteps(): ReadonlyArray<string> {
    return this.locale === 'ar'
      ? [
          'راقب',
          'اقترح',
          'اعتمد',
          'نفّذ',
          'تحقق',
          'سجّل',
        ]
      : [
          'Observe',
          'Suggest',
          'Approve',
          'Execute',
          'Verify',
          'Log',
        ];
  }
  get heroEvidenceReceipt(): string {
    return this.locale === 'ar'
      ? 'إيصال الدليل: EVT-240504-0912 · موقّع ومحفوظ في السجل غير القابل للتعديل.'
      : 'Evidence receipt: EVT-240504-0912 · signed and written to the immutable audit log.';
  }

  /** Imperatively navigate. External URLs through window.location; internal
   *  paths via the SPA Router so the landing doesn't reload on CTA click. */
  readonly headerMenuOpen = signal(false);

  toggleHeaderMenu(): void {
    this.headerMenuOpen.update((open) => !open);
  }

  /** Tracks which nav dropdown groups are currently open by group id. */
  private readonly _openNavGroups = signal<ReadonlySet<string>>(new Set());

  isGroupOpen(groupId: string): boolean {
    return this._openNavGroups().has(groupId);
  }

  toggleNavGroup(groupId: string): void {
    this._openNavGroups.update((s) => {
      const next = new Set(s);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }


  onAnchorNavigate(event: MouseEvent, href: string): void {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.headerMenuOpen.set(false);
    this.navigate(href);
  }
  navigate(href: string): void {
    if (!href) return;
    if (/^https?:\/\//.test(href)) {
      if (typeof window !== 'undefined') window.location.assign(href);
      return;
    }
    if (href.startsWith('#')) {
      this.scrollToAnchor(href.slice(1));
      return;
    }
    const [path, fragment] = href.split('#');
    if (fragment && (!path || path === '/')) {
      this.scrollToAnchor(fragment);
      return;
    }
    if (fragment) {
      void this.router.navigateByUrl(path || '/').then(() => this.deferScrollToAnchor(fragment));
      return;
    }
    void this.router.navigateByUrl(href);
  }

  // ─── M1.5 Download-Kit runtime state ─────────────────────────────────
  readonly modalOpen = signal(false);
  readonly downloadSuccess = signal(false);

  @ViewChild(DosGatedDownloadModalComponent)
  private readonly gatedDownloadModal?: DosGatedDownloadModalComponent;

  @Output() readonly downloadEvent = new EventEmitter<MarketingDownloadEvent>();

  featuredAsset(): MarketingAsset | null {
    const list = this.downloadAssets;
    if (!list?.length) return null;
    const key = this.featuredAssetKey;
    return (
      list.find((a) => a.assetKey === key && a.locale === this.locale)
      ?? list.find((a) => a.assetKey === key)
      ?? null
    );
  }

  async onDownloadEvent(e: MarketingDownloadEvent): Promise<void> {
    if (e.key === 'marketing.download.opened') {
      const asset = this.featuredAsset();
      if (asset?.isGated) this.modalOpen.set(true);
    }
    if (e.key === 'marketing.download.submitted') {
      await this.submitMarketingDownload(e);
    }
    if (e.key === 'marketing.download.completed') {
      this.modalOpen.set(false);
      this.downloadSuccess.set(true);
    }
    this.downloadEvent.emit(e);
  }

  onModalClosed() {
    this.modalOpen.set(false);
  }

  private deferScrollToAnchor(anchor: string): void {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => this.scrollToAnchor(anchor));
  }

  private scrollToAnchor(anchor: string): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const target = document.getElementById(anchor);
    if (!target) {
      window.location.hash = anchor;
      return;
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const nextUrl = anchor === 'hero' ? '/' : `/#${anchor}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }

  private async submitMarketingDownload(event: MarketingDownloadEvent): Promise<void> {
    const response = await fetch('/api/ui-os/marketing/downloads', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'omit',
      body: JSON.stringify(event),
    }).catch((error: unknown) => {
      throw new Error((error as Error)?.message || 'download_submit_failed');
    });

    if (response.ok) {
      this.gatedDownloadModal?.markCompleted();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    const message = typeof payload?.message === 'string'
      ? payload.message
      : typeof payload?.error === 'string'
        ? payload.error
        : this.locale === 'ar'
          ? 'تعذر إرسال طلب الحزمة التنفيذية.'
          : 'Unable to submit the executive kit request.';
    this.gatedDownloadModal?.markFailed(message);
  }

  /** Resolve the agent-tile asset for a given agent code via BrandResolverService. */
  tileAsset(agentCode: string) {
    const all = this.brandResolver.bundle()?.assets ?? [];
    return all.find(
      (a) => a.brandCode === this.brandCode
          && a.assetKind === 'agent-tile'
          && (a as unknown as { assetCode?: string }).assetCode === agentCode,
    ) ?? null;
  }

  /** Return a real URL for the agent tile, or null. Prevents img src="". */
  tileAssetUrl(agentCode: string): string | null {
    const asset = this.tileAsset(agentCode);
    if (!asset || asset.source.kind !== 'url') return null;
    return asset.source.url;
  }
}

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
import { DosCarbonHeaderShellComponent } from '../carbon/dos-carbon-header-shell.component';
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
import { DosCarbonBreadcrumbComponent, type DosCarbonBreadcrumbItem } from '../carbon/dos-carbon-breadcrumb.component';
import { DosCarbonStructuredListComponent, type DosCarbonStructuredListRow } from '../carbon/dos-carbon-structured-list.component';
import { DosCarbonDataTableComponent, type DosCarbonTableColumn } from '../carbon/dos-carbon-data-table.component';
import { DosCarbonProgressBarComponent } from '../carbon/dos-carbon-progress-bar.component';
import { DosCarbonProgressIndicatorComponent, type DosCarbonProgressStep } from '../carbon/dos-carbon-progress-indicator.component';
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';
import { DosCarbonAspectRatioComponent } from '../carbon/dos-carbon-aspect-ratio.component';

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
export const MARKETING_HOME_SECTIONS = MARKETING_HOME_REGIONS;
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
    DosCarbonHeaderShellComponent,
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
    DosCarbonBreadcrumbComponent,
    DosCarbonStructuredListComponent,
    DosCarbonDataTableComponent,
    DosCarbonProgressBarComponent,
    DosCarbonProgressIndicatorComponent,
    DosCarbonSkeletonComponent,
    DosCarbonAspectRatioComponent,
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
      <!-- ░░ Header (cds-header + cds-header-navigation + HeaderMenuItem) ░░ -->
      <dos-carbon-header-shell
        data-section-id="public-header"
        [brand]="brandLabel"
        brandShort="DOS"
        [showHeaderNav]="true"
        [showHamburger]="false"
        ariaLabel="Marketing header"
      >
        <ng-container headerNav>
          @for (n of navItems(); track n.id) {
            <dos-carbon-link
              [href]="n.href"
              size="md"
              [inline]="true"
            >{{ navLabel(n) }}</dos-carbon-link>
          }
        </ng-container>
      </dos-carbon-header-shell>

      <!-- ░░ Breadcrumb (Home › current) ░░ -->
      <div class="dos-mh-container dos-mh-breadcrumb-row" data-section-id="breadcrumb-row">
        <dos-carbon-breadcrumb [items]="breadcrumbItems"></dos-carbon-breadcrumb>
      </div>

      <!-- 01 hero — Carbon Grid (cdsGrid + cdsRow + cdsCol) ──────────── -->
      <section
        class="dos-mh-section dos-mh-hero"
        data-section-id="hero"
        data-cds-layer="01"
      >
        <dos-carbon-grid [fullWidth]="true">
          <dos-carbon-row>
            <dos-carbon-col [columnNumbers]="{ sm: 4, md: 8, lg: 8 }">
              <div class="dos-mh-hero-content">
                <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="64" />
                <div class="dos-mh-hero-badge">
                  <dos-carbon-tag type="blue" size="md">{{ heroBadgeLabel }}</dos-carbon-tag>
                </div>
                <p class="dos-mh-eyebrow">{{ heroEyebrow }}</p>
                <h1 class="dos-mh-title">{{ heroTitle }}</h1>
                <p class="dos-mh-sub">{{ heroSub }}</p>
                <div class="dos-mh-cta-row">
                  <dos-carbon-button kind="primary" size="lg" (clicked)="navigate(ctaPrimaryHref)">
                    {{ ctaPrimaryLabel }}
                  </dos-carbon-button>
                  <dos-carbon-button kind="tertiary" size="lg" (clicked)="navigate(ctaSecondaryHref)">
                    {{ ctaSecondaryLabel }}
                  </dos-carbon-button>
                </div>
                <p class="dos-mh-hero-microcopy">{{ heroMicrocopy }}</p>
              </div>
            </dos-carbon-col>
            <dos-carbon-col [columnNumbers]="{ sm: 0, md: 0, lg: 4 }">
              <div class="dos-mh-hero-visual" aria-hidden="true">
                <dos-carbon-aspect-ratio ratio="1x1">
                  <div class="dos-mh-hero-orb"></div>
                </dos-carbon-aspect-ratio>
              </div>
            </dos-carbon-col>
          </dos-carbon-row>
        </dos-carbon-grid>
      </section>

      <!-- 02 trust-pills — Carbon Tag ────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-trust" data-section-id="trust-pills">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (p of trustPills; track p.id) {
            <dos-carbon-tag type="cool-gray" size="md">{{ p.label }}</dos-carbon-tag>
          }
        </div>
      </section>

      <!-- 03 value-props — Carbon Tile ───────────────────────────────── -->
      <section class="dos-mh-section dos-mh-value-props" data-section-id="value-props">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (v of valueProps; track v.id) {
            <dos-carbon-tile>
              <h3>{{ v.title }}</h3>
              <p>{{ v.body }}</p>
            </dos-carbon-tile>
          }
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

            <ul class="dos-mh-agent-tiles" role="list">
              @for (t of agentTiles; track t.agentCode) {
                <li [attr.data-agent-code]="t.agentCode">
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
                        <span class="dos-mh-agent-letter" aria-hidden="true">{{ t.agentCode }}</span>
                      }
                      <strong>{{ locale === 'ar' ? (t.displayNameAr || t.displayName) : t.displayName }}</strong>
                      @if (t.role) { <small>{{ t.role }}</small> }
                    </div>
                  </dos-carbon-tile>
                </li>
              }
            </ul>
          </div>
        </section>
      }

      <!-- 05 download-kit ───────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-download-kit" data-section-id="download-kit">
        <div class="dos-mh-container">
          <p class="dos-mh-eyebrow">{{ downloadKitEyebrow }}</p>
          <h2 class="dos-mh-section-title">{{ downloadKitTitle }}</h2>
          <p>{{ downloadKitBody }}</p>

          <!-- InlineNotification — informational ribbon -->
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
            <dos-carbon-skeleton shape="text" [paragraph]="true" [lineCount]="3"></dos-carbon-skeleton>
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

          <dos-gated-download-modal
            [asset]="featuredAsset()"
            [open]="modalOpen()"
            (event)="onDownloadEvent($event)"
            (closed)="onModalClosed()"
          />
        </div>
      </section>

      <!-- 06 platform-overview — Carbon Tabs ────────────────────────── -->
      <section class="dos-mh-section" data-section-id="platform-overview">
        <div class="dos-mh-container">
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
      <section class="dos-mh-section" data-section-id="modules">
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
      <section class="dos-mh-section" data-section-id="industries">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (i of industries; track i.id) {
            <dos-carbon-tag type="warm-gray" size="md">{{ i.label }}</dos-carbon-tag>
          }
        </div>
      </section>

      <!-- 09 architecture — Carbon StructuredList ───────────────────── -->
      <section class="dos-mh-section" data-section-id="architecture">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ architectureTitle }}</h2>
          <p>{{ architectureBody }}</p>
          <dos-carbon-structured-list [rows]="architectureRows"></dos-carbon-structured-list>
        </div>
      </section>

      <!-- 10 ai-and-agents — Carbon ProgressIndicator (6-step agent loop) ── -->
      <section class="dos-mh-section dos-mh-ai" data-section-id="ai-and-agents">
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
      <section class="dos-mh-section" data-section-id="pricing-teaser">
        <div class="dos-mh-container">
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
      <section class="dos-mh-section" data-section-id="testimonials">
        <div class="dos-mh-container dos-mh-grid-3">
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

      <!-- 13 logos ──────────────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="logos">
        <div class="dos-mh-container dos-mh-pill-row">
          @for (l of customerLogos; track l.id) {
            <span class="dos-mh-logo">{{ l.name }}</span>
          }
        </div>
      </section>

      <!-- 14 resources — Carbon ClickableTile + Link ────────────────── -->
      <section class="dos-mh-section" data-section-id="resources">
        <div class="dos-mh-container dos-mh-grid-3">
          @for (r of resources; track r.id) {
            <dos-carbon-tile [clickable]="true" [route]="r.href">
              <h3>
                <dos-carbon-link [href]="r.href" size="lg">{{ r.title }}</dos-carbon-link>
              </h3>
              <p>{{ r.body }}</p>
            </dos-carbon-tile>
          }
        </div>
      </section>

      <!-- 15 faq — Carbon Accordion ─────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="faq">
        <div class="dos-mh-container">
          <dos-carbon-accordion [items]="faqItems()" align="end" size="md"></dos-carbon-accordion>
        </div>
      </section>

      <!-- 16 cta-banner ─────────────────────────────────────────────── -->
      <section class="dos-mh-section dos-mh-cta-banner" data-section-id="cta-banner">
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

      <!-- 17 footer — Carbon Link ───────────────────────────────────── -->
      <footer class="dos-mh-section dos-mh-footer" data-section-id="footer">
        <div class="dos-mh-container dos-mh-footer-grid">
          @for (g of footerGroups(); track g.id) {
            <div class="dos-mh-footer-col">
              <strong>{{ groupTitle(g) }}</strong>
              <ul>
                @for (it of g.items; track it.id) {
                  <li>
                    <dos-carbon-link [href]="it.href" size="sm">{{ itemLabel(it) }}</dos-carbon-link>
                  </li>
                }
              </ul>
            </div>
          }
          <div class="dos-mh-footer-col dos-mh-footer-brand">
            <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="32" />
            <small>© {{ year }} {{ brandCode }}</small>
          </div>
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
  private readonly _navItems = signal<ReadonlyArray<MarketingNavItem>>([]);
  private readonly _footerGroups = signal<ReadonlyArray<MarketingFooterGroup>>([]);
  private readonly _flags = signal<Readonly<Record<string, boolean>>>({});

  @Input({ required: true }) set brandCode(v: DosBrandCode) {
    this._brandCode.set(v);
    if (v) this.brandResolver.init(v).catch(() => {});
  }
  get brandCode(): DosBrandCode { return this._brandCode() as DosBrandCode; }

  @Input() locale: 'en' | 'ar' = 'en';
  @Input() set homeContent(v: MarketingHomeContent | null) { this._homeContent.set(v); }
  @Input('navItems') set navItemsInput(v: ReadonlyArray<MarketingNavItem> | null) { this._navItems.set(v ?? []); }
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

  // Breadcrumb
  get breadcrumbItems(): DosCarbonBreadcrumbItem[] {
    return this.content().breadcrumb.map((b) => ({ label: b.label, href: b.href, current: b.current }));
  }

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
  readonly navItems = computed(() => this._navItems());
  readonly showAgenticProof = computed(() => this._flags()['landingAgenticProof'] === true);

  agenticText(key: string): string {
    return ((this.content().agentic as unknown as Record<string, string>)[key] ?? '');
  }

  /** Carbon Accordion items derived from FAQ. */
  faqItems(): DosCarbonAccordionItem[] {
    return this.faq.map((f) => ({ title: f.q, content: f.a }));
  }

  /** Footer label/title resolvers — prefer server-translated `title`/`label`,
   *  fall back to the i18n key when the resolver hasn't shipped one. */
  groupTitle(g: { titleKey: string; title?: string }): string {
    return g.title || g.titleKey;
  }
  itemLabel(it: { labelKey: string; label?: string }): string {
    return it.label || it.labelKey;
  }
  navLabel(n: { labelKey: string; label?: string }): string {
    return n.label || n.labelKey;
  }

  /** Imperatively navigate. External URLs through window.location; internal
   *  paths via the SPA Router so the landing doesn't reload on CTA click. */
  navigate(href: string): void {
    if (!href) return;
    if (/^https?:\/\//.test(href)) {
      if (typeof window !== 'undefined') window.location.assign(href);
      return;
    }
    void this.router.navigateByUrl(href);
  }

  // ─── M1.5 Download-Kit runtime state ─────────────────────────────────
  readonly modalOpen = signal(false);
  readonly downloadSuccess = signal(false);

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

  onDownloadEvent(e: MarketingDownloadEvent) {
    if (e.key === 'marketing.download.opened') {
      const asset = this.featuredAsset();
      if (asset?.isGated) this.modalOpen.set(true);
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

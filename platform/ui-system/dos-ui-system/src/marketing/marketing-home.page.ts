/**
 * Phase M1 — `marketing.home.page` 17-section landing surface.
 *
 * Public, unauthenticated landing for shahin-ai + dogan-ai-os brands. Built
 * exclusively from approved primitives:
 *   - `<dos-brand-eagle>` for the brand mark (BrandResolverService).
 *   - `<dos-agent-status-strip>` from M0.5 (gated by flag('landingAgenticProof')).
 *   - 9 agent-tile brand assets resolved via BrandResolverService.
 *   - IBM Carbon `tiles`/`button`/`tag` styling hooks via data-cds-component.
 *
 * Sections (17 — single ordered list, every one rendered as a <section>):
 *   01 hero               10 ai-and-agents
 *   02 trust-pills        11 pricing-teaser
 *   03 value-props        12 testimonials
 *   04 agentic-proof      13 logos
 *   05 download-kit       14 resources
 *   06 platform-overview  15 faq
 *   07 modules            16 cta-banner
 *   08 industries         17 footer
 *   09 architecture
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
import { DosBrandEagleComponent } from '../brand/dos-brand-eagle.component';
import { BrandResolverService } from '../brand/brand-resolver.service';
import { MarketingPublicConfigService } from './marketing-public-config.service';
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
import { DosCarbonSkeletonComponent } from '../carbon/dos-carbon-skeleton.component';

/** Locked 17-section ordering (M1.5 inserts `download-kit` after agentic-proof).
 *  CI gate `marketing-home-coverage.mjs` greps this literal. */
export const MARKETING_HOME_SECTIONS = [
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
export type MarketingHomeSectionId = (typeof MARKETING_HOME_SECTIONS)[number];

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
    DosCarbonSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      class="dos-marketing-home"
      [attr.data-brand]="brandCode"
      [attr.data-surface]="'marketing'"
      [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'"
    >
      <!-- ░░ Header (cds-header + cds-header-navigation + HeaderMenuItem) ░░ -->
      <dos-carbon-header-shell
        [brand]="brandCode === 'shahin-ai' ? 'Shahin-AI' : 'Dogan-AI'"
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
      <div class="dos-mh-container dos-mh-breadcrumb-row">
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
            <dos-carbon-col [columnNumbers]="{ sm: 4, md: 8, lg: 12 }">
              <dos-brand-eagle [brandCode]="brandCode" [locale]="locale" [size]="64" />
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
              emptyLabel="No agents enrolled"
              failedLabel="Agent service unavailable"
            />

            <!-- ProgressBar — agentic readiness/maturity meter -->
            <div class="dos-mh-readiness">
              <dos-carbon-progress-bar
                label="Agentic readiness"
                helperText="9 of 10 agents online"
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
                      @if (tileAsset(t.agentCode); as a) {
                        <img
                          class="dos-mh-agent-img"
                          [src]="a.source.kind === 'url' ? a.source.url : ''"
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
            title="Free executive kit"
            subtitle="Bilingual EN/AR. PDF + slides."
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
                title="Your kit is ready"
                subtitle="Check your inbox for the download link."
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

      <!-- 10 ai-and-agents ──────────────────────────────────────────── -->
      <section class="dos-mh-section" data-section-id="ai-and-agents">
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ aiTitle }}</h2>
          <p>{{ aiBody }}</p>
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
        <div class="dos-mh-container">
          <h2 class="dos-mh-section-title">{{ ctaBannerTitle }}</h2>
          <div class="dos-mh-cta-row">
            <dos-carbon-button kind="primary" size="lg" (clicked)="navigate(ctaPrimaryHref)">
              {{ ctaPrimaryLabel }}
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
  styles: [`
    :host { display: block; font-family: 'IBM Plex Sans', 'Inter', system-ui, sans-serif; }
    .dos-marketing-home { color: #161616; background: #ffffff; container-type: inline-size; }
    .dos-mh-section { padding-block: 4.5rem; }
    .dos-mh-container { max-inline-size: 1200px; margin-inline: auto; padding-inline: 1.5rem; }
    .dos-mh-eyebrow { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; color: #fbbf24; margin: 0 0 0.75rem; }
    .dos-mh-title { font-size: clamp(2.25rem, 5vw, 3.75rem); line-height: 1.08; margin: 0 0 1rem; font-weight: 600; letter-spacing: -0.02em; color: #0f1f3d; }
    .dos-mh-sub { font-size: 1.125rem; line-height: 1.5; margin: 0 0 2rem; color: #525252; max-inline-size: 720px; }
    .dos-mh-section-title { font-size: clamp(1.75rem, 3vw, 2.5rem); margin: 0 0 1.5rem; font-weight: 600; letter-spacing: -0.01em; color: #0f1f3d; }

    /* ── Hero ─────────────────────────────────────────────────────────── */
    .dos-mh-hero { background: linear-gradient(180deg, #f4f4f4 0%, #ffffff 100%); padding-block: 6rem 5rem; }
    .dos-mh-hero dos-brand-eagle { display: inline-flex; margin-block-end: 1.25rem; }

    /* ── CTA buttons (Carbon-styled) ──────────────────────────────────── */
    .dos-mh-cta-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-block-start: 0.5rem; }
    .dos-mh-cta { display: inline-flex; align-items: center; justify-content: center; padding: 0.875rem 2rem; font-size: 1rem; font-weight: 400; min-block-size: 48px; text-decoration: none; border: 1px solid transparent; border-radius: 0; cursor: pointer; transition: background 70ms cubic-bezier(.2,0,.38,.9), border-color 70ms; line-height: 1.25; }
    .dos-mh-cta[data-kind="primary"] { background: #0f62fe; color: #ffffff; }
    .dos-mh-cta[data-kind="primary"]:hover { background: #0050e6; }
    .dos-mh-cta[data-kind="secondary"], .dos-mh-cta[data-kind="tertiary"] { background: transparent; color: #0f62fe; border-color: #0f62fe; }
    .dos-mh-cta[data-kind="secondary"]:hover, .dos-mh-cta[data-kind="tertiary"]:hover { background: rgba(15,98,254,0.08); }

    /* ── Trust pills (Carbon tag) ─────────────────────────────────────── */
    .dos-mh-pill-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
    .dos-mh-pill { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 400; line-height: 1.5; background: #e0e0e0; color: #161616; min-block-size: 24px; }
    .dos-mh-pill[data-kind="cool-gray"] { background: #dde1e6; color: #121619; }
    .dos-mh-pill[data-kind="warm-gray"] { background: #e5e0df; color: #171414; }

    /* ── Cards / tiles ────────────────────────────────────────────────── */
    .dos-mh-grid-3 { display: grid; gap: 1.5rem; grid-template-columns: repeat(3, 1fr); }
    .dos-mh-card { padding: 1.75rem 1.5rem; background: #f4f4f4; border-radius: 0; border-block-start: 4px solid #0f62fe; display: block; text-decoration: none; color: inherit; transition: background 110ms; }
    .dos-mh-card:hover { background: #e8e8e8; }
    .dos-mh-card h3 { margin: 0 0 0.5rem; font-size: 1.25rem; font-weight: 600; color: #0f1f3d; line-height: 1.25; }
    .dos-mh-card p { margin: 0; font-size: 0.9375rem; line-height: 1.5; color: #525252; }
    .dos-mh-card footer { margin-block-start: 1rem; font-size: 0.8125rem; color: #6f6f6f; }

    /* ── Breadcrumb row ───────────────────────────────────────────────── */
    .dos-mh-breadcrumb-row { padding-block: 1rem 0; }

    /* ── Readiness meter + demo skeleton ──────────────────────────────── */
    .dos-mh-readiness { margin-block: 1.5rem; max-inline-size: 480px; }
    .dos-mh-demo-skeleton { margin-block: 1rem; min-block-size: 160px; }

    /* ── Toast anchor (top-end) ───────────────────────────────────────── */
    .dos-mh-toast-anchor { position: fixed; inset-block-start: 4rem; inset-inline-end: 1rem; z-index: 1000; }

    /* ── Quotes inside Carbon Tile ────────────────────────────────────── */
    .dos-mh-quote { margin: 0; }
    .dos-mh-quote p { margin: 0 0 0.5rem; }
    .dos-mh-quote footer { color: #525252; }

    /* ── Agent strip + tiles ──────────────────────────────────────────── */
    .dos-mh-agentic { background: #f4f4f4; }
    .dos-mh-agent-tiles { list-style: none; margin: 2rem 0 0; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(3, 1fr); }
    .dos-mh-agent-tile { padding: 1.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; background: #ffffff; border-radius: 0; box-shadow: 0 1px 0 #e0e0e0; transition: box-shadow 110ms; }
    .dos-mh-agent-tile:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .dos-mh-agent-tile strong { font-size: 0.9375rem; font-weight: 600; color: #161616; }
    .dos-mh-agent-tile small { font-size: 0.75rem; color: #6f6f6f; text-transform: capitalize; }
    .dos-mh-agent-img { inline-size: 112px; block-size: 112px; object-fit: contain; }
    .dos-mh-agent-letter { font-weight: 700; font-size: 1.5rem; padding: 1.5rem 1.75rem; background: #0f1f3d; color: #fbbf24; border-radius: 0; min-inline-size: 96px; min-block-size: 96px; display: inline-flex; align-items: center; justify-content: center; }

    /* ── Download kit ─────────────────────────────────────────────────── */
    .dos-mh-download-kit { background: #ffffff; }
    .dos-mh-download-kit p { color: #525252; line-height: 1.5; max-inline-size: 720px; }

    /* ── FAQ ──────────────────────────────────────────────────────────── */
    .dos-mh-faq { padding-block: 1rem; border-block-end: 1px solid #e0e0e0; }
    .dos-mh-faq summary { font-weight: 600; cursor: pointer; padding-block: 0.5rem; color: #0f1f3d; font-size: 1rem; list-style-position: inside; }
    .dos-mh-faq summary::marker { color: #0f62fe; }
    .dos-mh-faq p { margin: 0.75rem 0 0; color: #525252; line-height: 1.5; }

    /* ── CTA banner ──────────────────────────────────────────────────── */
    .dos-mh-cta-banner { background: linear-gradient(135deg, #0f1f3d 0%, #1a2f5a 100%); color: #ffffff; padding-block: 5rem; }
    .dos-mh-cta-banner .dos-mh-section-title { color: #ffffff; }
    .dos-mh-cta-banner .dos-mh-cta[data-kind="primary"] { background: #fbbf24; color: #0f1f3d; font-weight: 600; }
    .dos-mh-cta-banner .dos-mh-cta[data-kind="primary"]:hover { background: #f59e0b; }

    /* ── Customer logos ──────────────────────────────────────────────── */
    .dos-mh-logo { font-size: 1.125rem; font-weight: 600; color: #6f6f6f; padding: 0.5rem 1rem; letter-spacing: 0.02em; }

    /* ── Pricing teaser ──────────────────────────────────────────────── */
    [data-section-id="pricing-teaser"] { background: #f4f4f4; text-align: center; }
    [data-section-id="pricing-teaser"] .dos-mh-cta { margin-block-start: 1rem; }

    /* ── Footer ──────────────────────────────────────────────────────── */
    .dos-mh-footer { background: #0f1f3d; color: #f4f4f4; padding-block: 4rem 2rem; }
    .dos-mh-footer a { color: #c6c6c6; text-decoration: none; transition: color 70ms; font-size: 0.875rem; }
    .dos-mh-footer a:hover { color: #ffffff; text-decoration: underline; }
    .dos-mh-footer-grid { display: grid; gap: 2.5rem; grid-template-columns: repeat(4, 1fr); }
    .dos-mh-footer-col strong { display: block; font-size: 0.875rem; font-weight: 600; color: #ffffff; margin-block-end: 1rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .dos-mh-footer-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.625rem; }
    .dos-mh-footer-col li { line-height: 1.5; }
    .dos-mh-footer-brand { color: #8d8d8d; font-size: 0.8125rem; }
    .dos-mh-footer-brand small { display: block; margin-block-start: 0.75rem; }
    @container (max-width: 720px) {
      .dos-mh-grid-3 { grid-template-columns: 1fr; }
      .dos-mh-agent-tiles { grid-template-columns: repeat(2, 1fr); }
      .dos-mh-footer-grid { grid-template-columns: 1fr 1fr; }
    }
    @container (max-width: 480px) {
      .dos-mh-agent-tiles { grid-template-columns: 1fr; }
      .dos-mh-footer-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class DosMarketingHomePageComponent {
  private readonly brandResolver = inject(BrandResolverService);
  private readonly marketingCfg = inject(MarketingPublicConfigService);

  @Input({ required: true }) brandCode!: DosBrandCode;
  @Input() locale: 'en' | 'ar' = 'en';

  // Hero
  @Input() heroEyebrow = 'Agentic GRC, brought to life';
  @Input() heroTitle = 'The operating system for agentic enterprises.';
  @Input() heroSub = 'Observe, suggest, approve, execute, verify, log — every action accounted for.';
  @Input() ctaPrimaryLabel = 'Start free trial';
  @Input() ctaPrimaryHref = '/trial';
  @Input() ctaSecondaryLabel = 'See the platform';
  @Input() ctaSecondaryHref = '/platform';

  // Trust pills
  @Input() trustPills: ReadonlyArray<{ id: string; label: string }> = [
    { id: 'iso',  label: 'ISO 27001' },
    { id: 'soc2', label: 'SOC 2 Type II' },
    { id: 'gdpr', label: 'GDPR' },
    { id: 'nca',  label: 'NCA ECC' },
    { id: 'sama', label: 'SAMA CSF' },
  ];

  // Value props (3)
  @Input() valueProps: ReadonlyArray<{ id: string; title: string; body: string }> = [
    { id: 'one',   title: 'One platform', body: 'GRC, security ops, AI agents, evidence — unified.' },
    { id: 'auto',  title: 'Automated proof', body: 'Continuous evidence with cryptographic audit trail.' },
    { id: 'safe',  title: 'Human-in-the-loop', body: 'Every agent action approved, traceable, reversible.' },
  ];

  // Agentic-proof
  @Input() agenticEyebrow = 'Agentic proof';
  @Input() agenticTitle = 'Nine agents already at work.';
  @Input() agentStripState: AgentState = 'ready';
  @Input() agentStripSummary: AgentStripSummary | null = null;
  @Input() agentTiles: ReadonlyArray<MarketingAgentTile> = [
    { agentCode: 'A01', displayName: 'Onboarding Agent',           displayNameAr: 'وكيل التهيئة',            role: 'onboarding' },
    { agentCode: 'A02', displayName: 'Identity Provisioning',      displayNameAr: 'وكيل توفير الهوية',       role: 'identity' },
    { agentCode: 'A04', displayName: 'Control Authoring',          displayNameAr: 'وكيل تأليف الضوابط',     role: 'controls' },
    { agentCode: 'A05', displayName: 'Evidence Collection',        displayNameAr: 'وكيل جمع الأدلة',         role: 'evidence' },
    { agentCode: 'A06', displayName: 'Gap Remediation',            displayNameAr: 'وكيل معالجة الفجوات',     role: 'remediation' },
    { agentCode: 'A07', displayName: 'Risk Register',              displayNameAr: 'وكيل سجل المخاطر',        role: 'risk' },
    { agentCode: 'A08', displayName: 'Policy Lifecycle',           displayNameAr: 'وكيل دورة حياة السياسات', role: 'policy' },
    { agentCode: 'A09', displayName: 'Third-Party Risk',           displayNameAr: 'وكيل مخاطر الأطراف',     role: 'vendor' },
    { agentCode: 'A10', displayName: 'Audit Reporting',            displayNameAr: 'وكيل تقارير التدقيق',     role: 'audit' },
  ];

  // Platform overview
  @Input() platformTitle = 'A platform, not a checklist tool.';
  @Input() platformBody = 'Foundation, DAuth, Dynamic UI, AI engine, Audit ledger — composable from day one.';

  // Modules
  @Input() moduleTiles: ReadonlyArray<{ id: string; title: string; body: string }> = [
    { id: 'risk',     title: 'Risk',       body: 'Quantified risk register, AI explainability built in.' },
    { id: 'controls', title: 'Controls',   body: 'Author once, prove everywhere.' },
    { id: 'evidence', title: 'Evidence',   body: 'Continuous collection, cryptographic ledger.' },
    { id: 'audit',    title: 'Audit',      body: 'Always-ready, examiner-grade exports.' },
    { id: 'policy',   title: 'Policy',     body: 'Lifecycle, approvals, attestations.' },
    { id: 'vendor',   title: 'Third-party', body: 'Continuous vendor monitoring.' },
  ];

  // Industries
  @Input() industries: ReadonlyArray<{ id: string; label: string }> = [
    { id: 'finance',  label: 'Financial services' },
    { id: 'health',   label: 'Healthcare' },
    { id: 'gov',      label: 'Government' },
    { id: 'energy',   label: 'Energy' },
    { id: 'tech',     label: 'Technology' },
  ];

  // Architecture
  @Input() architectureTitle = 'Built on platform DNA.';
  @Input() architectureBody = 'Four tiers — products → modules → services → platform. Never reverse.';

  // AI / Agents
  @Input() aiTitle = 'AI agents you can audit.';
  @Input() aiBody = 'Every model decision carries provenance, confidence, and reversal path.';

  // Pricing
  @Input() pricingTitle = 'Pricing that scales with proof, not seats.';
  @Input() pricingCtaLabel = 'See pricing';
  @Input() pricingHref = '/pricing';

  // Testimonials
  @Input() testimonials: ReadonlyArray<{ id: string; quote: string; author: string; role: string }> = [
    { id: '1', quote: 'Our auditors finished in days, not weeks.',  author: 'Head of GRC', role: 'Bank' },
    { id: '2', quote: 'The first GRC tool people actually use.',   author: 'CISO',        role: 'Insurer' },
    { id: '3', quote: 'Continuous evidence, finally.',             author: 'VP Risk',     role: 'Telco' },
  ];

  // Logos
  @Input() customerLogos: ReadonlyArray<{ id: string; name: string }> = [
    { id: '1', name: 'BankCo' }, { id: '2', name: 'GovDept' },
    { id: '3', name: 'HealthOrg' }, { id: '4', name: 'Energy+' }, { id: '5', name: 'Telco9' },
  ];

  // Resources
  @Input() resources: ReadonlyArray<{ id: string; title: string; body: string; href: string }> = [
    { id: 'docs',  title: 'Docs',       body: 'Build with the platform SDK.', href: '/docs' },
    { id: 'blog',  title: 'Blog',       body: 'Field notes from agentic GRC.', href: '/blog' },
    { id: 'wp',    title: 'White papers', body: 'In-depth research.',          href: '/whitepapers' },
  ];

  // FAQ
  @Input() faq: ReadonlyArray<{ q: string; a: string }> = [
    { q: 'Is this on-prem ready?',              a: 'Yes — same product, same DB topology.' },
    { q: 'How are agent actions authorised?',   a: 'Through dauth + module-level RBAC, with audit trail.' },
    { q: 'Can we bring our own AI model?',      a: 'Yes — the AI engine is provider-agnostic.' },
  ];

  // CTA banner
  @Input() ctaBannerTitle = 'Ready to see it run?';

  readonly year = new Date().getFullYear();

  readonly footerGroups = computed(() => this.marketingCfg.marketingFooterGroups());

  readonly navItems = computed(() => this.marketingCfg.marketingNavItems());

  readonly showAgenticProof = computed(() => this.marketingCfg.flag('landingAgenticProof'));

  /** Breadcrumb (Home › current) — Carbon Breadcrumb. */
  readonly breadcrumbItems: DosCarbonBreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Platform', href: '/platform', current: true },
  ];

  /** Agentic readiness — % of agents online (drives Carbon ProgressBar). */
  @Input() readinessPercent = 90;

  /** Carbon Tabs in platform-overview. */
  readonly platformTabs: DosCarbonTabItem[] = [
    { id: 'foundation', label: 'Foundation' },
    { id: 'dauth',      label: 'DAuth' },
    { id: 'dynamic-ui', label: 'Dynamic UI' },
    { id: 'ai-engine',  label: 'AI Engine' },
    { id: 'audit',      label: 'Audit Ledger' },
  ];
  readonly platformTabId = signal<string>('foundation');
  readonly platformTabBody = computed(() => {
    const id = this.platformTabId();
    const map: Record<string, string> = {
      'foundation': 'Org, identity, SoD, lifecycle — the unconditional DNA layer.',
      'dauth':      'Identity, session, MFA, authority, SoD enforcement at the edge.',
      'dynamic-ui': 'Routes, navigation, widgets resolved from the DB registry.',
      'ai-engine':  'Provider-agnostic AI orchestration with audit-grade provenance.',
      'audit':      'Cryptographic ledger for every approved agent action.',
    };
    return map[id] ?? '';
  });

  /** Carbon StructuredList in architecture. */
  readonly architectureRows: DosCarbonStructuredListRow[] = [
    { key: 'tier-1', label: 'Tier 1 — Platform DNA', value: 'Foundation, DAuth, DSOC, DNOC, AI, UI-System, Workflow' },
    { key: 'tier-2', label: 'Tier 2 — Microservices', value: '35+ Express services managed by PM2' },
    { key: 'tier-3', label: 'Tier 3 — Module Library', value: '60+ kebab-case business modules, tenant-entitled' },
    { key: 'tier-4', label: 'Tier 4 — Product Consumers', value: 'Shahin-AI, Dogan-AI, Dogan-Consult, Dogan-Hub, Dogan-Lab' },
  ];

  /** Carbon DataTable — pricing comparison. */
  readonly pricingColumns: DosCarbonTableColumn[] = [
    { key: 'feature',   header: 'Feature', width: '40%' },
    { key: 'trial',     header: 'Trial',     align: 'center' },
    { key: 'standard',  header: 'Standard',  align: 'center' },
    { key: 'enterprise', header: 'Enterprise', align: 'center' },
  ];
  readonly pricingRows = [
    { feature: 'AI Agents',           trial: '9', standard: '9+',   enterprise: 'Unlimited' },
    { feature: 'Audit Trail',         trial: '✓', standard: '✓',    enterprise: '✓ Cryptographic' },
    { feature: 'On-prem Deployment',  trial: '—', standard: 'Add-on', enterprise: '✓ Included' },
    { feature: 'Bring-your-own LLM',  trial: '—', standard: '✓',    enterprise: '✓' },
    { feature: 'Dedicated Support',   trial: 'Email', standard: 'Email + Chat', enterprise: '24×7 + CSM' },
    { feature: 'Manual Billing',      trial: '✓', standard: '✓',    enterprise: '✓' },
  ];

  /** Carbon Accordion items derived from FAQ input. */
  readonly faqItems = computed<DosCarbonAccordionItem[]>(() =>
    this.faq.map((f) => ({ title: f.q, content: f.a })),
  );

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

  /** Imperatively navigate (Carbon button doesn't take href). */
  navigate(href: string): void {
    if (typeof window !== 'undefined' && href) window.location.assign(href);
  }

  // ─── M1.5 Download-Kit ───────────────────────────────────────────────
  @Input() downloadKitEyebrow = 'Take it with you';
  @Input() downloadKitTitle = 'Download the Shahin-AI Executive Kit';
  @Input() downloadKitBody = 'A concise pack for executives evaluating AI-native GRC.';
  @Input() downloadCtaLabel = 'Download kit';
  /** Pre-fetched marketing assets (host wires from /marketing/assets). */
  @Input() downloadAssets: ReadonlyArray<MarketingAsset> = [];
  /** Asset key to feature in the landing card slot. */
  @Input() featuredAssetKey = 'shahin-executive-overview';

  readonly modalOpen = signal(false);
  readonly downloadSuccess = signal(false);

  @Output() readonly downloadEvent = new EventEmitter<MarketingDownloadEvent>();

  readonly featuredAsset = computed<MarketingAsset | null>(() => {
    const list = this.downloadAssets;
    if (!list?.length) return null;
    return (
      list.find((a) => a.assetKey === this.featuredAssetKey && a.locale === this.locale)
      ?? list.find((a) => a.assetKey === this.featuredAssetKey)
      ?? null
    );
  });

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
}

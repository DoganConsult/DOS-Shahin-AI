/**
 * DosPageLayoutComponent — the canonical page layout enforced across ALL
 * workspace modules (Foundation, Compliance, Risk, Config Center, etc.).
 *
 * Design pattern: Foundation Overview (the approved role-model page).
 *
 * Structure:
 *   ┌──────────────────────────────────┬───────────────┐
 *   │  cds-tile (masthead card)        │ Context rail  │
 *   │  eyebrow / title / subtitle      │ (optional)    │
 *   │  status tags / action row        │               │
 *   ├──────────────────────────────────┤               │
 *   │  KPI strip (ng-content[kpi])     │               │
 *   ├──────────────────────────────────┤               │
 *   │  cds-tile > cds-tabs             │               │
 *   │  (tab panes via dosPageTab)      │               │
 *   └──────────────────────────────────┴───────────────┘
 *
 * Usage (plain content):
 *   <dos-page-layout
 *     eyebrow="Compliance"
 *     title="Overview"
 *     [loading]="loading()"
 *     [error]="error()">
 *     <p>page content</p>
 *   </dos-page-layout>
 *
 * Usage (with tabs — Foundation pattern):
 *   <dos-page-layout title="Compliance Overview" [loading]="loading()">
 *     <ng-container dosPageTab label="Summary">...</ng-container>
 *     <ng-container dosPageTab label="Frameworks (5)">...</ng-container>
 *   </dos-page-layout>
 *
 * Usage (with KPI strip + context rail):
 *   <dos-page-layout title="Foundation" [loading]="loading()">
 *     <ng-container dosPageKpi><!-- kpi grid --></ng-container>
 *     <ng-container dosPageRail><!-- rail content --></ng-container>
 *     <ng-container dosPageTab label="Activity">...</ng-container>
 *   </dos-page-layout>
 */

import {
  AfterContentInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  Directive,
  Input,
  QueryList,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NotificationModule,
  SkeletonModule,
  TabsModule,
  TilesModule,
  GridModule,
} from 'carbon-components-angular';

/** Marks a content-child as a tab pane. */
@Directive({ selector: '[dosPageTab]', standalone: true })
export class DosPageTabDirective {
  @Input('label') label = '';
  @Input('tabId') tabId = '';
  constructor(public readonly template: TemplateRef<unknown>) {}
}

/** Marks a content-child as the KPI strip (renders between masthead and tabs). */
@Directive({ selector: '[dosPageKpi]', standalone: true })
export class DosPageKpiDirective {
  constructor(public readonly template: TemplateRef<unknown>) {}
}

/** Marks a content-child for the right-side context rail. */
@Directive({ selector: '[dosPageRail]', standalone: true })
export class DosPageRailDirective {
  constructor(public readonly template: TemplateRef<unknown>) {}
}

@Component({
  selector: 'dos-page-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NotificationModule,
    SkeletonModule,
    TabsModule,
    TilesModule,
    GridModule,
  ],
  styles: [`
    :host { display: block; }

    /* ── Page wrapper ─────────────────────────────────────────────────── */
    .dpl-page {
      padding: var(--cds-spacing-06) var(--cds-spacing-07);
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-06);
    }
    @media (max-width: 672px) {
      .dpl-page { padding: var(--cds-spacing-05); }
    }

    /* ── Masthead tile (matches Foundation Overview cds-tile masthead) ── */
    .dpl-eyebrow {
      margin: 0 0 var(--cds-spacing-02);
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--cds-text-secondary, #525252);
    }
    .dpl-title {
      margin: var(--cds-spacing-03) 0 0;
      font: 400 var(--cds-productive-heading-05-font-size, 2rem)/1.2 var(--cds-font-family-sans);
      color: var(--cds-text-primary, #161616);
    }
    .dpl-subtitle {
      margin: var(--cds-spacing-02) 0 0;
      font: 400 var(--cds-body-compact-01-font-size, 0.875rem)/1.4 var(--cds-font-family-sans);
      color: var(--cds-text-secondary, #525252);
    }
    .dpl-actions-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--cds-spacing-03);
      margin-top: var(--cds-spacing-04);
    }

    /* ── Content tile with tabs ───────────────────────────────────────── */
    .dpl-content-tile {
      /* tabs render inside a cds-tile for visual grouping */
    }
    .dpl-plain-content {
      /* plain content wrapper when no tabs */
    }

    /* ── Rail layout (12col + 4col) ──────────────────────────────────── */
    .dpl-with-rail {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: var(--cds-spacing-05);
      align-items: start;
    }
    @media (max-width: 1055px) {
      .dpl-with-rail { grid-template-columns: 1fr; }
    }
    .dpl-rail-col {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-05);
    }

    /* ── Skeleton ────────────────────────────────────────────────────── */
    .dpl-skeleton {
      display: grid;
      gap: var(--cds-spacing-05);
    }

    /* ── Section title (matches fo-section-title) ────────────────────── */
    .dpl-section-title {
      font: 600 var(--cds-heading-03-font-size, 1.25rem)/1.4 var(--cds-font-family-sans);
      color: var(--cds-text-primary);
      margin: 0 0 var(--cds-spacing-04);
    }
  `],
  template: `
    <div class="dpl-page"
         [attr.data-page-id]="pageId || null"
         [attr.data-module]="module || null"
         [attr.dir]="dir || null">

      <!-- ══ MASTHEAD TILE (Foundation pattern: cds-tile with title+actions) ══ -->
      <cds-tile>
        @if (eyebrow) {
          <p class="dpl-eyebrow" aria-hidden="true">{{ eyebrow }}</p>
        }
        <h1 class="dpl-title" [id]="pageId + '-heading'">{{ title }}</h1>
        @if (subtitle) {
          <p class="dpl-subtitle">{{ subtitle }}</p>
        }

        <!-- Action row: status tags + action buttons via content projection -->
        @if (hasActions) {
          <div class="dpl-actions-row" role="toolbar"
               [attr.aria-label]="title + ' actions'">
            <ng-content select="[dosPageActions]" />
          </div>
        }
      </cds-tile>

      <!-- ══ ERROR / WARNING ══ -->
      @if (error) {
        <cds-notification
          [notificationObj]="{
            type: 'error',
            title: errorTitle,
            message: error,
            lowContrast: true
          }"
          [id]="pageId + '-error'"
          role="alert">
        </cds-notification>
      }

      <!-- ══ LOADING SKELETON ══ -->
      @if (loading) {
        <div class="dpl-skeleton" aria-busy="true" aria-label="Loading">
          <cds-skeleton-text [lines]="2" [heading]="true"></cds-skeleton-text>
          <cds-skeleton-text [lines]="4"></cds-skeleton-text>
          <cds-skeleton-placeholder></cds-skeleton-placeholder>
          <cds-skeleton-text [lines]="3"></cds-skeleton-text>
        </div>
      }

      @if (!loading) {
        <!-- ══ KPI STRIP (between masthead and content card) ══ -->
        @if (kpiDirectives.length > 0) {
          @for (kpi of kpiDirectives; track $index) {
            <ng-container [ngTemplateOutlet]="kpi.template" />
          }
        }

        <!-- ══ MAIN CONTENT: with or without rail ══ -->
        @if (railDirectives.length > 0) {
          <div class="dpl-with-rail">
            <!-- Main content column -->
            <div>
              @if (tabs.length > 0) {
                <cds-tile class="dpl-content-tile">
                  @if (contentTitle) {
                    <h2 class="dpl-section-title">{{ contentTitle }}</h2>
                  }
                  <cds-tabs [type]="tabType">
                    @for (tab of tabs; track tab.label) {
                      <cds-tab [heading]="tab.label" [id]="tab.tabId || (pageId + '-tab-' + $index)">
                        <ng-container [ngTemplateOutlet]="tab.template" />
                      </cds-tab>
                    }
                  </cds-tabs>
                </cds-tile>
              } @else {
                <div class="dpl-plain-content">
                  <ng-content />
                </div>
              }
            </div>
            <!-- Right context rail -->
            <aside class="dpl-rail-col" aria-label="Context rail">
              @for (rail of railDirectives; track $index) {
                <ng-container [ngTemplateOutlet]="rail.template" />
              }
            </aside>
          </div>
        } @else {
          <!-- No rail: full-width tabs or content -->
          @if (tabs.length > 0) {
            <cds-tile class="dpl-content-tile">
              @if (contentTitle) {
                <h2 class="dpl-section-title">{{ contentTitle }}</h2>
              }
              <cds-tabs [type]="tabType">
                @for (tab of tabs; track tab.label) {
                  <cds-tab [heading]="tab.label" [id]="tab.tabId || (pageId + '-tab-' + $index)">
                    <ng-container [ngTemplateOutlet]="tab.template" />
                  </cds-tab>
                }
              </cds-tabs>
            </cds-tile>
          } @else {
            <div class="dpl-plain-content">
              <ng-content />
            </div>
          }
        }
      }
    </div>
  `,
})
export class DosPageLayoutComponent implements AfterContentInit {
  /** Eyebrow above h1 (e.g. "PLATFORM DNA / FOUNDATION") */
  @Input() eyebrow = '';
  /** Page h1 title — required */
  @Input({ required: true }) title = '';
  /** Optional subtitle line below title */
  @Input() subtitle = '';
  /** Inline error message */
  @Input() error: string | null = null;
  /** Error notification title */
  @Input() errorTitle = 'Error';
  /** Show skeleton instead of content */
  @Input() loading = false;
  /** Remove content padding */
  @Input() noPad = false;
  /** Tab style: 'line' | 'contained' */
  @Input() tabType: 'line' | 'contained' = 'line';
  /** Optional h2 above the tab content card */
  @Input() contentTitle = '';
  /** ID prefix for aria/QA */
  @Input() pageId = 'page';
  /** data-module attribute for theme/layout selectors */
  @Input() module = '';
  /** dir attribute: 'ltr' | 'rtl' */
  @Input() dir: 'ltr' | 'rtl' | '' = '';
  /** Whether actions slot has content */
  @Input() hasActions = false;

  @ContentChildren(DosPageTabDirective)  private tabChildren!:  QueryList<DosPageTabDirective>;
  @ContentChildren(DosPageKpiDirective)  private kpiChildren!:  QueryList<DosPageKpiDirective>;
  @ContentChildren(DosPageRailDirective) private railChildren!: QueryList<DosPageRailDirective>;

  tabs:           DosPageTabDirective[]  = [];
  kpiDirectives:  DosPageKpiDirective[]  = [];
  railDirectives: DosPageRailDirective[] = [];

  ngAfterContentInit(): void {
    this.tabs           = this.tabChildren.toArray();
    this.kpiDirectives  = this.kpiChildren.toArray();
    this.railDirectives = this.railChildren.toArray();
  }
}

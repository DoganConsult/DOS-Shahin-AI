/**
 * Template 1 — Module Overview / Posture
 * Story role: "Here's your full situation — landscape + health + what's trending."
 *
 * Role-adaptive:
 *   full        → all KPIs + NBA + charts + action buttons
 *   read-only   → KPIs + charts (no action buttons)
 *   limited     → only My Tasks rail + limited KPIs
 *
 * IBM Carbon used (all active in dos.ui_carbon_components):
 *   tiles · tabs · tag · notification · skeleton · ai-label ·
 *   breadcrumb · button · combo-button · structured-list · progress-bar
 */
import {
  Component, Input, Output, EventEmitter, computed, signal,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, OnInit, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule,
  SkeletonModule, BreadcrumbModule, ButtonModule, ComboButtonModule,
  StructuredListModule, ProgressBarModule, GridModule, LayerModule,
  ContentSwitcherModule, LinkModule, IconModule
} from 'carbon-components-angular';
import {
  ModuleKpi, ModuleAction, ModuleTab, ModuleNotification,
  ModuleRole, resolveViewMode, RoleViewMode, ModuleInsightPillars
} from './module-template.types';
import { DosInsightBarComponent } from './dos-insight-bar.component';


@Component({
  selector: 'dos-command-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule,
    SkeletonModule, BreadcrumbModule, ButtonModule, ComboButtonModule,
    StructuredListModule, ProgressBarModule, GridModule, LayerModule,
    ContentSwitcherModule, LinkModule, IconModule,
    DosInsightBarComponent,
  ],

  template: `
    <!-- ── Loading skeleton ───────────────────────────────────────── -->
    @if (loading) {
      <div class="dmt-overview-skeleton">
        <div class="dmt-page-header dmt-page-header--skeleton">
          <div cdsSkeletonText [lines]="1" heading></div>
        </div>
        <div class="dmt-kpi-strip">
          @for (n of [1,2,3,4]; track n) {
            <cds-tile class="dmt-kpi-skeleton"><div cdsSkeletonText [lines]="3"></div></cds-tile>
          }
        </div>
      </div>
    }

    <!-- ── Error banner ───────────────────────────────────────────── -->
    @if (notification) {
      <cds-notification
        [notificationType]="notification.type"
        [title]="notification.title"
        [subtitle]="notification.subtitle ?? ''"
        [showClose]="true"
        lowContrast>
      </cds-notification>
    }

    <!-- ── Compact page header (Carbon page-header pattern) ───────── -->
    @if (!loading) {
      <header class="dmt-page-header" data-testid="dos-tpl-page-header">
        <div class="dmt-page-header__row dmt-page-header__row--top">
          @if (eyebrow) {
            <cds-breadcrumb [noTrailingSlash]="true" class="dmt-page-header__breadcrumb">
              <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
            </cds-breadcrumb>
          }
          @if (aiHeadline) {
            <cds-ai-label class="dmt-page-header__ai" kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label>
          }
          <div class="dmt-page-header__actions">
            @if (statusTags.length) {
              @for (tag of statusTags; track tag.label) {
                <cds-tag [type]="tagType(tag.severity)" size="sm">{{ tag.label }}</cds-tag>
              }
            }
            @if (viewMode() !== 'limited') {
              @if (primaryAction) {
                <button cdsButton="primary" size="sm"
                  (click)="triggerAction(primaryAction)">
                  {{ primaryAction.label }}
                </button>
              }
              @if (secondaryActions.length && viewMode() === 'full') {
                @for (action of secondaryActions; track action.actionKey || action.commandKey || action.route || action.label) {
                  <button cdsButton="tertiary" size="sm" (click)="triggerAction(action)">
                    {{ action.label }}
                  </button>
                }
              }
            }
          </div>
        </div>
        <div class="dmt-page-header__row dmt-page-header__row--title">
          <h1 class="dmt-page-header__title">{{ title }}</h1>
          @if (subtitle) {
            <p class="dmt-page-header__subtitle">{{ subtitle }}</p>
          }
          @if (heroKpi) {
            <span class="dmt-page-header__hero">
              <strong>{{ heroKpi.value }}</strong>
              @if (heroKpi.label) { <span class="dmt-page-header__hero-label">{{ heroKpi.label }}</span> }
              @if (heroKpi.delta) { <span class="dmt-page-header__hero-delta">{{ heroKpi.delta }}</span> }
            </span>
          }
        </div>
      </header>

      <!-- ── 5-Pillar Insight Bar ────────────────────────────────── -->
      <dos-insight-bar
        [pillars]="pillars"
        archetype="command-home"
        (actionClick)="triggerAction(pillars?.nextAction ?? null)">
      </dos-insight-bar>

            <!-- ── KPI strip ──────────────────────────────────────────────── -->
      @if (kpis.length) {
        <div class="dmt-kpi-strip">
          @for (kpi of visibleKpis(); track kpi.label) {
            <cds-clickable-tile
              class="dmt-kpi-card"
              [routerLink]="kpi.link ?? null">
              <p class="dmt-kpi-label">{{ kpi.label }}</p>
              <p class="dmt-kpi-value" [class]="'dmt-kpi-value--' + (kpi.status ?? 'info')">
                {{ kpi.value }}
              </p>
              @if (kpi.delta) {
                <span class="dmt-kpi-delta" [class]="'dmt-delta--' + (kpi.deltaDirection ?? 'neutral')">
                  {{ kpi.delta }}
                </span>
              }
              @if (kpi.aiInsight) {
                <cds-ai-label kind="inline" size="sm">{{ kpi.aiInsight }}</cds-ai-label>
              }
            </cds-clickable-tile>
          }
        </div>
      }

      <!-- ── Main content: tabs + rail ─────────────────────────────── -->
      <div class="dmt-body-grid">
        <!-- Tabs section -->
        <div class="dmt-tabs-col">
          @if (tabs.length) {
            <cds-tile class="dmt-tabs-tile">
              <cds-tabs type="line" [followFocus]="true">
                @for (tab of visibleTabs(); track tab.id) {
                  <cds-tab [id]="tab.id" [heading]="tab.label">
                    <ng-content [select]="'[dosTab=' + tab.id + ']'"></ng-content>
                  </cds-tab>
                }
              </cds-tabs>
            </cds-tile>
          } @else {
            <!-- No tabs — slot for direct content -->
            <cds-tile class="dmt-content-tile">
              <ng-content></ng-content>
            </cds-tile>
          }
        </div>

        <!-- Context rail (role-gated: limited users see minimal rail) -->
        <div class="dmt-rail-col">
          <!-- AI Next Best Actions -->
          @if (nbaActions.length && viewMode() !== 'limited') {
            <cds-tile class="dmt-rail-tile">
              <cds-ai-label kind="inline" size="sm">AI Recommendations</cds-ai-label>
              <cds-structured-list>
                <cds-list-header>
                  <cds-list-column>Priority</cds-list-column>
                  <cds-list-column>Action</cds-list-column>
                </cds-list-header>
                @for (action of nbaActions.slice(0,5); track action.label; let i = $index) {
                  <cds-list-row>
                    <cds-list-column>
                      <cds-tag [type]="nbaTagType(action.severity)">{{ i + 1 }}</cds-tag>
                    </cds-list-column>
                    <cds-list-column>
                      <a cdsLink [routerLink]="action.route ?? null">{{ action.label }}</a>
                      @if (action.aiScore) {
                        <cds-ai-label kind="inline" size="sm">Score: {{ action.aiScore }}</cds-ai-label>
                      }
                    </cds-list-column>
                  </cds-list-row>
                }
              </cds-structured-list>
            </cds-tile>
          }

          <!-- Custom rail content -->
          <ng-content select="[dosRail]"></ng-content>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; padding: 0; }

    /* ── Compact page header (Carbon page-header pattern) ─────────
       Doctrine: ≤72px desktop; no hero-style empty space; subtitle
       inline next to title. Page content begins immediately after
       this header — no large blank area above/below. */
    .dmt-page-header {
      display: flex;
      flex-direction: column;
      padding-block: 0.375rem 0.5rem;
      padding-inline: 1rem;
      margin-block-end: 0.75rem;
      background: var(--cds-layer);
      border-block-end: 1px solid var(--cds-border-subtle);
    }
    .dmt-page-header__row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-inline-size: 0;
    }
    .dmt-page-header__row--top {
      justify-content: space-between;
      min-block-size: 1.25rem;
    }
    .dmt-page-header__row--title {
      flex-wrap: wrap;
      min-block-size: 1.75rem;
    }
    .dmt-page-header__breadcrumb { font-size: 0.75rem; line-height: 1; }
    .dmt-page-header__ai { font-size: 0.75rem; }
    .dmt-page-header__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: nowrap;
      margin-inline-start: auto;
    }
    .dmt-page-header__title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-inline-size: 40%;
    }
    .dmt-page-header__subtitle {
      font-size: 0.8125rem;
      color: var(--cds-text-secondary);
      margin: 0;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1 1 auto;
      min-inline-size: 0;
    }
    .dmt-page-header__hero {
      display: inline-flex; align-items: baseline; gap: 0.375rem;
      font-size: 0.875rem;
    }
    .dmt-page-header__hero strong { font-size: 1rem; font-weight: 600; }
    .dmt-page-header__hero-label { color: var(--cds-text-secondary); font-size: 0.75rem; }
    .dmt-page-header__hero-delta { color: var(--cds-text-secondary); font-size: 0.75rem; }

    /* KPI strip */
    .dmt-kpi-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1px; margin-bottom: 1rem; }
    .dmt-kpi-card { padding: 1rem; }
    .dmt-kpi-label { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0 0 0.25rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .dmt-kpi-value { font-size: 2rem; font-weight: 300; margin: 0; line-height: 1; }
    .dmt-kpi-value--critical { color: var(--cds-support-error); }
    .dmt-kpi-value--warning  { color: var(--cds-support-warning); }
    .dmt-kpi-value--success  { color: var(--cds-support-success); }
    .dmt-kpi-delta { font-size: 0.75rem; }
    .dmt-delta--up   { color: var(--cds-support-error); }
    .dmt-delta--down { color: var(--cds-support-success); }

    /* Body grid */
    .dmt-body-grid { display: grid; grid-template-columns: 1fr 280px; gap: 1rem; align-items: start; }
    .dmt-tabs-tile { padding: 0; }
    .dmt-content-tile { padding: 1.5rem; }
    .dmt-rail-col { display: flex; flex-direction: column; gap: 1rem; }
    .dmt-rail-tile { padding: 1rem; }

    /* Skeleton */
    .dmt-overview-skeleton { display: flex; flex-direction: column; gap: 1rem; }
    .dmt-page-header--skeleton { min-block-size: 56px; }
    .dmt-kpi-skeleton { height: 100px; }

    @media (max-width: 1024px) {
      .dmt-body-grid { grid-template-columns: 1fr; }
      .dmt-rail-col { display: none; }
    }
    @media (max-width: 768px) {
      .dmt-page-header { padding-inline: 0.75rem; }
      .dmt-page-header__row--title { flex-wrap: wrap; }
      .dmt-page-header__title { max-inline-size: 100%; font-size: 1rem; }
      .dmt-page-header__subtitle { white-space: normal; flex-basis: 100%; }
      .dmt-page-header__hero { display: none; }
    }
  `]
})
export class ModuleOverviewTemplateComponent implements OnInit {
  @Input() eyebrow = '';
  @Input() title = '';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() heroKpi: ModuleKpi | null = null;
  @Input() kpis: ModuleKpi[] = [];
  @Input() tabs: ModuleTab[] = [];
  @Input() nbaActions: ModuleAction[] = [];
  @Input() statusTags: Array<{ label: string; severity?: string }> = [];
  @Input() primaryAction: ModuleAction | null = null;
  @Input() secondaryActions: ModuleAction[] = [];
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() maxKpis = 4;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Output() actionTriggered = new EventEmitter<{ key: string; payload?: Record<string, unknown> }>();


  viewMode = computed<RoleViewMode>(() => resolveViewMode(this.currentRole, this.writeRoles));

  visibleKpis = computed(() => {
    if (this.viewMode() === 'limited') return this.kpis.slice(0, 2);
    return this.kpis.slice(0, this.maxKpis);
  });

  visibleTabs = computed(() => {
    if (this.viewMode() === 'limited') return this.tabs.filter(t => !t.permission || t.permission.endsWith('.read'));
    return this.tabs;
  });

  ngOnInit() {}

  tagType(severity?: string): string {
    const map: Record<string, string> = {
      critical: 'red', warning: 'warm-gray', success: 'green',
      high: 'orange', medium: 'yellow', low: 'teal', info: 'blue'
    };
    return map[severity ?? 'info'] ?? 'gray';
  }

  nbaTagType(severity?: string): string {
    return this.tagType(severity);
  }

  triggerAction(action: ModuleAction | null, payload?: Record<string, unknown>): void {
    if (!action) return;
    if (action.actionKey) {
      this.actionTriggered.emit({ key: action.actionKey, payload });
      return;
    }
    if (action.commandKey) {
      this.actionTriggered.emit({ key: action.commandKey, payload });
      return;
    }
    if (action.route) {
      this.actionTriggered.emit({ key: 'navigate', payload: { path: action.route, ...(payload ?? {}) } });
    }
  }
}

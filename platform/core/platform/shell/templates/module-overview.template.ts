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
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule,
  SkeletonModule, BreadcrumbModule, ButtonModule,
  StructuredListModule, GridModule, LinkModule
} from 'carbon-components-angular';
import {
  ModuleKpi, ModuleAction, ModuleTab, ModuleNotification,
  ModuleRole, resolveViewMode, RoleViewMode, ModuleInsightPillars
} from './module-template.types';

interface OverviewTabRow {
  label: string;
  value: string | number;
}

interface OverviewTabPanel {
  id: string;
  rows: OverviewTabRow[];
}

interface WorkspaceCard {
  id: string;
  title: string;
  description: string;
  route: string | null;
  badge?: string | number;
}

@Component({
  selector: 'dos-command-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule,
    SkeletonModule, BreadcrumbModule, ButtonModule,
    StructuredListModule, GridModule, LinkModule,
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

    @if (!loading) {
      @if (isWorkspaceHome()) {
        <div cdsGrid [fullWidth]="true" class="dmt-carbon-page" data-testid="dos-command-home-workspace">
          <div cdsRow>
            <div cdsCol [columnNumbers]="{ lg: 16, md: 8, sm: 4 }">
              @if (workspaceCards().length) {
                <section class="dmt-section">
                  <div cdsGrid [fullWidth]="true" [condensed]="true">
                    <div cdsRow>
                      @for (card of workspaceCards(); track card.id) {
                        <div cdsCol [columnNumbers]="{ lg: 4, md: 4, sm: 4 }">
                          <cds-clickable-tile class="dmt-summary-tile" [routerLink]="card.route ?? null">
                            <p class="dmt-tile-eyebrow">{{ card.title }}</p>
                            <p class="dmt-tile-body">{{ card.description }}</p>
                            @if (card.badge) {
                              <cds-tag type="blue" size="sm">{{ card.badge }}</cds-tag>
                            }
                          </cds-clickable-tile>
                        </div>
                      }
                    </div>
                  </div>
                </section>
              } @else {
                <section class="dmt-section">
                  <cds-tile class="dmt-tabs-tile">
                    <cds-inline-notification
                      kind="info"
                      [title]="title"
                      [subtitle]="subtitle || ''"
                      [hideCloseButton]="true"
                      lowContrast>
                    </cds-inline-notification>
                  </cds-tile>
                </section>
              }
            </div>
          </div>
        </div>
      } @else {
        <div cdsGrid [fullWidth]="true" class="dmt-carbon-page" data-testid="dos-command-home-page">
          <div cdsRow>
            <div cdsCol [columnNumbers]="{ lg: 16, md: 8, sm: 4 }">
              <section class="dmt-page-header" data-testid="dos-tpl-page-header">
                <div class="dmt-page-header__context">
                  <cds-breadcrumb [noTrailingSlash]="true" class="dmt-page-header__breadcrumb">
                    @if (eyebrow) {
                      <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
                    }
                    @if (title) {
                      <cds-breadcrumb-item [current]="true">{{ title }}</cds-breadcrumb-item>
                    }
                  </cds-breadcrumb>
                </div>
                <div class="dmt-page-header__main">
                  <div class="dmt-page-header__copy">
                    <h1 class="dmt-page-header__title">{{ title }}</h1>
                    @if (subtitle) {
                      <p class="dmt-page-header__subtitle">{{ subtitle }}</p>
                    }
                  </div>
                  <div class="dmt-page-header__actions">
                    @for (tag of statusTags; track tag.label) {
                      <cds-tag [type]="tagType(tag.severity)" size="sm">{{ tag.label }}</cds-tag>
                    }
                    @if (viewMode() !== 'limited' && primaryAction) {
                      <button cdsButton="primary" size="sm" type="button" (click)="triggerAction(primaryAction)">
                        {{ actionLabel(primaryAction) }}
                      </button>
                    }
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div cdsRow class="dmt-page-grid-row">
            <div cdsCol [columnNumbers]="{ lg: 12, md: 8, sm: 4 }">
              <div class="dmt-main-stack">
                @if (summaryTiles().length) {
                  <section class="dmt-section">
                    <div cdsGrid [fullWidth]="true" class="dmt-summary-grid" [condensed]="true">
                      <div cdsRow>
                        @for (tile of summaryTiles(); track tile.label) {
                          <div cdsCol [columnNumbers]="{ lg: 4, md: 4, sm: 4 }">
                            <cds-tile class="dmt-summary-tile">
                              <p class="dmt-tile-eyebrow">{{ tile.label }}</p>
                              <p class="dmt-tile-body">{{ tile.value }}</p>
                            </cds-tile>
                          </div>
                        }
                      </div>
                    </div>
                  </section>
                }

                @if (visibleKpis().length) {
                  <section class="dmt-section">
                    <div cdsGrid [fullWidth]="true" class="dmt-metrics-grid" [condensed]="true">
                      <div cdsRow>
                        @for (kpi of visibleKpis(); track kpi.label) {
                          <div cdsCol [columnNumbers]="{ lg: 3, md: 4, sm: 4 }">
                            <cds-clickable-tile class="dmt-kpi-card" [routerLink]="kpi.link ?? null">
                              <p class="dmt-kpi-label">{{ kpiLabel(kpi) }}</p>
                              <p class="dmt-kpi-value" [class]="'dmt-kpi-value--' + (kpi.status ?? 'info')">
                                {{ kpi.value }}
                              </p>
                              @if (kpi.aiInsight) {
                                <p class="dmt-kpi-insight">{{ kpi.aiInsight }}</p>
                              }
                            </cds-clickable-tile>
                          </div>
                        }
                      </div>
                    </div>
                  </section>
                }

                <section class="dmt-section">
                  <cds-tile class="dmt-tabs-tile">
                    @if (visibleTabs().length && hasRenderableTabs()) {
                      <cds-tabs type="line" [followFocus]="false">
                        @for (tab of visibleTabs(); track tab.id) {
                          <cds-tab [id]="tab.id" [heading]="tabLabel(tab)">
                            @if (tabPanel(tab.id); as panel) {
                              <cds-structured-list class="dmt-tab-list">
                                <cds-list-header>
                                  <cds-list-column>{{ tabLabel(tab) }}</cds-list-column>
                                  <cds-list-column></cds-list-column>
                                </cds-list-header>
                                @for (row of panel.rows; track row.label) {
                                  <cds-list-row>
                                    <cds-list-column>{{ row.label }}</cds-list-column>
                                    <cds-list-column>{{ row.value }}</cds-list-column>
                                  </cds-list-row>
                                }
                              </cds-structured-list>
                            } @else {
                              <cds-inline-notification
                                kind="info"
                                [title]="tabLabel(tab)"
                                subtitle=""
                                [hideCloseButton]="true"
                                lowContrast>
                              </cds-inline-notification>
                            }
                          </cds-tab>
                        }
                      </cds-tabs>
                    } @else {
                      <cds-inline-notification
                        kind="info"
                        [title]="title"
                        subtitle=""
                        [hideCloseButton]="true"
                        lowContrast>
                      </cds-inline-notification>
                    }
                  </cds-tile>
                </section>
              </div>
            </div>

            <div cdsCol [columnNumbers]="{ lg: 4, md: 8, sm: 4 }">
              @if ((nbaActions.length && viewMode() !== 'limited')) {
                <aside class="dmt-insight-panel" [attr.aria-label]="aiHeadline || null">
                  <cds-tile class="dmt-insight-panel__tile">
                    @if (aiHeadline) {
                      <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label>
                    }
                    <cds-structured-list class="dmt-recommendations-list">
                      @for (action of nbaActions.slice(0,5); track action.label; let i = $index) {
                        <cds-list-row>
                          <cds-list-column>
                            <cds-tag [type]="nbaTagType(action.severity)">{{ i + 1 }}</cds-tag>
                          </cds-list-column>
                          <cds-list-column>
                            <a cdsLink [routerLink]="action.route ?? null">{{ actionLabel(action) }}</a>
                            @if (action.aiScore) {
                              <span class="dmt-score">{{ action.aiScore }}</span>
                            }
                          </cds-list-column>
                        </cds-list-row>
                      }
                    </cds-structured-list>
                  </cds-tile>
                </aside>
              }
              <ng-content select="[dosRail]"></ng-content>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; padding: 0; }

    .dmt-carbon-page {
      inline-size: 100%;
      max-inline-size: 100%;
      padding-inline: 0;
    }
    .dmt-page-grid-row {
      align-items: start;
    }
    .dmt-main-stack {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-04);
      min-inline-size: 0;
    }
    .dmt-section {
      margin: 0;
      min-inline-size: 0;
    }
    .dmt-page-header {
      display: flex;
      flex-direction: column;
      gap: var(--cds-spacing-03);
      padding-block-end: var(--cds-spacing-03);
      margin-block-end: var(--cds-spacing-03);
      background: transparent;
      border-block-end: 1px solid var(--cds-border-subtle);
    }
    .dmt-page-header__context {
      min-block-size: var(--cds-spacing-06);
      display: flex;
      align-items: center;
    }
    .dmt-page-header__breadcrumb {
      font-size: var(--cds-label-01-font-size);
      line-height: var(--cds-label-01-line-height);
    }
    .dmt-page-header__main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--cds-spacing-05);
      min-inline-size: 0;
      min-block-size: var(--cds-spacing-07);
    }
    .dmt-page-header__copy {
      min-inline-size: 0;
      flex: 1 1 auto;
    }
    .dmt-page-header__actions,
    .dmt-insight-panel__actions {
      display: flex;
      align-items: center;
      gap: var(--cds-spacing-03);
      flex-wrap: wrap;
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
    }
    .dmt-page-header__subtitle {
      font-size: var(--cds-body-compact-01-font-size);
      color: var(--cds-text-secondary);
      margin: 0;
      line-height: var(--cds-body-compact-01-line-height);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dmt-summary-grid,
    .dmt-metrics-grid {
      inline-size: 100%;
      padding-inline: 0;
    }
    .dmt-summary-tile,
    .dmt-kpi-card,
    .dmt-tabs-tile,
    .dmt-insight-panel__tile {
      inline-size: 100%;
      block-size: 100%;
    }
    .dmt-summary-tile,
    .dmt-kpi-card {
      padding: var(--cds-spacing-05);
    }
    .dmt-tile-eyebrow,
    .dmt-kpi-label {
      font-size: var(--cds-label-01-font-size);
      line-height: var(--cds-label-01-line-height);
      color: var(--cds-text-secondary);
      margin: 0 0 var(--cds-spacing-03);
      text-transform: uppercase;
      letter-spacing: var(--cds-label-01-letter-spacing);
    }
    .dmt-tile-body,
    .dmt-kpi-insight {
      color: var(--cds-text-secondary);
      font-size: var(--cds-body-compact-01-font-size);
      line-height: var(--cds-body-compact-01-line-height);
      margin: 0;
    }
    .dmt-kpi-value { font-size: 1.75rem; font-weight: 300; margin: 0; line-height: 1; }
    .dmt-kpi-value--critical { color: var(--cds-support-error); }
    .dmt-kpi-value--warning  { color: var(--cds-support-warning); }
    .dmt-kpi-value--success  { color: var(--cds-support-success); }
    .dmt-kpi-insight {
      margin-block-start: var(--cds-spacing-03);
    }
    .dmt-tabs-tile,
    .dmt-insight-panel__tile {
      padding: var(--cds-spacing-04);
    }
    .dmt-tab-list,
    .dmt-recommendations-list {
      margin-block-start: var(--cds-spacing-05);
    }
    .dmt-insight-panel {
      position: sticky;
      inset-block-start: var(--cds-spacing-05);
      display: block;
      min-inline-size: 0;
    }
    .dmt-score {
      display: inline-flex;
      margin-inline-start: var(--cds-spacing-03);
      color: var(--cds-text-secondary);
      font-size: var(--cds-label-01-font-size);
    }

    /* Skeleton */
    .dmt-overview-skeleton { display: flex; flex-direction: column; gap: var(--cds-spacing-05); }
    .dmt-page-header--skeleton { min-block-size: var(--cds-spacing-09); }
    .dmt-kpi-skeleton { block-size: 6rem; }

    @media (max-width: 671.98px) {
      .dmt-page-header__main {
        align-items: flex-start;
        flex-direction: column;
      }
      .dmt-page-header__actions {
        margin-inline-start: 0;
      }
      .dmt-page-header__subtitle {
        white-space: normal;
      }
      .dmt-insight-panel {
        position: static;
      }
    }
  `]
})
export class ModuleOverviewTemplateComponent implements OnInit {
  @Input() route = '';
  // DB-emitted landing route from `chrome.landingRoute`. Parent shell
  // passes the resolver-emitted value through. Empty string means the
  // resolver has not emitted a landing route — `isWorkspaceHome()`
  // returns false (no static `/workspace-home` literal anywhere).
  @Input() landingRoute = '';
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
  @Input() tabPanels: OverviewTabPanel[] = [];
  @Input() moduleCards: Array<Record<string, unknown>> = [];
  @Input() cards: Array<Record<string, unknown>> = [];
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

  workspaceCards = computed<WorkspaceCard[]>(() => {
    const rawCards = this.moduleCards.length ? this.moduleCards : this.cards;
    return rawCards
      .map((raw, idx): WorkspaceCard => {
        const action = raw['action'] as Record<string, unknown> | undefined;
        const routeFromAction = action?.['kind'] === 'navigate' ? String(action['path'] ?? '') : '';
        const route = String(raw['route'] ?? routeFromAction ?? '').trim();
        return {
          id: String(raw['id'] ?? raw['moduleCode'] ?? raw['title'] ?? idx),
          title: String(raw['title'] ?? raw['label'] ?? '').trim(),
          description: String(raw['description'] ?? raw['subtitle'] ?? '').trim(),
          route: route.length > 0 ? route : null,
          badge: (raw['badge'] as string | number | undefined),
        };
      })
      .filter((card) => card.title.length > 0 || card.description.length > 0);
  });

  summaryTiles = computed<OverviewTabRow[]>(() => {
    const p = this.pillars;
    if (!p) return [];
    const labels = p.labels ?? {};
    return [
      { label: labels.whatChanged ?? '', value: p.whatChanged ?? '' },
      { label: labels.whyItMatters ?? '', value: p.whyItMatters ?? '' },
      { label: labels.riskOrOpportunity ?? '', value: p.riskOrOpportunity ?? '' },
      { label: labels.evidence ?? '', value: p.evidence ?? '' },
    ].filter((row) => String(row.value).length > 0);
  });

  tabPanel(id: string): OverviewTabPanel | null {
    const explicit = this.tabPanels.find((panel) => panel.id === id);
    if (explicit && explicit.rows.length) return explicit;

    const p = this.pillars;
    const labels = p?.labels ?? {};
    const tabIndex = this.visibleTabs().findIndex((tab) => tab.id === id);
    const kpiRows = this.kpis.map((kpi) => ({ label: this.kpiLabel(kpi), value: kpi.value }));
    const actionRows = this.nbaActions.map((action) => ({
      label: this.actionLabel(action),
      value: action.aiScore ?? action.description ?? '',
    }));
    const pillarRows = [
      { label: labels.whatChanged ?? '', value: p?.whatChanged ?? '' },
      { label: labels.whyItMatters ?? '', value: p?.whyItMatters ?? '' },
      { label: labels.riskOrOpportunity ?? '', value: p?.riskOrOpportunity ?? '' },
      { label: labels.evidence ?? '', value: p?.evidence ?? '' },
    ];
    const generatedPanels: OverviewTabRow[][] = [
      pillarRows,
      kpiRows.slice(0, Math.max(1, Math.ceil(kpiRows.length / 2))),
      kpiRows.slice(Math.max(1, Math.ceil(kpiRows.length / 2))),
      actionRows,
    ];
    const rows = (generatedPanels[tabIndex] ?? [...pillarRows, ...kpiRows, ...actionRows])
      .filter((row) => String(row.label).length > 0 || String(row.value).length > 0);
    return rows.length ? { id, rows } : null;
  }

  hasRenderableTabs(): boolean {
    const tabs = this.visibleTabs();
    if (!tabs.length) return false;
    return this.tabPanel(tabs[0].id) !== null;
  }

  isWorkspaceHome(): boolean {
    // DB-driven landing-route comparison. Returns true only when the
    // resolver has emitted `chrome.landingRoute` AND the current route
    // matches it. Empty landingRoute => false (no inferred default).
    const landing = (this.landingRoute ?? '').trim();
    if (!landing) return false;
    return this.normalizeRoute(this.route) === this.normalizeRoute(landing);
  }

  private normalizeRoute(url: string): string {
    if (!url) return '';
    const q = url.indexOf('?');
    const u = q === -1 ? url : url.slice(0, q);
    const h = u.indexOf('#');
    const v = h === -1 ? u : u.slice(0, h);
    return v.length > 1 && v.endsWith('/') ? v.slice(0, -1) : v;
  }

  kpiLabel(kpi: ModuleKpi): string {
    return this.isRtl() ? (kpi.labelAr ?? kpi.label) : kpi.label;
  }

  tabLabel(tab: ModuleTab): string {
    return this.isRtl() ? (tab.labelAr ?? tab.label) : tab.label;
  }

  actionLabel(action: ModuleAction): string {
    return this.isRtl() ? (action.labelAr ?? action.label) : action.label;
  }

  private isRtl(): boolean {
    return typeof document !== 'undefined'
      && (document.documentElement.dir === 'rtl' || document.documentElement.lang?.startsWith('ar'));
  }

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

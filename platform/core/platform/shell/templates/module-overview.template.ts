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
        <cds-tile class="dmt-masthead-skeleton">
          <div cdsSkeletonText [lines]="1" heading></div>
          <div cdsSkeletonText [lines]="2"></div>
        </cds-tile>
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

    <!-- ── Masthead tile ──────────────────────────────────────────── -->
    @if (!loading) {
      <cds-tile class="dmt-masthead">
        <!-- Breadcrumb -->
        <cds-breadcrumb [noTrailingSlash]="true" class="dmt-eyebrow-breadcrumb">
          <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
        </cds-breadcrumb>

        <div class="dmt-masthead-content">
          <div class="dmt-masthead-left">
            <!-- AI Label (always first) -->
            @if (aiHeadline) {
              <cds-ai-label class="dmt-ai-headline" kind="inline" size="sm">
                {{ aiHeadline }}
              </cds-ai-label>
            }
            <h1 class="dmt-title">{{ title }}</h1>
            @if (subtitle) {
              <p class="dmt-subtitle">{{ subtitle }}</p>
            }

            <!-- Status tags -->
            <div class="dmt-tags-row">
              @for (tag of statusTags; track tag.label) {
                <cds-tag [type]="tagType(tag.severity)">{{ tag.label }}</cds-tag>
              }
            </div>

            <!-- Actions — role-gated -->
            @if (viewMode() !== 'limited') {
              <div class="dmt-actions-row">
                @if (primaryAction) {
                  <button cdsButton="primary" size="sm"
                    (click)="primaryAction.action?.()">
                    {{ primaryAction.label }}
                  </button>
                }
                @if (secondaryActions.length && viewMode() === 'full') {
                  <cds-combo-button [buttons]="secondaryActions" size="sm">
                    Actions
                  </cds-combo-button>
                }
              </div>
            }
          </div>

          <!-- Big number hero (right of masthead) -->
          @if (heroKpi) {
            <div class="dmt-masthead-hero">
              <!-- IBM Products cds-big-number (wrapper-required, custom element) -->
              <cds-big-number
                [value]="heroKpi.value"
                [label]="heroKpi.label"
                [percentage]="heroKpi.delta ?? ''"
                size="lg">
              </cds-big-number>
              @if (heroKpi.aiInsight) {
                <cds-ai-label kind="inline" size="sm">{{ heroKpi.aiInsight }}</cds-ai-label>
              }
            </div>
          }
        </div>
      </cds-tile>

      <!-- ── 5-Pillar Insight Bar ────────────────────────────────── -->
      <dos-insight-bar
        [pillars]="pillars"
        archetype="command-home"
        (actionClick)="pillars?.nextAction?.action?.()">
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
    .dmt-masthead { margin-bottom: 1rem; padding: 1.5rem 2rem; }
    .dmt-masthead-content { display: flex; justify-content: space-between; align-items: flex-start; }
    .dmt-masthead-left { flex: 1; }
    .dmt-masthead-hero { text-align: right; min-width: 160px; }
    .dmt-eyebrow-breadcrumb { margin-bottom: 0.5rem; }
    .dmt-title { font-size: 2rem; font-weight: 400; margin: 0.25rem 0; line-height: 1.25; }
    .dmt-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0.75rem; }
    .dmt-tags-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .dmt-actions-row { display: flex; gap: 0.5rem; align-items: center; }
    .dmt-ai-headline { margin-bottom: 0.5rem; }

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
    .dmt-masthead-skeleton { height: 160px; }
    .dmt-kpi-skeleton { height: 100px; }

    @media (max-width: 1024px) {
      .dmt-body-grid { grid-template-columns: 1fr; }
      .dmt-rail-col { display: none; }
    }
    @media (max-width: 768px) {
      .dmt-title { font-size: 1.5rem; }
      .dmt-masthead-content { flex-direction: column; }
      .dmt-masthead-hero { display: none; }
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
  @Input() secondaryActions: Array<{ content: string; click: () => void }> = [];
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() maxKpis = 4;
  @Input() pillars: ModuleInsightPillars | null = null;


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
}

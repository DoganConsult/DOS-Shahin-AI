/**
 * Template 10 — Trend Intelligence
 * Canonical Name: "Trend Intelligence"
 * Selector: dos-trend-intelligence
 * Story: "Here's where you're heading — trends, predictions, and inflection points."
 *
 * 5 Pillars: What trended / Why this trend matters / Predicted risk / Suggested action / Data basis
 *
 * IBM Carbon active: tiles · tabs · tag · ai-label · content-switcher · skeleton ·
 *   date-picker · button · notification · breadcrumb · progress-bar · structured-list
 */
import {
  Component, Input, Output, EventEmitter, computed,
  ChangeDetectionStrategy, CUSTOM_ELEMENTS_SCHEMA
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
  BreadcrumbModule, ButtonModule, ContentSwitcherModule, ProgressBarModule,
  StructuredListModule, LinkModule, DatePickerModule, DatePickerInputModule
} from 'carbon-components-angular';
import { DosInsightBarComponent } from './dos-insight-bar.component';
import {
  ModuleNotification, ModuleInsightPillars, ModuleRole, resolveViewMode
} from './module-template.types';

export interface TrendSeries {
  id: string;
  label: string;
  currentValue: number | string;
  previousValue?: number | string;
  changePercent?: number;
  trend: 'up' | 'down' | 'stable';
  trendMeaning: 'positive' | 'negative' | 'neutral'; // UP can be bad (risk count)
  aiPrediction?: string;
  status?: 'critical' | 'warning' | 'success' | 'info';
}

@Component({
  selector: 'dos-trend-intelligence',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule, RouterModule,
    TilesModule, TabsModule, TagModule, NotificationModule, SkeletonModule,
    BreadcrumbModule, ButtonModule, ContentSwitcherModule, ProgressBarModule,
    StructuredListModule, LinkModule, DatePickerModule, DatePickerInputModule,
    DosInsightBarComponent,
  ],
  template: `
    @if (notification) {
      <cds-notification [notificationType]="notification.type"
        [title]="notification.title" [subtitle]="notification.subtitle ?? ''"
        [showClose]="true" lowContrast>
      </cds-notification>
    }

    <!-- Masthead -->
    <cds-tile class="dti-masthead">
      <cds-breadcrumb [noTrailingSlash]="true">
        <cds-breadcrumb-item>{{ eyebrow }}</cds-breadcrumb-item>
      </cds-breadcrumb>
      @if (aiHeadline) { <cds-ai-label kind="inline" size="sm">{{ aiHeadline }}</cds-ai-label> }
      <h1 class="dti-title">{{ title }}</h1>
      @if (subtitle) { <p class="dti-subtitle">{{ subtitle }}</p> }
    </cds-tile>

    <!-- 5-Pillar Insight Bar -->
    <dos-insight-bar [pillars]="pillars" archetype="trend-intelligence"
      (actionClick)="pillars?.nextAction?.action?.()">
    </dos-insight-bar>

    <!-- Toolbar: time range + view -->
    <div class="dti-toolbar">
      <cds-content-switcher (selected)="onPeriodSwitch($event)">
        @for (p of periods; track p.id) {
          <button cdsContentSwitcherOption [name]="p.id">{{ p.label }}</button>
        }
      </cds-content-switcher>
      @if (viewMode() !== 'limited') {
        <cds-date-picker id="trend-date-range" type="range">
          <cds-date-picker-input id="trend-from" kind="from" label="From"></cds-date-picker-input>
          <cds-date-picker-input id="trend-to" kind="to" label="To"></cds-date-picker-input>
        </cds-date-picker>
        <button cdsButton="ghost" size="sm" (click)="export.emit()">Export</button>
      }
    </div>

    <!-- Loading -->
    @if (loading) {
      <cds-tile style="height:300px"><div cdsSkeletonText [lines]="1" style="height:260px"></div></cds-tile>
    }

    @if (!loading) {
      <!-- Primary chart slot -->
      <cds-tile class="dti-chart-main">
        <div class="dti-chart-header">
          <cds-ai-label kind="inline" size="sm">{{ aiChartLabel }}</cds-ai-label>
          <p class="dti-chart-title">{{ chartTitle }}</p>
        </div>
        <ng-content select="[dosTrendChart]"></ng-content>
      </cds-tile>

      <!-- Trend series cards + predictions -->
      <div class="dti-series-grid">
        @for (series of trendSeries; track series.id) {
          <cds-tile class="dti-series-card"
            [class]="'dti-series--' + (series.status ?? 'info')">
            <p class="dti-series-label">{{ series.label }}</p>
            <p class="dti-series-value">{{ series.currentValue }}</p>

            @if (series.changePercent !== undefined) {
              <div class="dti-series-delta">
                <cds-tag [type]="trendTagType(series)">
                  {{ series.trend === 'up' ? '↑' : series.trend === 'down' ? '↓' : '→' }}
                  {{ series.changePercent }}%
                </cds-tag>
                <span class="dti-prev">was {{ series.previousValue }}</span>
              </div>
            }

            @if (series.aiPrediction) {
              <div class="dti-prediction">
                <cds-ai-label kind="inline" size="sm">AI Forecast</cds-ai-label>
                <p class="dti-prediction-text">{{ series.aiPrediction }}</p>
              </div>
            }
          </cds-tile>
        } @empty {
          <cds-tile class="dti-empty-tile">
            <cds-ai-label kind="inline" size="sm">No trend data yet</cds-ai-label>
            <p>Run your first assessment to begin tracking trends.</p>
          </cds-tile>
        }
      </div>

      <!-- Secondary chart slot (breakdown / comparison) -->
      <div class="dti-secondary-grid">
        <cds-tile class="dti-secondary-chart">
          <p class="dti-section-label">Breakdown by Category</p>
          <ng-content select="[dosTrendChartB]"></ng-content>
        </cds-tile>
        <cds-tile class="dti-secondary-chart">
          <cds-ai-label kind="inline" size="sm">AI Predictions</cds-ai-label>
          <p class="dti-section-label">12-Month Forecast</p>
          <ng-content select="[dosTrendForecast]"></ng-content>
        </cds-tile>
      </div>

      <!-- Top insights from AI -->
      @if (aiInsights.length) {
        <cds-tile class="dti-insights-tile">
          <cds-ai-label kind="inline" size="sm">AI Trend Insights</cds-ai-label>
          <cds-structured-list>
            @for (insight of aiInsights; track insight.id) {
              <cds-list-row>
                <cds-list-column><cds-tag [type]="tagType(insight.severity)">{{ insight.severity }}</cds-tag></cds-list-column>
                <cds-list-column>{{ insight.text }}</cds-list-column>
                <cds-list-column>
                  @if (insight.action) {
                    <a cdsLink (click)="insightAction.emit(insight)">{{ insight.action }}</a>
                  }
                </cds-list-column>
              </cds-list-row>
            }
          </cds-structured-list>
        </cds-tile>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .dti-masthead { padding: 1.5rem 2rem; margin-bottom: 0; }
    .dti-title { font-size: 1.75rem; font-weight: 400; margin: 0.25rem 0; }
    .dti-subtitle { font-size: 0.875rem; color: var(--cds-text-secondary); margin: 0.25rem 0; }

    .dti-toolbar { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; background: var(--cds-layer); border-bottom: 1px solid var(--cds-border-subtle); flex-wrap: wrap; }

    .dti-chart-main { padding: 1.5rem; margin-top: 0.5rem; min-height: 300px; }
    .dti-chart-header { margin-bottom: 1rem; }
    .dti-chart-title { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0; }

    .dti-series-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .dti-series-card { padding: 1rem; border-left: 3px solid var(--cds-interactive); }
    .dti-series--critical { border-left-color: var(--cds-support-error); }
    .dti-series--warning  { border-left-color: var(--cds-support-warning); }
    .dti-series--success  { border-left-color: var(--cds-support-success); }
    .dti-series-label { font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--cds-text-secondary); margin: 0 0 0.25rem; }
    .dti-series-value { font-size: 2rem; font-weight: 300; margin: 0; }
    .dti-series-delta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
    .dti-prev { font-size: 0.75rem; color: var(--cds-text-secondary); }
    .dti-prediction { margin-top: 0.75rem; border-top: 1px solid var(--cds-border-subtle); padding-top: 0.75rem; }
    .dti-prediction-text { font-size: 0.75rem; color: var(--cds-text-secondary); margin: 0.25rem 0 0; }

    .dti-secondary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
    .dti-secondary-chart { padding: 1rem; min-height: 200px; }
    .dti-section-label { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; }
    .dti-insights-tile { padding: 1rem; margin-top: 1rem; }
    .dti-empty-tile { text-align: center; padding: 3rem; grid-column: 1/-1; }

    @media (max-width: 768px) {
      .dti-secondary-grid { grid-template-columns: 1fr; }
      .dti-series-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class TrendIntelligenceTemplateComponent {
  @Input() eyebrow = '';
  @Input() title = 'Trend Intelligence';
  @Input() subtitle = '';
  @Input() aiHeadline = '';
  @Input() loading = false;
  @Input() notification: ModuleNotification | null = null;
  @Input() pillars: ModuleInsightPillars | null = null;
  @Input() trendSeries: TrendSeries[] = [];
  @Input() aiInsights: Array<{ id: string; text: string; severity?: string; action?: string }> = [];
  @Input() chartTitle = 'Risk Score Trend';
  @Input() aiChartLabel = 'AI-analyzed 12 months';
  @Input() currentRole: ModuleRole = 'standard_user';
  @Input() writeRoles: ModuleRole[] = [];
  @Input() periods: Array<{ id: string; label: string }> = [
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '12m', label: '12 Months' },
    { id: 'ytd', label: 'YTD' },
  ];

  @Output() periodSwitch = new EventEmitter<string>();
  @Output() export = new EventEmitter<void>();
  @Output() insightAction = new EventEmitter<unknown>();

  viewMode = computed(() => resolveViewMode(this.currentRole, this.writeRoles));

  trendTagType(series: TrendSeries): string {
    if (series.trendMeaning === 'negative') return series.trend === 'up' ? 'red' : 'green';
    if (series.trendMeaning === 'positive') return series.trend === 'up' ? 'green' : 'red';
    return 'gray';
  }
  tagType(s?: string): string {
    return ({ critical: 'red', high: 'orange', medium: 'yellow', low: 'teal' } as Record<string, string>)[s ?? ''] ?? 'gray';
  }
  onPeriodSwitch(v: unknown) { this.periodSwitch.emit(String(v)); }
}

// ============================================
// Shahin GRC — Advanced Analytics Widget Component
// Real DB-driven analytics with multi-level drill-through
// ============================================

import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdvancedAnalyticsService, type AdvancedAnalyticsResult, type DrillThroughPath } from '@app/core/services/analytics/advanced-analytics.service';
import { DrillThroughService } from '../drill-through/drill-through.service';
import { SiteContextService } from '@app/core/services/platform/site-context.service';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-advanced-analytics-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="advanced-analytics-widget" [class.loading]="loading()">
      @if (loading()) {
        <div class="widget-loading">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ i18n.translate('Loading analytics...') }}</span>
        </div>
      } @else if (error()) {
        <div class="widget-error">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ error() }}</span>
        </div>
      } @else if (result()) {
        @let data = result()!;
        
        <!-- Main Analytics Data -->
        <div class="analytics-main">
          <h3 class="widget-title">{{ i18n.localize(data.metadata?.title, data.metadata?.titleAr) || widgetTitle }}</h3>
          
          <!-- Real-Time Metrics -->
          @if (data.realTimeMetrics && data.realTimeMetrics.length > 0) {
            <div class="metrics-grid">
              @for (metric of data.realTimeMetrics; track metric.key) {
                <div class="metric-card" [class.trend-up]="metric.trend === 'up'" [class.trend-down]="metric.trend === 'down'">
                  <div class="metric-label">{{ i18n.localize(metric.label, metric.labelAr) }}</div>
                  <div class="metric-value">
                    {{ formatValue(metric.value) }}{{ metric.unit || '' }}
                    @if (metric.changePercent !== undefined) {
                      <span class="metric-change" [class.positive]="metric.changePercent > 0" [class.negative]="metric.changePercent < 0">
                        {{ metric.changePercent > 0 ? '+' : '' }}{{ metric.changePercent.toFixed(1) }}%
                      </span>
                    }
                  </div>
                  @if (metric.trend) {
                    <i class="pi" [class.pi-arrow-up]="metric.trend === 'up'" [class.pi-arrow-down]="metric.trend === 'down'" [class.pi-minus]="metric.trend === 'stable'"></i>
                  }
                </div>
              }
            </div>
          }

          <!-- Chart/Visualization Area -->
          <div class="analytics-chart">
            <!-- This will be rendered by chart components based on widget type -->
            <ng-content></ng-content>
          </div>
        </div>

        <!-- Predictive Insights -->
        @if (data.predictiveInsights && data.predictiveInsights.length > 0) {
          <div class="insights-section">
            <h4 class="insights-title">{{ i18n.translate('Predictive Insights') }}</h4>
            <div class="insights-list">
              @for (insight of data.predictiveInsights; track insight.title) {
                <div class="insight-card" [class.severity-critical]="insight.severity === 'critical'" [class.severity-warning]="insight.severity === 'warning'">
                  <div class="insight-header">
                    <i class="pi" [class.pi-info-circle]="insight.severity === 'info'" [class.pi-exclamation-triangle]="insight.severity === 'warning'" [class.pi-times-circle]="insight.severity === 'critical'"></i>
                    <span class="insight-title">{{ i18n.localize(insight.title, insight.titleAr) }}</span>
                    <span class="insight-confidence">({{ (insight.confidence * 100).toFixed(0) }}% confidence)</span>
                  </div>
                  <p class="insight-description">{{ i18n.localize(insight.description, insight.descriptionAr) }}</p>
                  @if (insight.actionItems && insight.actionItems.length > 0) {
                    <div class="insight-actions">
                      @for (action of insight.actionItems; track action.title) {
                        <button type="button" class="insight-action-btn" (click)="handleAction(action)">
                          {{ i18n.localize(action.title, action.titleAr) }}
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }

        <!-- Drill-Through Actions -->
        @if (data.drillThrough && data.drillThrough.length > 0) {
          <div class="drill-actions-section">
            <h4 class="drill-title">{{ i18n.translate('Explore Details') }}</h4>
            <div class="drill-buttons">
              @for (path of data.drillThrough; track path.widgetId) {
                <button
                  type="button"
                  class="drill-btn"
                  (click)="handleDrillThrough(path)"
                  [attr.aria-label]="i18n.localize(path.title, path.titleAr)">
                  {{ i18n.localize(path.title, path.titleAr) }}
                  <i class="pi pi-arrow-right"></i>
                </button>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .advanced-analytics-widget {
      padding: 20px;
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--surface-border);
      min-height: 300px;
    }
    .widget-loading,
    .widget-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-color-secondary);
    }
    .widget-error {
      color: var(--red-500);
    }
    .widget-title {
      font-size: var(--font-size-lg);
      font-weight: 700;
      margin: 0 0 20px 0;
      color: var(--text-color);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-card {
      padding: 16px;
      background: var(--surface-50);
      border-radius: var(--radius);
      border: 1px solid var(--surface-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      position: relative;
    }
    .metric-card.trend-up {
      border-left: 3px solid var(--green-500);
    }
    .metric-card.trend-down {
      border-left: 3px solid var(--red-500);
    }
    .metric-label {
      font-size: var(--font-size-sm);
      color: var(--text-color-secondary);
      font-weight: 500;
    }
    .metric-value {
      font-size: var(--font-size-2xl);
      font-weight: 700;
      color: var(--text-color);
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .metric-change {
      font-size: var(--font-size-sm);
      font-weight: 600;
    }
    .metric-change.positive {
      color: var(--green-600);
    }
    .metric-change.negative {
      color: var(--red-600);
    }
    .analytics-chart {
      margin: 20px 0;
      min-height: 200px;
    }
    .insights-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--surface-border);
    }
    .insights-title {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--text-color);
    }
    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .insight-card {
      padding: 16px;
      background: var(--surface-50);
      border-radius: var(--radius);
      border: 1px solid var(--surface-border);
    }
    .insight-card.severity-warning {
      border-left: 3px solid var(--yellow-500);
    }
    .insight-card.severity-critical {
      border-left: 3px solid var(--red-500);
    }
    .insight-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .insight-title {
      font-weight: 600;
      font-size: var(--font-size-base);
      color: var(--text-color);
    }
    .insight-confidence {
      font-size: var(--font-size-xs);
      color: var(--text-color-secondary);
      margin-left: auto;
    }
    .insight-description {
      font-size: var(--font-size-sm);
      color: var(--text-color-secondary);
      margin: 0 0 12px 0;
    }
    .insight-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .insight-action-btn {
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--primary);
      background: var(--surface);
      color: var(--primary);
      font-size: var(--font-size-sm);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .insight-action-btn:hover {
      background: var(--primary);
      color: white;
    }
    .drill-actions-section {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--surface-border);
    }
    .drill-title {
      font-size: var(--font-size-md);
      font-weight: 600;
      margin: 0 0 16px 0;
      color: var(--text-color);
    }
    .drill-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .drill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: var(--radius);
      border: 1px solid var(--surface-border);
      background: var(--surface);
      color: var(--text-color);
      font-size: var(--font-size-sm);
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .drill-btn:hover {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }
  `],
})
export class AdvancedAnalyticsWidgetComponent implements OnInit {
  @Input() widgetId!: string;
  @Input() widgetTitle?: string;
  @Input() widgetTitleAr?: string;
  @Input() moduleCode?: string;
  @Input() scenario?: 'baseline' | 'assessment' | 'remediation' | 'audit' | 'executive' | 'operations';
  @Input() filters?: Record<string, unknown>;

  private readonly analyticsService = inject(AdvancedAnalyticsService);
  private readonly drillService = inject(DrillThroughService);
  private readonly siteContext = inject(SiteContextService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<AdvancedAnalyticsResult | null>(null);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  private loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    const tenantId = this.siteContext.tenantId();
    const roleCode = this.siteContext.currentUser()?.role || 'viewer';
    const orgStatus = this.siteContext.tenantInfo()?.status || 'active';

    const ctx = {
      tenantId,
      roleCode,
      moduleCode: this.moduleCode,
      scenario: this.scenario,
      orgStatus: orgStatus as 'trial' | 'active' | 'suspended' | 'archived',
      filters: this.filters,
    };

    let request$;
    switch (this.widgetId) {
      case 'advanced-risk-heatmap':
      case 'advanced-risk-analytics':
        request$ = this.analyticsService.getRiskAnalytics(ctx);
        break;
      case 'advanced-compliance-analytics':
        request$ = this.analyticsService.getComplianceAnalytics(ctx);
        break;
      case 'advanced-evidence-analytics':
        request$ = this.analyticsService.getEvidenceAnalytics(ctx);
        break;
      case 'advanced-workflow-analytics':
        request$ = this.analyticsService.getWorkflowAnalytics(ctx);
        break;
      default:
        this.error.set(`Unknown widget ID: ${this.widgetId}`);
        this.loading.set(false);
        return;
    }

    request$.subscribe({
      next: (data) => {
        this.result.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[AdvancedAnalyticsWidget] Load error:', err);
        this.error.set(err.message || 'Failed to load analytics');
        this.loading.set(false);
      },
    });
  }

  formatValue(value: number | string): string {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      }
      if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value.toFixed(0);
    }
    return String(value);
  }

  handleDrillThrough(path: DrillThroughPath): void {
    // Navigate through drill-through levels
    if (path.children && path.children.length > 0) {
      // Multi-level drill: open first child
      this.drillService.open(path.children[0].widgetId, path.children[0].payload, path.children[0].title);
    } else {
      // Single-level drill
      if (path.route) {
        if (path.routeParams) {
          this.router.navigate([path.route], { queryParams: path.routeParams });
        } else {
          this.router.navigate([path.route]);
        }
      } else {
        this.drillService.open(path.widgetId, path.payload, path.title);
      }
    }
  }

  handleAction(action: { title: string; titleAr?: string; route?: string; routeParams?: Record<string, string> }): void {
    if (action.route) {
      if (action.routeParams) {
        this.router.navigate([action.route], { queryParams: action.routeParams });
      } else {
        this.router.navigate([action.route]);
      }
    }
  }
}

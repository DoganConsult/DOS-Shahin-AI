import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';
import { Observable, Subscription, finalize } from 'rxjs';
import { GrcLiveService } from '@app/core/services/grc-live.service';
import { I18nService } from '@app/infrastructure/i18n/i18n.service';
import { PageShellComponent } from '@app/shared/components/layouts/page-shell.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TabViewModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { ChipModule } from 'primeng/chip';
import { BadgeModule } from 'primeng/badge';
import { KnobModule } from 'primeng/knob';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GrcRecord } from '@app/core/models/shared.types';
import { GrcOperationsService } from '@app/api';
import { AnalyticsDashboardSummaryComponent } from './analytics-dashboard-summary.component';
import { AnalyticsDashboardStateComponent } from './analytics-dashboard-state.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, AppDatePipe, FormsModule, PageShellComponent, TableModule, TagModule,
    ButtonModule, ProgressBarModule, TabViewModule, TooltipModule, ChipModule, BadgeModule, KnobModule,
    AnalyticsDashboardSummaryComponent, AnalyticsDashboardStateComponent],
  template: `
    <app-page-shell icon="chart-bar"
      [title]="i18n.translate('analytics.title')"
      [subtitle]="i18n.translate('analytics.subtitle')"
      [breadcrumbs]="[i18n.translate('nav.dashboard'), i18n.translate('analytics.breadcrumb')]" [loading]="loading()">

      @if (surfaceState() === 'loading') {
        <app-analytics-dashboard-state state="loading" />
      } @else if (surfaceState() === 'unauthorized') {
        <app-analytics-dashboard-state state="unauthorized" />
      } @else if (surfaceState() === 'error') {
        <app-analytics-dashboard-state state="error" [message]="error()" (retry)="retry()" />
      } @else if (surfaceState() === 'empty') {
        <app-analytics-dashboard-state state="empty" />
      } @else {
        <app-analytics-dashboard-summary [gauges]="gauges()" [quickStats]="quickStats()" [maturityData]="maturityData()" />

        <!-- ════ Tabs ════ -->
        <p-tabView styleClass="analytics-tabs">

        <!-- ── KPI Trend Intelligence ── -->
        <p-tabPanel [header]="i18n.translate('analytics.tabKpiTrends')">
          <div class="trend-chart-area">
            <!-- Inline SVG sparkline chart -->
            @if (sparkData().length > 0) {
              <div class="sparkline-grid">
                @for (spark of sparklines(); track spark.key) {
                  <div class="sparkline-card">
                    <div class="spark-header">
                      <span class="spark-title">{{ i18n.translate('analytics.spark.' + spark.key) }}</span>
                      <span class="spark-current" [style.color]="spark.color">{{ spark.currentDisplay }}</span>
                    </div>
                    <svg viewBox="0 0 300 60" class="spark-svg" preserveAspectRatio="none">
                      <defs>
                        <linearGradient [id]="'grad-' + spark.key" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" [attr.stop-color]="spark.color" stop-opacity="0.3"/>
                          <stop offset="100%" [attr.stop-color]="spark.color" stop-opacity="0.02"/>
                        </linearGradient>
                      </defs>
                      <path [attr.d]="spark.areaPath" [attr.fill]="'url(#grad-' + spark.key + ')'" />
                      <path [attr.d]="spark.linePath" fill="none" [attr.stroke]="spark.color" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                      @for (pt of spark.dots; track $index) {
                        <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" [attr.fill]="spark.color" opacity="0.7" />
                      }
                    </svg>
                    <div class="spark-range">
                      <span>{{ spark.minLabel }}</span>
                      <span>{{ spark.maxLabel }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="empty-chart">
                <i class="pi pi-chart-line" style="font-size:48px;opacity:.2"></i>
                <p>{{ i18n.translate('analytics.noTrendData') }}</p>
              </div>
            }
          </div>

          <!-- Data Table -->
          @if (trends().length > 0) {
            <p-table [attr.aria-label]="i18n.translate('analytics.ariaTrendsTable')" [value]="trends()" [paginator]="true" [rows]="10" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('analytics.colDate') }}</th>
                  <th>{{ i18n.translate('analytics.colCompliance') }}</th>
                  <th>{{ i18n.translate('analytics.colRiskScore') }}</th>
                  <th>{{ i18n.translate('analytics.colEvidence') }}</th>
                  <th>{{ i18n.translate('analytics.colRemediation') }}</th>
                  <th>{{ i18n.translate('analytics.colHealth') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-t>
                <tr>
                  <td class="date-cell">{{ t.snapshotDate | appDate:'medium' }}</td>
                  <td>
                    <div class="metric-cell">
                      <p-progressBar [value]="t.complianceScore" [showValue]="false" [style]="{'height':'6px','border-radius':'3px'}" />
                      <span class="metric-val">{{ fmt(t.complianceScore) }}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="risk-badge" [class]="riskClass(t.riskScore)">{{ fmt(t.riskScore) }}</span>
                  </td>
                  <td>
                    <div class="metric-cell">
                      <p-progressBar [value]="t.evidenceCoverage" [showValue]="false" [style]="{'height':'6px','border-radius':'3px'}" />
                      <span class="metric-val">{{ fmt(t.evidenceCoverage) }}%</span>
                    </div>
                  </td>
                  <td><span class="metric-val">{{ fmt(t.remediationClosureRate) }}%</span></td>
                  <td><p-tag [value]="healthLabel(t)" [severity]="healthSeverity(t)" /></td>
                </tr>
              </ng-template>
            </p-table>
          }
        </p-tabPanel>

        <!-- ── Predictions ── -->
        <p-tabPanel [header]="i18n.translate('analytics.tabPredictions')">
          @if (predictionCards().length > 0) {
            <div class="prediction-grid">
              @for (p of predictionCards(); track p.label) {
                <div class="prediction-card">
                  <i class="pi" [ngClass]="'pi-' + p.icon" [style.color]="p.color"></i>
                  <div class="pred-value">{{ p.value }}</div>
                  <div class="pred-label">{{ i18n.translate('analytics.pred.' + p.key) }}</div>
                  <div class="pred-direction" [class.up]="p.direction === 'up'" [class.down]="p.direction === 'down'">
                    <i class="pi" [ngClass]="p.direction === 'up' ? 'pi-trending-up' : 'pi-trending-down'"></i>
                    {{ p.direction === 'up' ? i18n.translate('analytics.expectedRise') : i18n.translate('analytics.expectedDrop') }}
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-chart">
              <i class="pi pi-bolt" style="font-size:48px;opacity:.2"></i>
              <p>{{ i18n.translate('analytics.noPredictionData') }}</p>
            </div>
          }
        </p-tabPanel>

        <!-- ── Benchmark ── -->
        <p-tabPanel [header]="i18n.translate('analytics.tabBenchmark')">
          @if (benchmarkRows().length > 0) {
            <p-table [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50]" [attr.aria-label]="i18n.translate('analytics.ariaBenchmarkTable')" [value]="benchmarkRows()" styleClass="p-datatable-sm p-datatable-striped" [rowHover]="true">
              <ng-template pTemplate="header">
                <tr>
                  <th>{{ i18n.translate('analytics.colMetric') }}</th>
                  <th>{{ i18n.translate('analytics.colYourScore') }}</th>
                  <th>{{ i18n.translate('analytics.colIndustryAvg') }}</th>
                  <th>{{ i18n.translate('analytics.colDelta') }}</th>
                  <th>{{ i18n.translate('analytics.colPosition') }}</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-b>
                <tr>
                  <td class="metric-name">{{ b.metric }}</td>
                  <td><strong>{{ fmt(b.yours) }}</strong></td>
                  <td class="avg-cell">{{ fmt(b.avg) }}</td>
                  <td>
                    <p-tag [value]="b.delta" [severity]="b.deltaNum >= 0 ? 'success' : 'danger'" [rounded]="true" />
                  </td>
                  <td>
                    <span class="position-badge" [class.above]="b.deltaNum >= 0" [class.below]="b.deltaNum < 0">
                      {{ b.deltaNum >= 0
                        ? i18n.translate('analytics.aboveAvg')
                        : i18n.translate('analytics.belowAvg') }}
                    </span>
                  </td>
                </tr>
              </ng-template>
              <ng-template pTemplate="emptymessage">
                <tr><td colspan="5" class="text-center p-4">{{ i18n.translate('analytics.noBenchmarkData') }}</td></tr>
              </ng-template>
            </p-table>
          } @else {
            <div class="empty-chart">
              <i class="pi pi-th-large" style="font-size:48px;opacity:.2"></i>
              <p>{{ i18n.translate('analytics.noBenchmarkAvailable') }}</p>
            </div>
          }
        </p-tabPanel>

        <!-- ── Maturity Detail ── -->
        <p-tabPanel [header]="i18n.translate('analytics.tabMaturity')">
          @if (maturityData()) {
            <div class="maturity-detail-grid">
              @for (c of maturityCriteria(); track c.key) {
                <div class="maturity-criterion">
                  <div class="mc-header">
                    <span class="mc-label">{{ i18n.translate('analytics.criterion.' + c.key) }}</span>
                    <span class="mc-value">{{ fmt(c.value) }}%</span>
                  </div>
                  <div class="mc-bar-track">
                    <div class="mc-bar-fill" [style.width.%]="c.value" [style.background]="c.color"></div>
                  </div>
                  <div class="mc-tier">
                    <p-tag [value]="c.tier" [severity]="c.tierSeverity" [rounded]="true" />
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-chart">
              <i class="pi pi-star" style="font-size:48px;opacity:.2"></i>
              <p>{{ i18n.translate('analytics.computingMaturity') }}</p>
            </div>
          }
        </p-tabPanel>
        </p-tabView>
      }
    </app-page-shell>
  `,
  styles: [`
    /* ── Gauge Strip ── */
    .gauge-strip {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px; margin-bottom: 20px;
    }
    .gauge-card {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 20px 12px 14px;
      border: 1px solid var(--surface-border, var(--border-subtle)); transition: box-shadow .2s;
    }
    .gauge-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.08); }
    .gauge-meta { text-align: center; }
    .gauge-label { display: block; font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: .04em; }
    .gauge-trend { display: inline-flex; align-items: center; gap: 3px; font-size: var(--font-size-xs); font-weight: 700; margin-top: 4px; }
    .gauge-trend.positive { color: var(--success); }
    .gauge-trend.negative { color: var(--error); }

    /* ── Quick Stats ── */
    .quick-stats {
      display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;
      padding: 14px 18px; background: var(--surface-ground, var(--surface-ice)); border-radius: var(--radius-md);
      border: 1px solid var(--surface-border, var(--border-subtle));
    }
    .qs-chip {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 14px; background: var(--surface-card, #fff); border-radius: var(--radius-xl);
      border: 1px solid var(--surface-border, var(--border-subtle)); font-size: var(--font-size-sm);
    }
    .qs-value { font-weight: 800; color: var(--text-color, var(--text-heading)); }
    .qs-label { color: var(--text-color-secondary, var(--text-muted)); font-size: var(--font-size-sm); }

    /* ── Maturity Banner ── */
    .maturity-banner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 24px; border-radius: var(--radius-lg); margin-bottom: 20px;
      border: 1px solid var(--surface-border, var(--border-subtle));
      background: linear-gradient(135deg, var(--status-success-bg, #defbe6) 0%, #ecfdf5 100%);
    }
    .maturity-initial { background: linear-gradient(135deg, var(--status-danger-bg, #fff1f1) 0%, var(--status-danger-bg, #fff1f1) 100%); }
    .maturity-developing { background: linear-gradient(135deg, #fffbeb 0%, #fefce8 100%); }
    .maturity-defined { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); }
    .maturity-managed { background: linear-gradient(135deg, var(--status-success-bg, #defbe6) 0%, #dcfce7 100%); }
    .maturity-optimized { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); }
    .mb-left { display: flex; align-items: center; gap: 14px; }
    .mb-level-badge {
      padding: 8px 18px; border-radius: var(--radius); font-weight: 800; font-size: var(--font-size-base);
      background: var(--surface-card, #fff); border: 1px solid var(--surface-border, var(--border-subtle));
      color: var(--text-color, var(--text-heading)); text-transform: uppercase;
    }
    .mb-info { display: flex; flex-direction: column; }
    .mb-title { font-weight: 700; font-size: var(--font-size-base); color: var(--text-color, var(--text-heading)); }
    .mb-desc { font-size: var(--font-size-sm); color: var(--text-color-secondary, var(--text-muted)); }
    .mb-right { text-align: end; }
    .mb-agg-value { display: block; font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color, var(--text-heading)); }
    .mb-agg-label { font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); text-transform: uppercase; letter-spacing: .04em; }

    /* ── Sparkline Grid ── */
    .sparkline-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .sparkline-card {
      background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 16px;
      border: 1px solid var(--surface-border, var(--border-subtle));
    }
    .spark-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .spark-title { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); }
    .spark-current { font-size: var(--font-size-xl); font-weight: 800; }
    .spark-svg { width: 100%; height: 60px; }
    .spark-range { display: flex; justify-content: space-between; font-size: var(--font-size-xs); color: var(--text-color-secondary, var(--text-muted)); margin-top: 4px; }

    /* ── Trend Table Cells ── */
    .date-cell { font-weight: 600; font-size: var(--font-size-sm); white-space: nowrap; }
    .metric-cell { display: flex; align-items: center; gap: 8px; }
    .metric-val { font-weight: 700; font-size: var(--font-size-sm); min-width: 42px; }
    .risk-badge {
      display: inline-block; padding: 3px 10px; border-radius: var(--radius-lg); font-weight: 700; font-size: var(--font-size-sm);
    }
    .risk-badge.low { background: #dcfce7; color: #15803d; }
    .risk-badge.medium { background: #fef9c3; color: #a16207; }
    .risk-badge.high { background: #fee2e2; color: #b91c1c; }
    .risk-badge.critical { background: #7f1d1d; color: var(--status-danger-bg, #fff1f1); }

    /* ── Predictions ── */
    .prediction-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .prediction-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      background: var(--surface-card, #fff); border-radius: var(--radius-lg); padding: 24px 16px;
      border: 1px solid var(--surface-border, var(--border-subtle)); text-align: center;
    }
    .prediction-card i { font-size: var(--font-size-3xl); }
    .pred-value { font-size: var(--font-size-3xl); font-weight: 800; color: var(--text-color, var(--text-heading)); }
    .pred-label { font-size: var(--font-size-sm); font-weight: 600; color: var(--text-color-secondary, var(--text-muted)); }
    .pred-direction { font-size: var(--font-size-xs); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: var(--radius-lg); }
    .pred-direction.up { background: #dcfce7; color: #15803d; }
    .pred-direction.down { background: #fee2e2; color: #b91c1c; }

    /* ── Benchmark ── */
    .metric-name { font-weight: 600; text-transform: capitalize; }
    .avg-cell { color: var(--text-color-secondary, var(--text-muted)); }
    .position-badge {
      display: inline-block; padding: 3px 10px; border-radius: var(--radius-lg); font-size: var(--font-size-xs); font-weight: 700;
    }
    .position-badge.above { background: #dcfce7; color: #15803d; }
    .position-badge.below { background: #fee2e2; color: #b91c1c; }

    /* ── Maturity Detail ── */
    .maturity-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .maturity-criterion {
      background: var(--surface-card, #fff); border-radius: var(--radius-md); padding: 18px;
      border: 1px solid var(--surface-border, var(--border-subtle));
    }
    .mc-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .mc-label { font-weight: 600; font-size: var(--font-size-base); color: var(--text-color, var(--text-heading)); }
    .mc-value { font-weight: 800; font-size: var(--font-size-md); color: var(--text-color, var(--text-heading)); }
    .mc-bar-track { height: 8px; border-radius: var(--radius-xs); background: var(--surface-ground, var(--surface-ice)); overflow: hidden; }
    .mc-bar-fill { height: 100%; border-radius: var(--radius-xs); transition: width .6s ease; }
    .mc-tier { margin-top: 10px; }

    /* ── Empty / Error ── */
    .empty-chart { text-align: center; padding: 48px 24px; color: var(--text-color-secondary, var(--text-muted)); }
    .empty-chart p { margin-top: 12px; font-size: var(--font-size-base); }
    .error-state {
      text-align: center; padding: 32px; color: var(--error);
      background: var(--status-danger-bg, #fff1f1); border-radius: var(--radius-lg); margin-top: 16px;
      border: 1px solid var(--status-danger-bg, #fff1f1);
    }

  `]
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy {
  private operationsSvc = inject(GrcOperationsService);
  private destroyRef = inject(DestroyRef);
  private live = inject(GrcLiveService);
  i18n = inject(I18nService);
  private subs: Subscription[] = [];
  private pendingRequests = signal(0);

  loading = computed(() => this.pendingRequests() > 0);
  error = signal('');
  unauthorized = signal(false);

  // Raw data
  private rawKpis = signal<GrcRecord | null>(null);
  private rawTrends = signal<GrcRecord[]>([]);
  private rawPredictions = signal<GrcRecord | null>(null);
  private rawBenchmark = signal<GrcRecord | null>(null);
  private rawMaturity = signal<GrcRecord | null>(null);

  // Computed views
  gauges = computed(() => this.buildGauges());
  quickStats = computed(() => this.buildQuickStats());
  maturityData = computed(() => this.buildMaturityBanner());
  trends = computed(() => this.rawTrends());
  sparkData = computed(() => this.rawTrends());
  sparklines = computed(() => this.buildSparklines());
  predictionCards = computed(() => this.buildPredictions());
  benchmarkRows = computed(() => this.buildBenchmark());
  maturityCriteria = computed(() => this.buildMaturityCriteria());
  hasAnyData = computed(() => this.hasRecordValue(this.rawKpis()) || this.rawTrends().length > 0 || this.hasRecordValue(this.rawPredictions()) || this.hasRecordValue(this.rawBenchmark()) || this.hasRecordValue(this.rawMaturity()));
  surfaceState = computed(() => {
    if (this.unauthorized()) return 'unauthorized';
    if (this.error() && !this.hasAnyData()) return 'error';
    if (this.loading() && !this.hasAnyData()) return 'loading';
    if (!this.loading() && !this.hasAnyData()) return 'empty';
    return 'ready';
  });

  ngOnInit() { this.reload(); this.subs.push(this.live.debounced(2000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.reload())); }
  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  retry() { this.error.set(''); this.unauthorized.set(false); this.reload(); }

  fmt(v: unknown): string {
    if (v == null) return '0';
    return Number(v).toFixed(1);
  }

  riskClass(score: number): string {
    if (score <= 3) return 'low';
    if (score <= 6) return 'medium';
    if (score <= 8) return 'high';
    return 'critical';
  }

  healthLabel(t: Record<string, any>): string {
    const avg = ((t.complianceScore || 0) + (t.evidenceCoverage || 0) + (t.remediationClosureRate || 0)) / 3;
    if (avg >= 70) return this.i18n.translate('analytics.healthHealthy');
    if (avg >= 40) return this.i18n.translate('analytics.healthAtRisk');
    return this.i18n.translate('analytics.healthCritical');
  }

  healthSeverity(t: Record<string, any>): 'success' | 'warning' | 'danger' {
    const avg = ((t.complianceScore || 0) + (t.evidenceCoverage || 0) + (t.remediationClosureRate || 0)) / 3;
    if (avg >= 70) return 'success';
    if (avg >= 40) return 'warning';
    return 'danger';
  }

  private hasRecordValue(record: GrcRecord | null): boolean {
    return !!record && Object.keys(record).length > 0;
  }

  private beginReload(requestCount: number): void {
    this.pendingRequests.set(requestCount);
    this.error.set('');
    this.unauthorized.set(false);
  }

  private finishRequest(): void {
    this.pendingRequests.update(value => Math.max(0, value - 1));
  }

  private handleLoadError(err: unknown, fallbackMessage: string): void {
    const status = typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: number }).status)
      : undefined;

    if (status === 401 || status === 403) {
      this.unauthorized.set(true);
      this.error.set('');
      return;
    }

    if (!this.error()) {
      this.error.set(fallbackMessage);
    }
  }

  private loadAnalyticsData<T>(observable: Observable<T>, onNext: (value: T) => void, fallbackMessage: string): void {
    const sub = observable.pipe(finalize(() => this.finishRequest())).subscribe({
      next: onNext,
      error: err => this.handleLoadError(err, fallbackMessage),
    });
    this.subs.push(sub);
  }

  private reload() {
    this.beginReload(5);

    this.loadAnalyticsData(this.operationsSvc.getAnalyticsKPIs(), (d: Record<string, any>) => this.rawKpis.set(d), 'Failed to load KPIs');

    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 86400000).toISOString();
    this.loadAnalyticsData(this.operationsSvc.getKPITrends(start, end), (d: any) => this.rawTrends.set(d || []), 'Failed to load KPI trends');
    this.loadAnalyticsData(this.operationsSvc.getAnalyticsPredictions(), (d: Record<string, any>) => this.rawPredictions.set(d), 'Failed to load analytics predictions');
    this.loadAnalyticsData(this.operationsSvc.getAnalyticsBenchmark(), (d: Record<string, any>) => this.rawBenchmark.set(d), 'Failed to load analytics benchmark');
    this.loadAnalyticsData(this.operationsSvc.getAnalyticsMaturity(), (d: Record<string, any>) => this.rawMaturity.set(d), 'Failed to load analytics maturity');
  }

  // ── Build Gauges ──
  private buildGauges() {
    const k = this.rawKpis();
    if (!k) return [];
    const compliance = Number(k.complianceScore || 0);
    const risk = Number(k.riskScore || 0);
    const evidence = Number(k.evidenceCoverage || 0);
    const remediation = Number(k.remediationClosureRate || 0);
    const riskInverted = Math.max(0, Math.min(100, 100 - risk * 10));

    return [
      { key: 'compliance', label: 'Compliance', labelAr: 'الامتثال', value: Math.round(compliance),
        template: '{value}%', knobColor: this.scoreColor(compliance), severity: this.scoreSeverity(compliance),
        trend: 0, trendDisplay: '—' },
      { key: 'risk', label: 'Risk Posture', labelAr: 'وضع المخاطر', value: Math.round(riskInverted),
        template: '{value}', knobColor: this.scoreColor(riskInverted), severity: this.scoreSeverity(riskInverted),
        trend: 0, trendDisplay: this.fmt(risk) + ' raw' },
      { key: 'evidence', label: 'Evidence Coverage', labelAr: 'تغطية الأدلة', value: Math.round(evidence),
        template: '{value}%', knobColor: this.scoreColor(evidence), severity: this.scoreSeverity(evidence),
        trend: 0, trendDisplay: '—' },
      { key: 'remediation', label: 'Remediation', labelAr: 'المعالجة', value: Math.round(remediation),
        template: '{value}%', knobColor: this.scoreColor(remediation), severity: this.scoreSeverity(remediation),
        trend: 0, trendDisplay: '—' },
    ];
  }

  private scoreColor(v: number): string {
    if (v >= 70) return '#16a34a';
    if (v >= 40) return '#f59e0b';
    return 'var(--error)';
  }
  private scoreSeverity(v: number): string {
    if (v >= 70) return 'good';
    if (v >= 40) return 'warn';
    return 'bad';
  }

  // ── Quick Stats ──
  private buildQuickStats() {
    const k = this.rawKpis();
    const t = this.rawTrends();
    const m = this.rawMaturity();
    return [
      { key: 'dataPoints', icon: 'chart-line', label: 'Data Points', labelAr: 'نقاط البيانات', value: t.length, color: '#3b82f6' },
      { key: 'compliance', icon: 'shield', label: 'Compliance', labelAr: 'الامتثال', value: this.fmt(k?.complianceScore) + '%', color: '#16a34a' },
      { key: 'riskScore', icon: 'exclamation-triangle', label: 'Risk Score', labelAr: 'درجة المخاطر', value: this.fmt(k?.riskScore), color: '#ef4444' },
      { key: 'evidence', icon: 'file', label: 'Evidence', labelAr: 'الأدلة', value: this.fmt(k?.evidenceCoverage) + '%', color: '#8b5cf6' },
      { key: 'remediation', icon: 'check-circle', label: 'Remediation', labelAr: 'المعالجة', value: this.fmt(k?.remediationClosureRate) + '%', color: '#0891b2' },
      { key: 'maturity', icon: 'star', label: 'Maturity', labelAr: 'النضج', value: m?.level || '—', color: '#f59e0b' },
    ];
  }

  // ── Maturity Banner ──
  private buildMaturityBanner() {
    const m = this.rawMaturity();
    if (!m) return null;
    const level = (m.level || 'Initial').toString();
    const lcMap: Record<string, string> = {
      'Initial': 'initial', 'Developing': 'developing', 'Defined': 'defined',
      'Managed': 'managed', 'Optimized': 'optimized', '1': 'initial', '2': 'developing',
      '3': 'defined', '4': 'managed', '5': 'optimized'
    };
    const descMap: Record<string, { en: string; ar: string }> = {
      'initial':    { en: 'Ad-hoc processes with minimal standardization', ar: 'عمليات عشوائية بدون توحيد' },
      'developing': { en: 'Basic processes established but not consistently followed', ar: 'عمليات أساسية تم إنشاؤها ولكن لا تُتبع باستمرار' },
      'defined':    { en: 'Standardized processes documented and followed', ar: 'عمليات موحدة موثقة ومتبعة' },
      'managed':    { en: 'Processes measured and controlled with KPIs', ar: 'عمليات مقاسة ومراقبة بمؤشرات الأداء' },
      'optimized':  { en: 'Continuous improvement with AI-driven automation', ar: 'تحسين مستمر بأتمتة مدعومة بالذكاء الاصطناعي' },
    };
    const lc = lcMap[level] || 'initial';
    const desc = descMap[lc] || descMap['initial'];
    return {
      level, levelClass: lc,
      aggregate: Number(m.aggregate || 0).toFixed(0),
      descEn: desc.en, descAr: desc.ar,
    };
  }

  // ── Sparklines (inline SVG charts) ──
  private buildSparklines() {
    const data = this.rawTrends();
    if (!data || data.length === 0) return [];

    const configs = [
      { key: 'compliance', field: 'complianceScore', label: 'Compliance Score', labelAr: 'درجة الامتثال', color: '#16a34a', suffix: '%' },
      { key: 'risk', field: 'riskScore', label: 'Risk Score', labelAr: 'درجة المخاطر', color: '#ef4444', suffix: '' },
      { key: 'evidence', field: 'evidenceCoverage', label: 'Evidence Coverage', labelAr: 'تغطية الأدلة', color: '#8b5cf6', suffix: '%' },
      { key: 'remediation', field: 'remediationClosureRate', label: 'Remediation Rate', labelAr: 'معدل المعالجة', color: '#0891b2', suffix: '%' },
    ];

    return configs.map(c => {
      const values = data.map((d: Record<string, any>) => Number(d[c.field]) || 0);
      const min = Math.min(...values);
      const max = Math.max(...values) || 1;
      const range = max - min || 1;
      const w = 300, h = 60, padY = 4;

      const points = values.map((v, i) => ({
        x: values.length > 1 ? (i / (values.length - 1)) * w : w / 2,
        y: padY + (1 - (v - min) / range) * (h - padY * 2),
      }));

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const areaPath = linePath + ` L${w},${h} L0,${h} Z`;
      const current = values[values.length - 1];

      return {
        ...c,
        currentDisplay: this.fmt(current) + c.suffix,
        linePath, areaPath, dots: points,
        minLabel: data[0]?.snapshotDate ? new Date(data[0].snapshotDate).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
        maxLabel: data[data.length - 1]?.snapshotDate ? new Date(data[data.length - 1].snapshotDate).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
      };
    });
  }

  // ── Predictions ──
  private buildPredictions() {
    const d = this.rawPredictions();
    if (!d?.predictions) return [];
    const p = d.predictions;
    return [
      { key: 'compliance', label: 'Compliance', labelAr: 'الامتثال', value: this.fmt(p.complianceScore) + '%', icon: 'shield', color: '#16a34a', direction: (p.complianceScore || 0) >= 50 ? 'up' : 'down' },
      { key: 'riskScore', label: 'Risk Score', labelAr: 'درجة المخاطر', value: this.fmt(p.riskScore), icon: 'exclamation-triangle', color: '#ef4444', direction: (p.riskScore || 0) <= 5 ? 'up' : 'down' },
      { key: 'evidence', label: 'Evidence', labelAr: 'الأدلة', value: this.fmt(p.evidenceCoverage) + '%', icon: 'file', color: '#8b5cf6', direction: (p.evidenceCoverage || 0) >= 50 ? 'up' : 'down' },
      { key: 'remediation', label: 'Remediation', labelAr: 'المعالجة', value: this.fmt(p.remediationClosureRate) + '%', icon: 'check-circle', color: '#0891b2', direction: (p.remediationClosureRate || 0) >= 50 ? 'up' : 'down' },
    ];
  }

  // ── Benchmark ──
  private buildBenchmark() {
    const b = this.rawBenchmark();
    if (!b) return [];
    return Object.keys(b).filter(k => b[k]?.yours != null).map(k => ({
      metric: k.replace(/([A-Z])/g, ' $1').trim(),
      yours: Number(b[k].yours),
      avg: Number(b[k].industryAvg),
      delta: ((b[k].yours - b[k].industryAvg) >= 0 ? '+' : '') + (b[k].yours - b[k].industryAvg).toFixed(1),
      deltaNum: b[k].yours - b[k].industryAvg,
    }));
  }

  // ── Maturity Criteria ──
  private buildMaturityCriteria() {
    const m = this.rawMaturity();
    if (!m?.criteria) return [];
    const c = m.criteria;
    const tierFor = (v: number) => {
      if (v >= 80) return { tier: 'Optimized', tierSeverity: 'success' as const };
      if (v >= 60) return { tier: 'Managed', tierSeverity: 'info' as const };
      if (v >= 40) return { tier: 'Defined', tierSeverity: 'warning' as const };
      if (v >= 20) return { tier: 'Developing', tierSeverity: 'warning' as const };
      return { tier: 'Initial', tierSeverity: 'danger' as const };
    };
    return [
      { key: 'compliance', label: 'Compliance Score', labelAr: 'درجة الامتثال', value: c.complianceScore || 0, color: '#16a34a', ...tierFor(c.complianceScore || 0) },
      { key: 'risk', label: 'Risk Management', labelAr: 'إدارة المخاطر', value: Math.max(0, 100 - (c.riskScore || 0) * 10), color: '#ef4444', ...tierFor(Math.max(0, 100 - (c.riskScore || 0) * 10)) },
      { key: 'evidence', label: 'Evidence Coverage', labelAr: 'تغطية الأدلة', value: c.evidenceCoverage || 0, color: '#8b5cf6', ...tierFor(c.evidenceCoverage || 0) },
      { key: 'process', label: 'Process Maturity', labelAr: 'نضج العمليات', value: c.processMaturity || 0, color: '#0891b2', ...tierFor(c.processMaturity || 0) },
    ];
  }
}

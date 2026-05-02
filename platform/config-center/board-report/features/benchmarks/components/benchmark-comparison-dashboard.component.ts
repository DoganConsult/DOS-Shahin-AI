/**
 * Advanced Benchmark Comparison Dashboard Component
 * Feature 25: Cross-Tenant Benchmark Aggregator
 * 
 * Displays anonymized cross-tenant benchmarks with opt-in management,
 * trend analysis, and KPI comparisons.
 */
import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import {
  BenchmarkAggregatorApiService,
  BenchmarkOptInStatus,
  BenchmarkAggregationResult as BenchmarkData,
  BenchmarkHistoryEntry as BenchmarkHistoryItem,
} from '../services/benchmark-aggregator-api.service';
import { PlatformApiService } from '@app/core/services/platform/config-registry/platform-api.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { PageHeaderComponent } from '@app/shared/components/layouts/page-header.component';
import { AppDatePipe } from '@app/shared/pipes/app-date.pipe';

@Component({
  selector: 'app-benchmark-comparison-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GrcDataTableComponent,
    ToastModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToggleButtonModule,
    SkeletonModule,
    TooltipModule,
    ChartModule,
    EmptyStateComponent,
    PageHeaderComponent,
    AppDatePipe,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './benchmark-comparison-dashboard.component.html',
  styleUrls: ['./benchmark-comparison-dashboard.component.scss'],
})
export class BenchmarkComparisonDashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly benchmarkService = inject(BenchmarkAggregatorApiService);
  private readonly platformService = inject(PlatformApiService);
  private readonly messageService = inject(MessageService);
  readonly i18n = inject(I18nService);
  
  // Store actual tenant KPIs
  private tenantKPIs = signal<{
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
  } | null>(null);

  // State
  optInStatus = false;
  updatingOptIn = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  latestBenchmark = signal<BenchmarkData | null>(null);
  benchmarkHistory = signal<BenchmarkHistoryItem[]>([]);

  // Computed
  chartData = computed(() => {
    const history = this.benchmarkHistory();
    if (history.length === 0) return { labels: [], datasets: [] };

    const labels = history.map((h) => this.i18n.formatDate(new Date(h.aggregatedAt || h.runDate), 'short'));
    const complianceData = history.map((h) => h.kpis.complianceScore);
    const riskData = history.map((h) => h.kpis.riskScore);
    const evidenceData = history.map((h) => h.kpis.evidenceCoverage);

    return {
      labels,
      datasets: [
        {
          label: this.i18n.translate('benchmark.complianceScore'),
          data: complianceData,
          borderColor: '#42A5F5',
          backgroundColor: 'rgba(var(--color-blue-medium-rgb), 0.1)',
          tension: 0.4,
        },
        {
          label: this.i18n.translate('benchmark.riskScore'),
          data: riskData,
          borderColor: '#EF5350',
          backgroundColor: 'rgba(var(--module-accent-red-rgb), 0.1)',
          tension: 0.4,
        },
        {
          label: this.i18n.translate('benchmark.evidenceCoverage'),
          data: evidenceData,
          borderColor: '#66BB6A',
          backgroundColor: 'rgba(var(--color-green-500-rgb), 0.1)',
          tension: 0.4,
        },
      ],
    };
  });

  chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }));

  ngOnInit(): void {
    this.loadOptInStatus();
  }

  loadOptInStatus(): void {
    this.benchmarkService
      .getOptInStatus()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of({ optedIn: false } as BenchmarkOptInStatus)),
      )
      .subscribe((status) => {
        this.optInStatus = status.optedIn;
        if (status.optedIn) {
          this.loadData();
        } else {
          this.loading.set(false);
        }
      });
  }

  updateOptInStatus(): void {
    this.updatingOptIn.set(true);

    this.benchmarkService
      .setOptInStatus(this.optInStatus)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.messageService.add({
            severity: 'error',
            summary: this.i18n.translate('common.error'),
            detail: err.error?.message || this.i18n.translate('benchmark.optInUpdateFailed'),
          });
          this.optInStatus = !this.optInStatus; // Revert
          return of(null);
        }),
        finalize(() => this.updatingOptIn.set(false)),
      )
      .subscribe(() => {
        if (this.optInStatus) {
          this.loadData();
          this.messageService.add({
            severity: 'success',
            summary: this.i18n.translate('benchmark.optedIn'),
            detail: this.i18n.translate('benchmark.optedInDesc'),
          });
        } else {
          this.latestBenchmark.set(null);
          this.benchmarkHistory.set([]);
        }
      });
  }

  loadData(): void {
    if (!this.optInStatus) return;

    this.loading.set(true);
    this.error.set(null);

    // Load tenant KPIs in parallel with benchmark data
    (this.platformService as any)
      .getAnalyticsKPIs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          // Log error but don't block benchmark loading
          console.warn('Failed to load tenant KPIs:', err);
          return of(null);
        }),
      )
      .subscribe((kpis) => {
        if (kpis) {
          this.tenantKPIs.set({
            complianceScore: (kpis['complianceScore'] as number) || 0,
            riskScore: (kpis['riskScore'] as number) || 0,
            evidenceCoverage: (kpis['evidenceCoverage'] as number) || 0,
            remediationClosureRate: (kpis['remediationClosureRate'] as number) || 0,
          });
        }
      });

    this.benchmarkService
      .getLatest()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          this.error.set(err.error?.message || this.i18n.translate('common.failedToLoad'));
          return of(null);
        }),
      )
      .subscribe((benchmark) => {
        this.latestBenchmark.set(benchmark);
        if (benchmark) {
          this.loadHistory();
        } else {
          this.loading.set(false);
        }
      });
  }

  loadHistory(): void {
    this.benchmarkService
      .getHistory(20)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([])),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((history) => {
        this.benchmarkHistory.set(history);
      });
  }

  getKPIs(): Array<{
    key: string;
    label: string;
    yourValue: number;
    benchmarkValue: number;
  }> {
    const benchmark = this.latestBenchmark();
    if (!benchmark) return [];

    const kpis = this.tenantKPIs();
    // Use actual tenant KPIs if available, otherwise fallback to 0
    const yourCompliance = kpis?.complianceScore ?? 0;
    const yourRisk = kpis?.riskScore ?? 0;
    const yourEvidence = kpis?.evidenceCoverage ?? 0;
    const yourRemediation = kpis?.remediationClosureRate ?? 0;

    return [
      {
        key: 'complianceScore',
        label: this.i18n.translate('benchmark.complianceScore'),
        yourValue: yourCompliance,
        benchmarkValue: benchmark.kpis.complianceScore,
      },
      {
        key: 'riskScore',
        label: this.i18n.translate('benchmark.riskScore'),
        yourValue: yourRisk,
        benchmarkValue: benchmark.kpis.riskScore,
      },
      {
        key: 'evidenceCoverage',
        label: this.i18n.translate('benchmark.evidenceCoverage'),
        yourValue: yourEvidence,
        benchmarkValue: benchmark.kpis.evidenceCoverage,
      },
    ];
  }

  getComparisonLabel(yourValue: number, benchmarkValue: number): string {
    const diff = yourValue - benchmarkValue;
    if (Math.abs(diff) < 2) return 'On Par';
    return diff > 0 ? 'Above' : 'Below';
  }

  getComparisonSeverity(yourValue: number, benchmarkValue: number): 'success' | 'warning' | 'info' {
    const diff = yourValue - benchmarkValue;
    if (Math.abs(diff) < 2) return 'info';
    return diff > 0 ? 'success' : 'warning';
  }

  getDifferenceText(yourValue: number, benchmarkValue: number): string {
    const diff = yourValue - benchmarkValue;
    const absDiff = Math.abs(diff);
    if (absDiff < 2) return 'On par with benchmark';
    return `${absDiff.toFixed(1)}% ${diff > 0 ? 'above' : 'below'} benchmark`;
  }

  getDifferenceClass(yourValue: number, benchmarkValue: number): string {
    const diff = yourValue - benchmarkValue;
    if (Math.abs(diff) < 2) return 'neutral';
    return diff > 0 ? 'positive' : 'negative';
  }

  formatKPIValue(value: number, key: string): string {
    if (key.includes('Score') || key.includes('Coverage')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toFixed(0);
  }
}

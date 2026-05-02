/**
 * Controls Home — Command Center Dashboard
 *
 * The first page users see inside the Controls Hub.
 * Displays KPI strip, failed/overdue test tables, automation mix,
 * health trend chart, recent alerts, and unmapped controls warning.
 *
 * @module controls
 * @see ControlsHomeDto for the backend response shape
 */
import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GrcDataTableComponent } from '@app/shared/components/tables-data/grc-data-table.component';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';

import { ControlsApiService } from '../../services/controls-api.service';
import { ControlsHomeDto } from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { KpiCardGridComponent } from '@app/shared/components/status-indicators/kpi-card-grid.component';
import { KpiCardVM } from '@app/shared/models/module-overview.vm';

@Component({
    selector: 'app-controls-home',
    templateUrl: './controls-home.component.html',
    styleUrl: './controls-home.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        RouterModule,
        GrcDataTableComponent,
        TableModule,
        SkeletonModule,
        TagModule,
        ChartModule,
        TooltipModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        KpiCardGridComponent,
    ]
})
export class ControlsHomeComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  data = signal<ControlsHomeDto | null>(null);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  // ── KPI Cards ──────────────────────────────────────────────────────
  kpis = computed<KpiCardVM[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      {
        id: 'total-active',
        labelEn: 'Total Active Controls',
        labelAr: 'إجمالي الضوابط النشطة',
        value: d.totalActive,
        icon: 'verified',
        color: 'var(--primary)',
        bg: 'color-mix(in srgb, var(--primary) 12%, transparent)',
        route: '/controls/library',
        severity: 'default',
      },
      {
        id: 'key-controls',
        labelEn: 'Key Controls',
        labelAr: 'ضوابط رئيسية',
        value: d.keyControlCount,
        icon: 'key',
        color: 'var(--info)',
        bg: 'color-mix(in srgb, var(--info) 12%, transparent)',
        route: '/controls/library',
        queryParams: { keyControl: 'true' },
        severity: 'default',
      },
      {
        id: 'failed-tests',
        labelEn: 'Failed Tests This Period',
        labelAr: 'اختبارات فاشلة هذه الفترة',
        value: d.failedTestsThisPeriod,
        icon: 'times-circle',
        color: d.failedTestsThisPeriod > 0 ? 'var(--error)' : 'var(--success)',
        bg: d.failedTestsThisPeriod > 0
          ? 'color-mix(in srgb, var(--error) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        route: '/controls/testing',
        queryParams: { result: 'fail' },
        severity: d.failedTestsThisPeriod > 0 ? 'danger' : 'default',
      },
      {
        id: 'overdue-tests',
        labelEn: 'Overdue Tests',
        labelAr: 'اختبارات متأخرة',
        value: d.overdueTests,
        icon: 'clock',
        color: d.overdueTests > 0 ? 'var(--warning)' : 'var(--success)',
        bg: d.overdueTests > 0
          ? 'color-mix(in srgb, var(--warning) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        route: '/controls/testing',
        queryParams: { status: 'overdue' },
        severity: d.overdueTests > 0 ? 'warning' : 'default',
      },
      {
        id: 'open-deficiencies',
        labelEn: 'Open Deficiencies',
        labelAr: 'أوجه قصور مفتوحة',
        value: d.openDeficiencies,
        icon: 'exclamation-triangle',
        color: d.openDeficiencies > 0 ? 'var(--severity-high)' : 'var(--success)',
        bg: d.openDeficiencies > 0
          ? 'color-mix(in srgb, var(--severity-high) 10%, transparent)'
          : 'color-mix(in srgb, var(--success) 10%, transparent)',
        route: '/controls/deficiencies',
        severity: d.openDeficiencies > 0 ? 'danger' : 'default',
      },
      {
        id: 'certifications-due',
        labelEn: 'Certifications Due',
        labelAr: 'شهادات مستحقة',
        value: d.certificationsDue,
        icon: 'file-check',
        color: 'var(--info)',
        bg: 'color-mix(in srgb, var(--info) 12%, transparent)',
        route: '/controls/certifications',
        severity: 'default',
      },
    ];
  });

  // ── Automation Mix (Donut Chart) ───────────────────────────────────
  automationChartData = computed(() => {
    const d = this.data();
    if (!d) return null;
    const mix = d.automationMix;
    const ar = this.isAr();
    return {
      labels: ar
        ? ['يدوي', 'شبه آلي', 'آلي']
        : ['Manual', 'Semi-Automated', 'Automated'],
      datasets: [
        {
          data: [mix.manual, mix.semiAutomated, mix.automated],
          backgroundColor: [
            'var(--severity-high)',
            'var(--warning)',
            'var(--success)',
          ],
          borderWidth: 0,
        },
      ],
    };
  });

  automationChartOptions = {
    cutout: '60%',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12 } },
    },
  };

  // ── Health Trend (Line Chart) ──────────────────────────────────────
  healthTrendData = computed(() => {
    const d = this.data();
    if (!d?.healthTrend?.length) return null;
    return {
      labels: d.healthTrend.map(p => p.date),
      datasets: [
        {
          label: this.isAr() ? 'درجة الصحة' : 'Health Score',
          data: d.healthTrend.map(p => p.score),
          borderColor: 'var(--primary)',
          backgroundColor: 'color-mix(in srgb, var(--primary) 10%, transparent)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    };
  });

  healthTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 100, grid: { color: 'var(--border)' } },
      x: { grid: { display: false } },
    },
    plugins: {
      legend: { display: false },
    },
  };

  // ── Lifecycle ──────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api
      .getHome()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Map severity string to a token-based CSS class */
  severityClass(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'sev-critical';
      case 'high':
        return 'sev-high';
      case 'medium':
        return 'sev-medium';
      case 'low':
        return 'sev-low';
      default:
        return 'sev-info';
    }
  }

  /** Format a date string relative to the user locale */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(this.isAr() ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  /** Compute days overdue from a date string */
  daysOverdue(dateStr: string | undefined): number {
    if (!dateStr) return 0;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  /** Total from automation mix for percentage calculation */
  automationTotal = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return d.automationMix.manual + d.automationMix.semiAutomated + d.automationMix.automated;
  });

  /** Percentage helper for automation mix */
  automationPct(value: number): string {
    const total = this.automationTotal();
    if (!total) return '0%';
    return Math.round((value / total) * 100) + '%';
  }
}

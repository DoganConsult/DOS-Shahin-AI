/**
 * Controls Monitoring Page — AGRC-OS Controls Module
 *
 * Continuous monitoring: alert summary strip, monitoring rules table,
 * active alerts table, and health-by-family chart.
 *
 * @module controls
 * @see MonitoringRuleDto, MonitoringAlertDto, ControlMonitoringResponse
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { InputSwitchModule } from 'primeng/toggleswitch';
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';

import { ControlsApiService } from '../../services/controls-api.service';
import {
  MonitoringRuleDto,
  MonitoringAlertDto,
  ControlMonitoringResponse,
} from '../../services/controls-api.types';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { EmptyStateComponent } from '@app/shared/components/layouts/primitives/empty-state.component';
import { SkeletonLoaderComponent } from '@app/shared/components/layouts/primitives/skeleton-loader.component';
import { StatusBadgeComponent } from '@app/shared/components/status-indicators/badges/status-badge.component';
import { GrcDataTableComponent } from '@app/shared/components/grc-core/grc-data-table.component';

@Component({
    selector: 'app-controls-monitoring',
    templateUrl: './controls-monitoring.component.html',
    styleUrl: './controls-monitoring.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        SkeletonModule,
        TooltipModule,
        InputSwitchModule,
        ChartModule,
        EmptyStateComponent,
        SkeletonLoaderComponent,
        StatusBadgeComponent,
        GrcDataTableComponent,
    ]
})
export class ControlsMonitoringComponent implements OnInit {
  private api = inject(ControlsApiService);
  private destroyRef = inject(DestroyRef);
  readonly i18n = inject(I18nService);

  /** Reactive state */
  loading = signal(true);
  error = signal(false);
  rules = signal<MonitoringRuleDto[]>([]);
  alerts = signal<MonitoringAlertDto[]>([]);
  monitoring = signal<ControlMonitoringResponse | null>(null);

  /** Derived helpers */
  isAr = computed(() => this.i18n.currentLang() === 'ar');
  dir = computed<'ltr' | 'rtl'>(() => this.i18n.direction() as 'ltr' | 'rtl');

  /** Alert summary KPIs */
  totalAlerts = computed(() => this.alerts().length);
  criticalAlerts = computed(() =>
    this.alerts().filter(a => a.severity === 'critical').length
  );
  highAlerts = computed(() =>
    this.alerts().filter(a => a.severity === 'high').length
  );
  unacknowledged = computed(() =>
    this.alerts().filter(a => !a.acknowledgedBy).length
  );

  /** Health by family chart data */
  healthChartData = computed(() => {
    const m = this.monitoring();
    if (!m?.items?.length) return null;
    // Group by status for a simple bar chart
    const statusCounts: Record<string, number> = {};
    for (const item of m.items) {
      const status = item.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
    const labels = Object.keys(statusCounts);
    const values = Object.values(statusCounts);
    return {
      labels,
      datasets: [
        {
          label: this.isAr() ? 'عدد الضوابط' : 'Control Count',
          data: values,
          backgroundColor: [
            'var(--success)',
            'var(--warning)',
            'var(--error)',
            'var(--info)',
            'var(--severity-medium)',
          ],
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    };
  });

  healthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'var(--border)' },
        ticks: { precision: 0 },
      },
      x: { grid: { display: false } },
    },
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(false);

    // Load all three data sources in parallel
    this.api
      .getMonitoringRules()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.rules.set(data),
        error: () => {},
      });

    this.api
      .getMonitoringAlerts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.alerts.set(data),
        error: () => {},
      });

    this.api
      .getControlsMonitoring()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.monitoring.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** Acknowledge an alert */
  acknowledgeAlert(alertId: string): void {
    this.api
      .acknowledgeAlert(alertId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: () => this.loadData() });
  }

  /** Format date for display */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '\u2014';
    try {
      return new Date(dateStr).toLocaleDateString(
        this.isAr() ? 'ar-SA' : 'en-US',
        { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      );
    } catch {
      return dateStr;
    }
  }
}

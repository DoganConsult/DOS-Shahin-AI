import { Injectable, signal, computed } from '@angular/core';
import type { MetricDefinitionContract, MetricStatus, MetricType } from '../contracts/analytics.contracts';

@Injectable({ providedIn: 'root' })
export class AnalyticsState {
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _metrics = signal<MetricDefinitionContract[]>([]);
  private readonly _selectedMetricId = signal<string | null>(null);
  private readonly _filterType = signal<MetricType | null>(null);
  private readonly _filterStatus = signal<MetricStatus | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly metrics = this._metrics.asReadonly();
  readonly selectedMetricId = this._selectedMetricId.asReadonly();
  readonly filterType = this._filterType.asReadonly();
  readonly filterStatus = this._filterStatus.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly isEmpty = computed(() => !this._loading() && this._metrics().length === 0);
  readonly totalCount = computed(() => this._metrics().length);
  readonly selectedMetric = computed(() => this._metrics().find(m => m.metricId === this._selectedMetricId()) ?? null);
  readonly staleCount = computed(() => this._metrics().filter(m => m.status === 'stale').length);
  readonly kpiCount = computed(() => this._metrics().filter(m => m.metricType === 'kpi').length);

  setLoading(v: boolean): void { this._loading.set(v); }
  setError(v: string | null): void { this._error.set(v); }
  setMetrics(v: MetricDefinitionContract[]): void { this._metrics.set(v); }
  selectMetric(id: string | null): void { this._selectedMetricId.set(id); }
  setFilterType(v: MetricType | null): void { this._filterType.set(v); }
  setFilterStatus(v: MetricStatus | null): void { this._filterStatus.set(v); }

  reset(): void {
    this._loading.set(false);
    this._error.set(null);
    this._metrics.set([]);
    this._selectedMetricId.set(null);
    this._filterType.set(null);
    this._filterStatus.set(null);
  }
}

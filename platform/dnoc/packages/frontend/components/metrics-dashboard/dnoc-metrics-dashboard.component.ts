/**
 * DNOC Metrics Dashboard component.
 *
 * Reads recent samples for a configurable metric name through
 * DNOC_METRICS_FEED_PORT. Renders a simple sparkline + a tabular
 * tail of the last N values. Real Angular standalone component.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Input,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DNOC_METRICS_FEED_PORT, type DNOCMetricsFeedPort } from '../../ports';
import type { DNOCMetric } from '@dos/ports/dnoc';

@Component({
  selector: 'dnoc-metrics-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="dnoc-metrics">
      <header class="dnoc-metrics__header">
        <h2>{{ metricName }}</h2>
        <span class="dnoc-metrics__range">last {{ samples().length }} samples</span>
        <button type="button" (click)="refresh()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Refresh' }}
        </button>
      </header>

      <div *ngIf="error() as err" class="dnoc-metrics__error" role="alert">{{ err }}</div>

      <ng-container *ngIf="!loading() && samples().length > 0">
        <!-- Inline sparkline using SVG. Pure CSS — no chart lib. -->
        <svg
          [attr.viewBox]="'0 0 ' + width + ' ' + height"
          class="dnoc-metrics__sparkline"
          preserveAspectRatio="none"
        >
          <polyline
            [attr.points]="sparklinePath()"
            fill="none"
            stroke="#06c"
            stroke-width="1.5"
          />
        </svg>

        <table class="dnoc-metrics__table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Value</th>
              <th *ngIf="hasLabels()">Labels</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of tail(); trackBy: trackByTimestamp">
              <td>{{ s.timestamp }}</td>
              <td>{{ s.value }}</td>
              <td *ngIf="hasLabels()">{{ formatLabels(s.labels) }}</td>
            </tr>
          </tbody>
        </table>

        <p class="dnoc-metrics__stats">
          min {{ min() }} · avg {{ avg() | number:'1.0-2' }} · max {{ max() }}
        </p>
      </ng-container>

      <p *ngIf="!loading() && samples().length === 0" class="dnoc-metrics__empty">
        No samples yet for "{{ metricName }}".
      </p>
    </section>
  `,
  styles: [`
    .dnoc-metrics { font-family: system-ui, sans-serif; }
    .dnoc-metrics__header { display:flex; align-items:center; gap:0.5rem; }
    .dnoc-metrics__range { color:#666; }
    .dnoc-metrics__error { color:#a00; padding:0.5rem; border:1px solid #f00; }
    .dnoc-metrics__sparkline { width:100%; height:120px; background:#fafafa; border:1px solid #eee; }
    .dnoc-metrics__table { width:100%; border-collapse:collapse; margin-top:0.75rem; }
    .dnoc-metrics__table th, .dnoc-metrics__table td { padding:0.25rem 0.5rem; border-bottom:1px solid #eee; text-align:left; }
    .dnoc-metrics__stats { color:#444; padding-top:0.5rem; }
    .dnoc-metrics__empty { color:#666; padding:1rem; }
  `],
})
export class DnocMetricsDashboardComponent implements OnInit {
  @Input({ required: true }) metricName!: string;
  @Input() limit = 50;
  @Input() width = 400;
  @Input() height = 60;

  private port = inject<DNOCMetricsFeedPort>(DNOC_METRICS_FEED_PORT);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private readonly _samples = signal<readonly DNOCMetric[]>([]);
  readonly samples = computed(() => this._samples());

  readonly min = computed(() =>
    this.samples().length ? Math.min(...this.samples().map((s) => s.value)) : 0,
  );
  readonly max = computed(() =>
    this.samples().length ? Math.max(...this.samples().map((s) => s.value)) : 0,
  );
  readonly avg = computed(() => {
    const list = this.samples();
    if (list.length === 0) return 0;
    return list.reduce((sum, s) => sum + s.value, 0) / list.length;
  });

  readonly tail = computed(() => this.samples().slice(0, 20));
  readonly hasLabels = computed(() =>
    this.samples().some((s) => s.labels && Object.keys(s.labels).length > 0),
  );

  readonly sparklinePath = computed(() => {
    const list = [...this.samples()].reverse(); // chronological for sparkline
    if (list.length === 0) return '';
    const min = this.min();
    const max = this.max();
    const range = max - min || 1;
    const stepX = this.width / Math.max(list.length - 1, 1);
    return list
      .map((s, i) => `${i * stepX},${this.height - ((s.value - min) / range) * this.height}`)
      .join(' ');
  });

  ngOnInit(): void {
    void this.refresh();
  }

  trackByTimestamp(i: number, s: DNOCMetric): string {
    return `${s.timestamp ?? ''}-${i}`;
  }

  formatLabels(labels?: Readonly<Record<string, string>>): string {
    if (!labels) return '';
    return Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(' ');
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.port.recent(this.metricName, this.limit));
      this._samples.set([...list]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load metrics.');
    } finally {
      this.loading.set(false);
    }
  }
}

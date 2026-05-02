import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgxEchartsDirective } from 'ngx-echarts';
import { buildTrendLineOptions } from '../../../charts/trend-line.options';
import type { TrendSeries } from '../../../charts/trend-line.options';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-trend-line-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-widget-shell title="Compliance Trend" subtitle="Score over time" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      @if (options) {
        <div class="h-64 w-full">
          <div echarts [options]="options" class="h-full w-full"></div>
        </div>
      } @else {
        <div class="h-64 w-full flex items-center justify-center text-[var(--text-1)] text-sm">Loading…</div>
      }
    </app-widget-shell>
  `
})
export class TrendLineWidgetComponent implements OnInit, OnChanges {
  @Input() series: TrendSeries[] = [];
  @Input() yAxisLabel?: string;
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['series'] || changes['yAxisLabel'] || changes['loading']) {
      this.buildOptions();
    }
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    if (!this.series || this.series.length === 0) {
      this.state = 'empty';
      this.options = null;
      return;
    }
    this.options = buildTrendLineOptions(this.series, this.yAxisLabel);
    this.state = 'ready';
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}

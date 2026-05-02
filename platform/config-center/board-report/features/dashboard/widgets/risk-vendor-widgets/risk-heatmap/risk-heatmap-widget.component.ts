import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { buildRiskHeatmapOptions } from '../../../../../../shared/charts/echarts/risk/risk-heatmap.options';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-risk-heatmap-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    template: `
    <app-widget-shell title="Risk Heatmap" subtitle="Impact x Likelihood" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      @if (options) {
        <div class="h-64 w-full">
          <div echarts [options]="options" class="h-full w-full" (chartClick)="onChartClick($event)"></div>
        </div>
      } @else {
        <div class="h-64 w-full flex items-center justify-center text-[var(--text-1)] text-sm">Loading heatmap…</div>
      }
    </app-widget-shell>
  `
})
export class RiskHeatmapWidgetComponent implements OnInit, OnChanges {
  @Input() cells: { impact: number; likelihood: number; count: number; weightedScore?: number }[] = [];
  @Input() mode: 'count' | 'weighted' = 'count';
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() cellClick = new EventEmitter<{ impact: number; likelihood: number }>();
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  private currentCells: { impact: number; likelihood: number; count: number; weightedScore?: number }[] = [];

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cells'] || changes['mode'] || changes['loading']) this.buildOptions();
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    if (!this.cells || this.cells.length === 0) {
      this.state = 'empty';
      this.options = null;
      return;
    }
    this.options = buildRiskHeatmapOptions(this.cells, this.mode);
    this.state = 'ready';
  }

  onChartClick(event: GrcRecord): void {
    if (event?.data?.length >= 2) {
      const impact = (event.data[0] as number) + 1;
      const likelihood = (event.data[1] as number) + 1;
      this.cellClick.emit({ impact, likelihood });
    }
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}

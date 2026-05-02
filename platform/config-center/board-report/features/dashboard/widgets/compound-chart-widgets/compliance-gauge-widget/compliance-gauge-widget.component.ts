import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { NgxEchartsDirective } from 'ngx-echarts';
import { buildComplianceGaugeOptions } from '@compliance-module/ui/charts/compliance-gauge.options';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-compliance-gauge-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-widget-shell title="Compliance Score" subtitle="Overall programme gauge" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
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
export class ComplianceGaugeWidgetComponent implements OnInit, OnChanges {
  @Input() scorePercent: number | null = null;
  @Input() delta?: string;
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scorePercent'] || changes['delta'] || changes['loading']) {
      this.buildOptions();
    }
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    if (this.scorePercent === null || this.scorePercent === undefined) {
      this.state = 'empty';
      this.options = null;
      return;
    }
    this.options = buildComplianceGaugeOptions(this.scorePercent, this.delta);
    this.state = 'ready';
  }

  onRefresh(): void {
    this.refresh.emit();
  }
}

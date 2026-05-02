import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { buildVendorBubbleOptions } from '../../../../../../shared/charts/echarts/kpi-misc/vendor-trends/vendor-bubble.options';
import type { VendorPoint } from '../../../../../../shared/charts/echarts/kpi-misc/vendor-trends/vendor-bubble.options';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-vendor-bubble-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    template: `
    <app-widget-shell title="Vendor Risk (TPRM)" subtitle="Inherent vs Residual" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      @if (options) {
        <div class="h-64 w-full"><div echarts [options]="options" class="h-full w-full"></div></div>
      } @else {
        <div class="h-64 w-full flex items-center justify-center text-[var(--text-1)] text-sm">Loading…</div>
      }
    </app-widget-shell>
  `
})
export class VendorBubbleWidgetComponent implements OnInit, OnChanges {
  @Input() points: VendorPoint[] = [];
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points'] || changes['loading']) this.buildChart();
  }

  private buildChart(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    const data = this.points.length ? this.points : this.placeholder();
    this.options = buildVendorBubbleOptions(data);
    this.state = 'ready';
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  private placeholder(): VendorPoint[] {
    return [
      { name: 'Vendor A', value: 3, inherent: 3, residual: 2, size: 10 },
      { name: 'Vendor B', value: 4, inherent: 4, residual: 3, size: 15 },
      { name: 'Vendor C', value: 2, inherent: 2, residual: 1, size: 8 },
    ];
  }
}

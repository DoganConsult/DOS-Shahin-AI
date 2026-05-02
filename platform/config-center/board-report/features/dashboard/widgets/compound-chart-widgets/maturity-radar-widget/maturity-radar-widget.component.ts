import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { WidgetShellComponent } from '@app/dashboard';
import { buildMaturityRadarOptions } from '../../../../../../shared/charts/echarts/maturity/maturity-radar.options';
import type { MaturityValue } from '../../../../../../shared/charts/echarts/maturity/maturity-radar.options';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-maturity-radar-widget',
    imports: [WidgetShellComponent, NgxEchartsDirective],
    template: `
    <app-widget-shell title="Compliance Maturity" subtitle="By domain" [state]="state" [canRefresh]="canRefresh" (refresh)="onRefresh()">
      @if (options) {
        <div class="h-64 w-full"><div echarts [options]="options" class="h-full w-full"></div></div>
      } @else {
        <div class="h-64 w-full flex items-center justify-center text-[var(--text-1)] text-sm">Loading…</div>
      }
    </app-widget-shell>
  `
})
export class MaturityRadarWidgetComponent implements OnInit, OnChanges {
  @Input() values: MaturityValue[] = [];
  @Input() loading?: boolean;
  @Input() canRefresh = true;
  @Output() refresh = new EventEmitter<void>();

  options: EChartsOption | null = null;
  state: 'ready' | 'loading' | 'empty' | 'error' = 'ready';

  ngOnInit(): void {
    this.buildOptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['values'] || changes['loading']) this.buildOptions();
  }

  private buildOptions(): void {
    if (this.loading === true) {
      this.state = 'loading';
      this.options = null;
      return;
    }
    const data = this.values?.length ? this.values : this.placeholder();
    this.options = buildMaturityRadarOptions(data);
    this.state = 'ready';
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  private placeholder(): MaturityValue[] {
    return [
      { name: 'Governance', score: 70 },
      { name: 'Risk', score: 60 },
      { name: 'Compliance', score: 80 },
      { name: 'Evidence', score: 50 },
      { name: 'Reporting', score: 75 },
    ];
  }
}

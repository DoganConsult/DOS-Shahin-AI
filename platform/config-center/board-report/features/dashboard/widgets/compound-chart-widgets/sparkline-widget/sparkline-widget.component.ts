import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy} from '@angular/core';
import { buildSparklineOptions } from '../../../charts/sparkline.options';
import type { EChartsOption } from 'echarts';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-sparkline-widget',
  standalone: true,
  imports: [NgxEchartsDirective],
  template: `
    @if (options) {
      <div class="h-10 w-full min-w-[80px]"><div echarts [options]="options" class="h-full w-full"></div></div>
    }
  `,
})
export class SparklineWidgetComponent implements OnInit, OnChanges {
  @Input() points: number[] = [];

  options: EChartsOption | null = null;

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['points']) this.buildChart();
  }

  private buildChart(): void {
    const data = this.points.length ? this.points : [40, 55, 60, 70, 65, 80, 75];
    this.options = buildSparklineOptions(data);
  }
}

/**
 * TrendLineEchartComponent — General-purpose trend line chart.
 *
 * Uses `buildTrendLineOptions` from line-builders.
 * Requirements: 11.8
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildTrendLineOptions } from '../../echart-builders/line-builders';
import type { TimeSeriesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-trend-line-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Trend Line Chart'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class TrendLineEchartComponent implements OnInit, OnChanges {
  @Input() data!: TimeSeriesData;

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildTrendLineOptions(this.data);
    }
  }
}

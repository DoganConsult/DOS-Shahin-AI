/**
 * MonteCarloDistributionComponent — Monte Carlo histogram with percentile markers.
 *
 * Uses `buildMonteCarloHistogramOptions` from bar-builders.
 * Requirements: 11.15
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildMonteCarloHistogramOptions } from '../../echart-builders/bar-builders';
import type { MonteCarloHistogramData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-monte-carlo-distribution',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Monte Carlo Distribution Histogram'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class MonteCarloDistributionComponent implements OnInit, OnChanges {
  @Input() data!: MonteCarloHistogramData;

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
      this.chartOptions = buildMonteCarloHistogramOptions(this.data);
    }
  }
}

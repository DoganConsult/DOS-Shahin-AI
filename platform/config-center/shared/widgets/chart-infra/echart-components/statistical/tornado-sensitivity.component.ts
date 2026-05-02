/**
 * TornadoSensitivityComponent — Tornado sensitivity analysis chart.
 *
 * Uses `buildTornadoChartOptions` from bar-builders.
 * Requirements: 11.17
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildTornadoChartOptions } from '../../echart-builders/bar-builders';
import type { TornadoChartData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-tornado-sensitivity',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Tornado Sensitivity Chart'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class TornadoSensitivityComponent implements OnInit, OnChanges {
  @Input() data!: TornadoChartData;

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
      this.chartOptions = buildTornadoChartOptions(this.data);
    }
  }
}

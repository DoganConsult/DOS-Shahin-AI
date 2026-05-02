/**
 * MaturityRadarEchartComponent — Maturity radar comparing current vs target levels.
 *
 * Uses `buildMaturitySpiderOptions` from pie-radar-gauge-builders.
 * Requirements: 11.2
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildMaturitySpiderOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { RadarData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-maturity-radar-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Maturity Radar'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class MaturityRadarEchartComponent implements OnInit, OnChanges {
  @Input() data!: RadarData;

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
      this.chartOptions = buildMaturitySpiderOptions(this.data);
    }
  }
}

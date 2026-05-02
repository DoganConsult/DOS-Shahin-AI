/**
 * KpiTilesComponent — Grid of animated KPI gauges.
 *
 * Uses `buildKpiTilesAnimatedOptions` from pie-radar-gauge-builders.
 * Requirements: 12.5
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildKpiTilesAnimatedOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { KpiTilesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-kpi-tiles',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'KPI Tiles'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class KpiTilesComponent implements OnInit, OnChanges {
  @Input() data!: KpiTilesData;

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
      this.chartOptions = buildKpiTilesAnimatedOptions(this.data);
    }
  }
}

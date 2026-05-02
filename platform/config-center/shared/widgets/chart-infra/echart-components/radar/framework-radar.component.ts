/**
 * FrameworkRadarComponent — Radar chart of framework maturity levels.
 *
 * Uses `buildMaturityRadarOptions` from pie-radar-gauge-builders.
 * Requirements: 11.1
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildMaturityRadarOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { RadarData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-framework-radar',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Framework Maturity Radar'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class FrameworkRadarComponent implements OnInit, OnChanges {
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
      this.chartOptions = buildMaturityRadarOptions(this.data);
    }
  }
}

/**
 * ComplianceGaugeEchartComponent — Compliance score gauge with color-coded zones.
 *
 * Uses `buildComplianceGaugeOptions` from pie-radar-gauge-builders with color zones.
 * Requirements: 10.8
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildComplianceGaugeOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { GaugeData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-compliance-gauge-echart',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Compliance Gauge'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ComplianceGaugeEchartComponent implements OnInit, OnChanges {
  @Input() data!: GaugeData;

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
      this.chartOptions = buildComplianceGaugeOptions(this.data);
    }
  }
}

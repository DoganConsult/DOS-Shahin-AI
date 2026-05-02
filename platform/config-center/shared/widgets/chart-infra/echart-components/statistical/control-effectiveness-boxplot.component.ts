/**
 * ControlEffectivenessBoxplotComponent — Boxplot of control effectiveness score distributions.
 *
 * Uses `buildControlEffectivenessBoxplotOptions` from advanced-builders.
 * Requirements: 11.18
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildControlEffectivenessBoxplotOptions } from '../../echart-builders/advanced-builders';
import type { BoxplotData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-control-effectiveness-boxplot',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Control Effectiveness Boxplot'">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ControlEffectivenessBoxplotComponent implements OnInit, OnChanges {
  @Input() data!: BoxplotData;

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
      this.chartOptions = buildControlEffectivenessBoxplotOptions(this.data);
    }
  }
}

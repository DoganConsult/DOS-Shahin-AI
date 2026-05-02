/**
 * ControlTestingDonutComponent — Donut chart of control testing status distribution.
 *
 * Uses `buildControlTestingDonutOptions` from pie-radar-gauge-builders.
 * Requirements: 10.9
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildControlTestingDonutOptions } from '../../echart-builders/pie-radar-gauge-builders';
import type { DonutData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-control-testing-donut',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Control Testing Donut'"
      (chartClick)="onSegmentClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ControlTestingDonutComponent implements OnInit, OnChanges {
  @Input() data!: DonutData;
  @Output() segmentDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onSegmentClick(event: GrcRecord): void {
    this.segmentDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildControlTestingDonutOptions(this.data);
    }
  }
}

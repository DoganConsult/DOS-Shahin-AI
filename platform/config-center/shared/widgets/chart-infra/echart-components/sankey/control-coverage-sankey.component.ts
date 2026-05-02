/**
 * ControlCoverageSankeyComponent — Sankey diagram of control-to-framework coverage.
 *
 * Uses `buildControlCoverageSankeyOptions` from advanced-builders.
 * Requirements: 10.4
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildControlCoverageSankeyOptions } from '../../echart-builders/advanced-builders';
import type { SankeyData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-control-coverage-sankey',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Control Coverage Sankey Diagram'"
      (chartClick)="onNodeClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ControlCoverageSankeyComponent implements OnInit, OnChanges {
  @Input() data!: SankeyData;
  @Output() nodeDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onNodeClick(event: GrcRecord): void {
    this.nodeDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildControlCoverageSankeyOptions(this.data);
    }
  }
}

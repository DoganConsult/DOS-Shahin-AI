/**
 * ComplianceCoverageTreemapComponent — Compliance coverage treemap.
 *
 * Uses `buildComplianceCoverageTreemapOptions` from scatter-heatmap-treemap-builders.
 * Requirements: 12.11
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildComplianceCoverageTreemapOptions } from '../../echart-builders/scatter-heatmap-treemap-builders';
import type { TreemapData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-compliance-coverage-treemap',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Compliance Coverage Treemap'"
      (chartClick)="onNodeClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ComplianceCoverageTreemapComponent implements OnInit, OnChanges {
  @Input() data!: TreemapData;
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
      this.chartOptions = buildComplianceCoverageTreemapOptions(this.data);
    }
  }
}

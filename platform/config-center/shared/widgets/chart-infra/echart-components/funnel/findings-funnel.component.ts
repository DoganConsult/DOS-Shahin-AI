/**
 * FindingsFunnelComponent — Findings progression funnel chart.
 *
 * Uses `buildFindingsFunnelOptions` from advanced-builders.
 * Requirements: 10.6
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildFindingsFunnelOptions } from '../../echart-builders/advanced-builders';
import type { FunnelData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-findings-funnel',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Findings Funnel'"
      (chartClick)="onStageClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class FindingsFunnelComponent implements OnInit, OnChanges {
  @Input() data!: FunnelData;
  @Output() stageDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onStageClick(event: GrcRecord): void {
    this.stageDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildFindingsFunnelOptions(this.data);
    }
  }
}

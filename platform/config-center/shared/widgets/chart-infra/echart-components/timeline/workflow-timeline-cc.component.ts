/**
 * WorkflowTimelineCcComponent — Workflow stage timeline with status indicators.
 *
 * Uses `buildIncidentSwimLaneOptions` from custom-3d-builders for swim-lane rendering.
 * Requirements: 9.7
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildIncidentSwimLaneOptions } from '../../echart-builders/advanced/custom-3d-builders';
import type { SwimLaneData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-workflow-timeline-cc',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Workflow Stage Timeline'"
      (chartClick)="onEventClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class WorkflowTimelineCcComponent implements OnInit, OnChanges {
  @Input() data!: SwimLaneData;
  @Output() eventDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onEventClick(event: GrcRecord): void {
    this.eventDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildIncidentSwimLaneOptions(this.data);
    }
  }
}

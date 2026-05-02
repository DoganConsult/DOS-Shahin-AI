/**
 * IncidentSeismographComponent — Real-time incident activity chart.
 *
 * Uses `buildControlHeartbeatOptions` from line-builders adapted for incidents.
 * Requirements: 12.4
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildControlHeartbeatOptions } from '../../echart-builders/line-builders';
import type { TimeSeriesData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-incident-seismograph',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Incident Seismograph'"
      (chartClick)="onPointClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class IncidentSeismographComponent implements OnInit, OnChanges {
  @Input() data!: TimeSeriesData;
  @Output() pointDrillDown = new EventEmitter<unknown>();

  chartOptions: EChartsOption = {};

  ngOnInit(): void {
    this.buildChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.buildChart();
    }
  }

  onPointClick(event: GrcRecord): void {
    this.pointDrillDown.emit(event?.data ?? event);
  }

  private buildChart(): void {
    if (this.data) {
      this.chartOptions = buildControlHeartbeatOptions(this.data);
    }
  }
}

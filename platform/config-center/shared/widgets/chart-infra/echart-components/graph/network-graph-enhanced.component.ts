/**
 * NetworkGraphEnhancedComponent — Enhanced network graph with clustering and edge bundling.
 *
 * Uses `buildNetworkGraphEnhancedOptions` from advanced-builders.
 * Requirements: 10.2
 */
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import { buildNetworkGraphEnhancedOptions } from '../../echart-builders/advanced-builders';
import type { GraphData } from '../../echart-builders/builder-types';
import type { EChartsOption } from 'echarts';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    selector: 'app-network-graph-enhanced',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      [options]="chartOptions"
      [ariaLabel]="'Enhanced Network Graph'"
      (chartClick)="onNodeClick($event)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class NetworkGraphEnhancedComponent implements OnInit, OnChanges {
  @Input() data!: GraphData;
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
      this.chartOptions = buildNetworkGraphEnhancedOptions(this.data);
    }
  }
}

/**
 * ChartCarouselComponent — Cycles through multiple ECharts visualizations.
 *
 * Has @Input() charts: EChartsOption[] and cycles with a timer.
 * Requirements: 12.3
 */
import { Component, Input, ChangeDetectionStrategy, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppEchartComponent } from '../../echart-wrapper/app-echart.component';
import type { EChartsOption } from 'echarts';

@Component({
    selector: 'app-chart-carousel',
    imports: [CommonModule, AppEchartComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <app-echart
      *ngIf="currentOptions"
      [options]="currentOptions"
      [ariaLabel]="'Chart Carousel - slide ' + (currentIndex + 1) + ' of ' + (charts.length || 0)">
    </app-echart>
  `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ChartCarouselComponent implements OnInit, OnDestroy, OnChanges {
  @Input() charts: EChartsOption[] = [];
  @Input() intervalMs: number = 5000;

  currentIndex = 0;
  currentOptions: EChartsOption | null = null;

  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateCurrent();
    this.startTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['charts'] && !changes['charts'].firstChange) {
      this.currentIndex = 0;
      this.updateCurrent();
      this.restartTimer();
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private startTimer(): void {
    if (!this.charts?.length || this.charts.length <= 1) return;
    this.timerId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.charts.length;
      this.updateCurrent();
    }, this.intervalMs);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private restartTimer(): void {
    this.stopTimer();
    this.startTimer();
  }

  private updateCurrent(): void {
    this.currentOptions = this.charts?.[this.currentIndex] ?? null;
  }
}

/**
 * Plotly Chart Component
 * 
 * This component is used ONLY for real 3D visualizations (surface plots, 3D scatter, 3D mesh)
 * and WebGL-accelerated 3D rendering.
 * 
 * For all 2D charts, use ECharts (app-echart) instead.
 * 
 * @see CHART_POLICY.md for chart library usage policy
 */
import {
  Component, Input, ChangeDetectionStrategy, ElementRef,
  ViewChild, OnChanges, OnDestroy, AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GrcRecord } from '@app/core/models/shared.types';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-plotly-chart',
    imports: [CommonModule],
    template: `<div #plotlyContainer class="plotly-chart-container" [style.height]="height || null"></div>`,
    styles: [`.plotly-chart-container { width: 100%; min-height: 200px; }`]
})
export class PlotlyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: unknown[] = [];
  @Input() layout: Record<string, unknown> = {};
  @Input() config?: Record<string, unknown>;
  @Input() animate?: boolean;
  @Input() height?: string;

  @ViewChild('plotlyContainer') container!: ElementRef<HTMLDivElement>;
  private Plotly: GrcRecord | null = null;
  private rendered = false;

  async ngAfterViewInit() {
    try {
      this.Plotly = await import('plotly.js-dist-min');
      this.render();
    } catch {
      console.warn('[PlotlyChart] plotly.js-dist-min not available');
    }
  }

  ngOnChanges() {
    if (this.Plotly && this.rendered) this.render();
  }

  ngOnDestroy() {
    if (this.Plotly && this.container?.nativeElement) {
      this.Plotly.purge(this.container.nativeElement);
    }
  }

  private render(): void {
    if (!this.Plotly || !this.container?.nativeElement || !this.data) return;
    const el = this.container.nativeElement;
    const layout = { ...this.layout as object, autosize: true };
    const config = { responsive: true, displayModeBar: false, ...(this.config as object || {}) };

    if (this.rendered && this.animate) {
      this.Plotly.react(el, this.data, layout, config);
    } else {
      this.Plotly.newPlot(el, this.data, layout, config);
      this.rendered = true;
    }
  }
}

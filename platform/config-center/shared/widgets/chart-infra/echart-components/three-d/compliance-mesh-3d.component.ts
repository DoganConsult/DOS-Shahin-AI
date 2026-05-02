/**
 * ComplianceMesh3dComponent — Plotly 3D mesh surface showing compliance scores.
 *
 * Uses Plotly.js for 3D rendering with WebGL fallback message.
 * Requirements: 9.8
 */
import {
  Component,
  Input,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { HeatmapData } from '../../echart-builders/builder-types';
import { isWebGLAvailable } from '../../echart-wrapper/webgl-detect';
import { getPlotlyGlobal, PlotlyLayout, PlotlyTrace } from '../../chart-utils';

@Component({
    selector: 'app-compliance-mesh-3d',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div *ngIf="webGLSupported; else noWebGL" #plotContainer class="plot-container"></div>
    <ng-template #noWebGL>
      <div class="webgl-fallback" role="alert">
        <span class="fallback-icon">⚠️</span>
        <p>3D visualization requires WebGL support. Please use a modern browser with hardware acceleration enabled.</p>
      </div>
    </ng-template>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .plot-container { width: 100%; height: 100%; min-height: 300px; }
    .webgl-fallback {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; min-height: 200px; color: var(--text-muted, #6f6f6f);
      font-size: var(--font-size-base); text-align: center; padding: 1rem;
    }
    .fallback-icon { font-size: var(--font-size-4xl); margin-bottom: 0.5rem; }
  `]
})
export class ComplianceMesh3dComponent implements AfterViewInit, OnChanges {
  @Input() data!: HeatmapData;
  @ViewChild('plotContainer') plotContainer!: ElementRef<HTMLDivElement>;

  webGLSupported = isWebGLAvailable();

  ngAfterViewInit(): void {
    this.renderPlot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && !changes['data'].firstChange) {
      this.renderPlot();
    }
  }

  private renderPlot(): void {
    if (!this.webGLSupported || !this.data || !this.plotContainer?.nativeElement) return;

    const plotly = getPlotlyGlobal();
    if (!plotly) return;

    const trace: PlotlyTrace = {
      type: 'surface',
      z: this.data.values,
      x: this.data.columns,
      y: this.data.rows,
      colorscale: 'Viridis',
      showscale: true,
    };

    const layout: PlotlyLayout = {
      autosize: true,
      margin: { l: 40, r: 20, t: 30, b: 40 },
      scene: {
        xaxis: { title: 'Controls' },
        yaxis: { title: 'Categories' },
        zaxis: { title: 'Score' },
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
    };

    plotly.newPlot(this.plotContainer.nativeElement, [trace], layout, { responsive: true });
  }
}

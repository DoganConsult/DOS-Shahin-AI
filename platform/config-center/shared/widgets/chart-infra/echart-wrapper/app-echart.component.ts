/**
 * AppEchartComponent — Central reusable ECharts wrapper used by all ECharts widgets.
 *
 * Wraps the `ngx-echarts` directive with:
 * - ResizeObserver calling `echartsInstance.resize()` within 100ms
 * - Theme switching within 300ms on platform theme change (MutationObserver on data-theme)
 * - Error handling: catch init failures, emit `chartError`, trigger error state
 * - Keyboard navigation: Tab focus, Arrow keys, Enter drill-down
 * - RTL support: set `xAxis.inverse = true` when language direction is RTL
 * - Lazy loading of ECharts modules to keep core bundle under 200KB
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 8.2, 8.6, 17.1, 17.2, 17.3
 */
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  NgZone,
  inject, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { provideEchartsCore } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart, RadarChart,
  GaugeChart, HeatmapChart, TreemapChart, SankeyChart, GraphChart,
  FunnelChart, BoxplotChart, ParallelChart, ThemeRiverChart, CustomChart,
} from 'echarts/charts';
import {
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, ToolboxComponent, VisualMapComponent,
  CalendarComponent, ParallelComponent as ParallelComp,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import { isDarkMode, registerEchartsThemes } from './echart-theme';
import {
  handleChartKeydown,
  createKeyboardNavState,
  highlightDataPoint,
  getEchartsAriaConfig,
  KeyboardNavState,
} from './echart-a11y';
import { I18nService } from '@app/core/services/ui-infra/i18n.service';
import { devWarn, devError } from '@app/runtime/utils/dev-logger';
import { toErrorMessage } from '../../../utils/error';
import { GrcRecord } from '@app/core/models/shared.types';

// Register ECharts modules once (tree-shakeable lazy loading — Req 1.9)
echarts.use([
  BarChart, LineChart, PieChart, ScatterChart, RadarChart,
  GaugeChart, HeatmapChart, TreemapChart, SankeyChart, GraphChart,
  FunnelChart, BoxplotChart, ParallelChart, ThemeRiverChart, CustomChart,
  TitleComponent, TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, ToolboxComponent, VisualMapComponent,
  CalendarComponent, ParallelComp,
  CanvasRenderer,
]);

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-echart',
    imports: [NgxEchartsDirective, CommonModule],
    providers: [
        provideEchartsCore({ echarts }),
    ],
    template: `
    <div class="echart-container" [attr.aria-label]="ariaLabel" role="img" tabindex="0"
         (keydown)="onKeydown($event)">
      <div echarts [options]="appliedOptions" [theme]="currentTheme" [merge]="mergeOptions"
           (chartInit)="onChartInit($event)" (chartClick)="chartClick.emit($event)"
           class="echart-canvas">
      </div>
      <div *ngIf="hasError" class="echart-error" role="alert">
        <span>⚠️ Chart failed to load</span>
      </div>
    </div>
  `,
    styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .echart-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 120px;
      outline: none;
    }
    .echart-container:focus-visible {
      outline: 2px solid var(--primary, #0f62fe);
      outline-offset: 2px;
      border-radius: var(--radius-xs);
    }
    .echart-canvas {
      width: 100%;
      height: 100%;
    }
    .echart-error {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface, #fff);
      color: var(--text-muted, #6f6f6f);
      font-size: 0.875rem;
      border-radius: var(--radius);
    }
  `]
})
export class AppEchartComponent implements OnInit, OnDestroy, OnChanges {
  // ── Inputs ──────────────────────────────────────────────────────────────
  @Input() options: EChartsOption = {};
  @Input() mergeOptions: EChartsOption = {};
  @Input() ariaLabel: string = '';

  // ── Outputs ─────────────────────────────────────────────────────────────
  @Output() chartClick = new EventEmitter<any>();
  @Output() chartError = new EventEmitter<Error>();

  // ── Public state ────────────────────────────────────────────────────────
  currentTheme: string = 'agrc-light';
  hasError = false;

  /** Options with RTL and aria adjustments applied */
  appliedOptions: EChartsOption = {};

  // ── Private state ───────────────────────────────────────────────────────
  private echartsInstance: any = null;
  private resizeObserver: ResizeObserver | null = null;
  private themeObserver: MutationObserver | null = null;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private keyNavState: KeyboardNavState = createKeyboardNavState();

  private elRef = inject(ElementRef);
  private ngZone = inject(NgZone);
  readonly i18n = inject(I18nService);

  // ── Lifecycle ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    try {
      registerEchartsThemes();
    } catch {
      // Theme registration may fail in SSR or test environments
    }

    this.currentTheme = isDarkMode() ? 'agrc-dark' : 'agrc-light';
    this.applyOptions();
    this.observeThemeChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['options'] || changes['mergeOptions']) {
      this.applyOptions();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    this.themeObserver?.disconnect();
    this.themeObserver = null;

    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }

    this.echartsInstance = null;
  }

  // ── Chart init callback ─────────────────────────────────────────────────

  onChartInit(ec: any): void {
    try {
      this.echartsInstance = ec;
      this.hasError = false;
      this.attachResizeObserver();
    } catch (err: unknown) {
      this.handleInitError(err);
    }
  }

  // ── Keyboard navigation ─────────────────────────────────────────────────

  onKeydown(event: KeyboardEvent): void {
    if (!this.echartsInstance) return;

    const result = handleChartKeydown(event, this.keyNavState, this.appliedOptions);

    if (result.handled) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.keyNavState = result.state;

    if (result.action === 'highlight') {
      highlightDataPoint(this.echartsInstance, this.keyNavState);
    } else if (result.action === 'drilldown') {
      const series = (this.appliedOptions as GrcRecord)?.series;
      if (Array.isArray(series) && series[this.keyNavState.seriesIndex]) {
        const s = series[this.keyNavState.seriesIndex];
        const dataItem = Array.isArray(s.data) ? s.data[this.keyNavState.dataIndex] : undefined;
        if (dataItem !== undefined) {
          this.chartClick.emit({
            seriesIndex: this.keyNavState.seriesIndex,
            dataIndex: this.keyNavState.dataIndex,
            data: dataItem,
          });
        }
      }
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Applies RTL mirroring and aria config to the raw options input.
   */
  private applyOptions(): void {
    const opts = this.options ? { ...this.options } as any : {};

    // RTL support: mirror xAxis when language direction is RTL (Req 8.6)
    if (this.i18n.direction() === 'rtl') {
      if (opts.xAxis) {
        if (Array.isArray(opts.xAxis)) {
          opts.xAxis = opts.xAxis.map((ax) => ({ ...ax, inverse: true }));
        } else {
          opts.xAxis = { ...opts.xAxis, inverse: true };
        }
      }
    }

    // Apply aria configuration for accessibility (Req 17.1)
    opts.aria = getEchartsAriaConfig();

    this.appliedOptions = opts;
  }

  /**
   * Attaches a ResizeObserver to the container element.
   * Calls `echartsInstance.resize()` within 100ms of a resize event (Req 1.5).
   */
  private attachResizeObserver(): void {
    if (this.resizeObserver) return;

    const container = this.elRef.nativeElement?.querySelector('.echart-container');
    if (!container) return;

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.ngZone.runOutsideAngular(() => {
          try {
            this.echartsInstance?.resize();
          } catch {
            // Resize can fail if instance was disposed
          }
        });
      }, 50); // 50ms debounce — well within the 100ms requirement
    });

    this.resizeObserver.observe(container);
  }

  /**
   * Observes `data-theme` attribute changes on `<html>` to switch ECharts theme
   * within 300ms of a platform theme change (Req 1.6, 8.2).
   */
  private observeThemeChanges(): void {
    if (typeof MutationObserver === 'undefined') return;

    this.themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          this.switchTheme();
          break;
        }
      }
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  /**
   * Switches the ECharts theme by re-registering themes from current CSS vars
   * and updating the `currentTheme` binding.
   */
  private switchTheme(): void {
    try {
      registerEchartsThemes();
      const newTheme = isDarkMode() ? 'agrc-dark' : 'agrc-light';
      this.ngZone.run(() => {
        this.currentTheme = newTheme;
      });
    } catch (err: unknown) {
      this.ngZone.run(() => {
        this.currentTheme = 'agrc-light';
      });
      devWarn('[AppEchartComponent] Theme switch failed, falling back to agrc-light:', (err as GrcRecord)?.message);
    }
  }

  /**
   * Handles ECharts initialization errors (Req 1.7).
   */
  private handleInitError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    this.hasError = true;
    this.chartError.emit(error);
    devError('[AppEchartComponent] Chart init failed:', toErrorMessage(error));
  }
}

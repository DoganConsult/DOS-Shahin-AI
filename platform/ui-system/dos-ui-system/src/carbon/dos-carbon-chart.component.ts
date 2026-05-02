import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DosCarbonChartKind =
  | 'line'
  | 'area' | 'area-stacked'
  | 'bar' | 'bar-grouped' | 'bar-stacked' | 'lollipop'
  | 'pie' | 'donut' | 'gauge' | 'meter'
  | 'scatter' | 'bubble'
  | 'histogram' | 'boxplot'
  | 'heatmap' | 'choropleth'
  | 'tree' | 'treemap' | 'circle-pack'
  | 'radar'
  | 'alluvial'
  | 'wordcloud'
  | 'bullet'
  | 'combo';

/**
 * Carbon-backed chart facade — placeholder.
 *
 * The `@carbon/charts-angular` package ships a legacy NgModule
 * (`ChartsModule`) that does NOT publish the Angular 21 standalone
 * NgModule metadata (`ɵmod`), so it cannot be added to a standalone
 * component's `imports` array. This wrapper currently renders a
 * placeholder until one of the following lands:
 *
 *   1. `@carbon/charts-angular` ships a standalone-compatible build
 *      (tracked upstream).
 *   2. We host an NgModule-bridge component (non-standalone) that
 *      imports `ChartsModule` and re-exports the chart elements as
 *      directives the standalone wrapper can compose.
 *   3. We swap to an alternate engine (ECharts via `ngx-echarts`,
 *      already in deps) for the chart kinds we render today.
 *
 * Inputs are kept on the component so callers don't need to change
 * their template once one of the above paths lands.
 */
@Component({
  selector: 'dos-carbon-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dos-cb-chart" role="figure">
      <p class="dos-cb-chart__placeholder">
        Chart engine not yet wired — kind: <code>{{ kind }}</code>
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; inline-size: 100%; }
    .dos-cb-chart {
      padding: var(--dos-space-4);
      background: var(--dos-color-surface-muted);
      border: 1px dashed var(--dos-color-border-subtle);
      border-radius: var(--dos-radius-card);
      text-align: center;
      color: var(--dos-color-text-muted);
      font-size: var(--dos-caption-size);
    }
    .dos-cb-chart__placeholder { margin: 0; }
  `],
})
export class DosCarbonChartComponent {
  @Input() kind: DosCarbonChartKind = 'line';
  @Input() data: unknown[] = [];
  @Input() options: Record<string, unknown> = {};
}

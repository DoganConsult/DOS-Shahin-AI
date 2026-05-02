export type DosCarbonChartKind = 'line' | 'area' | 'area-stacked' | 'bar' | 'bar-grouped' | 'bar-stacked' | 'lollipop' | 'pie' | 'donut' | 'gauge' | 'meter' | 'scatter' | 'bubble' | 'histogram' | 'boxplot' | 'heatmap' | 'choropleth' | 'tree' | 'treemap' | 'circle-pack' | 'radar' | 'alluvial' | 'wordcloud' | 'bullet' | 'combo';
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
export declare class DosCarbonChartComponent {
    kind: DosCarbonChartKind;
    data: unknown[];
    options: Record<string, unknown>;
}

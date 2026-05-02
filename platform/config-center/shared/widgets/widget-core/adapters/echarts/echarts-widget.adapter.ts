/**
 * ECharts engine adapter.
 * Existing AppEchartComponent at shared/widgets/echart-wrapper/app-echart.component.ts
 * remains the rendering shell. This adapter maps WidgetManifest data contracts
 * to EChartsOption structures.
 */
export interface EchartsAdapterConfig {
  widgetId: string;
  chartType: string;
  options?: Record<string, unknown>;
}

/** Marker to identify ECharts-powered widgets for engine-specific behavior. */
export function isEchartsWidget(engine: string): boolean {
  return engine === 'echarts';
}

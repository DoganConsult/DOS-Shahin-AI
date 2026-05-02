/**
 * D3 engine adapter.
 * D3 chart components at shared/widgets/d3-charts/* remain unchanged.
 * This adapter provides engine identification and shared D3 utilities.
 */
export interface D3AdapterConfig {
  widgetId: string;
  chartType: string;
}

export function isD3Widget(engine: string): boolean {
  return engine === 'd3';
}

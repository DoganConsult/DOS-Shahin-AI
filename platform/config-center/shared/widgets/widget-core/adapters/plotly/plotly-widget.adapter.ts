/**
 * Plotly engine adapter for 3D visualizations.
 * Plotly components at shared/widgets/echart-components/three-d/* remain unchanged.
 */
export interface PlotlyAdapterConfig {
  widgetId: string;
  chartType: string;
}

export function isPlotlyWidget(engine: string): boolean {
  return engine === 'plotly';
}

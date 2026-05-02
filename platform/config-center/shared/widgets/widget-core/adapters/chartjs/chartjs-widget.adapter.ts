/**
 * Chart.js / PrimeNG engine adapter.
 * 
 * @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Chart.js is legacy and should not be used for new charts.
 * Use ECharts (app-echart) for all new chart implementations.
 * 
 * This adapter is maintained for backward compatibility only.
 * Existing Chart.js charts should be migrated to ECharts when feasible.
 * 
 * @see CHART_POLICY.md for chart library usage policy
 */
export interface ChartjsAdapterConfig {
  widgetId: string;
  chartType: string;
}

export function isChartjsWidget(engine: string): boolean {
  return engine === 'chartjs';
}

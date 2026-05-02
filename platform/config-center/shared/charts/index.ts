/**
 * Charts Barrel Export
 * 
 * This barrel export provides convenient access to canonical chart components.
 * 
 * NOTE: Direct imports are preferred for better tree-shaking, but this barrel
 * export is provided for convenience.
 * 
 * @see CHART_POLICY.md for chart library usage policy
 * @see CANONICAL_COMPONENT_MAP.md for complete component documentation
 */

// Primary Chart Engine: ECharts
export { EChartComponent } from './echart.component';
export { AppEchartComponent } from '../widgets/echart-wrapper/app-echart.component';

// 3D Chart Engine: Plotly
export { PlotlyChartComponent } from './plotly-chart.component';

// ECharts Builders (from echarts directory)
export * from './echarts';

// D3 Charts (specialty/custom — HeatmapCell excluded to avoid ambiguity with echarts barrel)
export { AnimatedDonutChartComponent, DonutSegment, RiskHeatmapChartComponent, GaugeChartComponent, RadarChartComponent, RadarAxis, SparklineChartComponent, ProgressRingChartComponent, AnimatedBarChartComponent, BarItem, resolveTheme, D3Theme } from '../widgets/d3-charts';

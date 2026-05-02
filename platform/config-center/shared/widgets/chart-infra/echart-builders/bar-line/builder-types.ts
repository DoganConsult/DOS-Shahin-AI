// ── Bar Series Data Types ──

export interface AnimatedRankingData {
  entities: { name: string; values: { period: string; score: number }[] }[];
}

export interface BoardSummaryData {
  categories: string[];
  groups: { name: string; values: number[] }[];
}

export interface FindingsBarData {
  categories: string[];
  severities: { name: string; color?: string; values: number[] }[];
}

export interface MaturityProgressionData {
  frameworks: string[];
  levels: { period: string; scores: number[] }[];
}

export interface ValueGapBarData {
  items: { name: string; current: number; target: number }[];
}

export interface WaterfallData {
  steps: { name: string; value: number; isTotal?: boolean }[];
}

export interface BulletChartData {
  items: { label: string; actual: number; target: number; ranges: number[] }[];
}

export interface MonteCarloHistogramData {
  bins: { min: number; max: number; count: number }[];
  percentiles: { label: string; value: number }[];
  mean: number;
}

export interface TornadoChartData {
  factors: { name: string; low: number; high: number; baseline: number }[];
}

// ── Line Series Data Types ──

export interface TimeSeriesData {
  series: { name: string; data: { date: string; value: number }[] }[];
}

export interface SparklineData {
  values: number[];
  label?: string;
}

export interface ForecastData {
  historical: { date: string; value: number }[];
  forecast: { date: string; value: number; lower: number; upper: number }[];
}

export interface AnomalyTimelineData {
  points: { date: string; value: number; isAnomaly: boolean; severity?: string }[];
}

export interface BurndownData {
  dates: string[];
  aging: number[];
  burndown: number[];
}

// ── Pie/Radar/Gauge Data Types ──

export interface DonutData {
  segments: { name: string; value: number; color?: string }[];
}

export interface RadarData {
  indicators: { name: string; max: number }[];
  series: { name: string; values: number[] }[];
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  zones: { min: number; max: number; color: string }[];
  label?: string;
}

export interface KpiTilesData {
  tiles: { label: string; value: number; target: number; unit: string }[];
}

// ── Scatter/Heatmap/Treemap Data Types ──

export interface BubbleData {
  items: { name: string; x: number; y: number; size: number; category?: string }[];
  xLabel: string;
  yLabel: string;
}

export interface HeatmapData {
  rows: string[];
  columns: string[];
  values: number[][];
}

export interface CalendarHeatmapData {
  year: number;
  data: { date: string; value: number }[];
}

export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
}

export interface TreemapData {
  name: string;
  children: TreemapNode[];
}

// ── Sankey/Graph/Funnel Data Types ──

export interface SankeyData {
  nodes: { name: string }[];
  links: { source: string; target: string; value: number }[];
}

export interface GraphData {
  nodes: { id: string; name: string; category?: string; value?: number }[];
  edges: { source: string; target: string; value?: number }[];
}

export interface FunnelData {
  stages: { name: string; value: number }[];
}

export interface BoxplotData {
  categories: string[];
  data: [number, number, number, number, number][];
}

export interface ParallelCoordinatesData {
  dimensions: { name: string; min: number; max: number }[];
  data: number[][];
}

export interface ThemeRiverData {
  data: [string, number, string][];
}

// ── Custom/3D Data Types ──

export interface GanttData {
  tasks: { name: string; start: string; end: string; progress: number; category?: string }[];
}

export interface SwimLaneData {
  lanes: string[];
  items: { lane: string; start: string; end: string; label: string; status: string }[];
}

export interface BowtieData {
  riskEvent: string;
  causes: { name: string; likelihood: number }[];
  consequences: { name: string; impact: number }[];
  controls: { name: string; type: 'preventive' | 'detective' | 'corrective'; target: string }[];
}

export interface GlobeData {
  points: { lat: number; lng: number; label: string; value: number }[];
  regions: { name: string; color: string; coordinates: [number, number][] }[];
}

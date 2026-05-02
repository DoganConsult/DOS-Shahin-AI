/**
 * Shared chart helpers (drill URLs, etc.)
 */

export interface TrendDataPoint {
  snapshotDate: string;
  complianceScore: number;
}

export interface FrameworkCompletion {
  name: string;
  implementedControls: number;
  totalControls: number;
}

export function buildHeatmapDrillUrl(likelihood: string | number, impact: string | number): string {
  const params = new URLSearchParams();
  if (likelihood) params.set('likelihood', String(likelihood));
  if (impact) params.set('impact', String(impact));
  const q = params.toString();
  return `/risk${q ? '?' + q : ''}`;
}

export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export function computeRiskDistribution(risks: { riskScore?: number; severity?: string; riskLevel?: string; level?: string }[]): RiskDistribution {
  const dist: RiskDistribution = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of risks) {
    if (typeof r.riskScore === 'number') {
      if (r.riskScore >= 20) dist.critical++;
      else if (r.riskScore >= 12) dist.high++;
      else if (r.riskScore >= 6) dist.medium++;
      else dist.low++;
    } else {
      const sev = (r.severity || r.riskLevel || r.level || '').toLowerCase();
      if (sev === 'critical') dist.critical++;
      else if (sev === 'high') dist.high++;
      else if (sev === 'medium') dist.medium++;
      else dist.low++;
    }
  }
  return dist;
}

export function transformToChartData(
  points: { snapshotDate: string; complianceScore: number }[],
  label: string
): { labels: string[]; datasets: { label: string; data: number[]; borderColor: string; fill: boolean }[] } {
  return {
    labels: points.map(p => p.snapshotDate),
    datasets: [{
      label,
      data: points.map(p => p.complianceScore),
      borderColor: '#3b82f6',
      fill: false,
    }],
  };
}

export function transformToBarChartData(
  frameworks: FrameworkCompletion[]
): { labels: string[]; datasets: { label: string; data: number[] }[] } {
  const sorted = [...frameworks].sort((a, b) =>
    (a.implementedControls / a.totalControls) - (b.implementedControls / b.totalControls)
  );
  return {
    labels: sorted.map(f => f.name),
    datasets: [{
      label: 'Completion %',
      data: sorted.map(f => (f.implementedControls / f.totalControls) * 100),
    }],
  };
}

export function selectChartType(
  frameworksOrCount: FrameworkCompletion[] | number
): 'radar' | 'bar' {
  const count = typeof frameworksOrCount === 'number' ? frameworksOrCount : frameworksOrCount.length;
  return count >= 3 ? 'radar' : 'bar';
}

export function getChartLabels(
  langOrKeys: string | string[],
  translations: Record<string, string>
): Record<string, string> {
  const keys = Array.isArray(langOrKeys)
    ? langOrKeys
    : Object.keys(translations).filter(k => k.startsWith('charts.')).map(k => k.replace('charts.', ''));
  const result: Record<string, string> = {};
  for (const k of keys) {
    result[k] = translations[`charts.${k}`] ?? k;
  }
  return result;
}

export interface HeatmapCellSelection {
  row: string;
  column: string;
  value: number;
}

export function parseHeatmapCellSelection(
  event: { data?: unknown } | null | undefined,
  rows?: string[],
  columns?: string[],
): HeatmapCellSelection | null {
  const tuple = event?.data;
  if (!Array.isArray(tuple)) {
    return null;
  }

  const [columnIndexRaw, rowIndexRaw, valueRaw] = tuple;
  const columnIndex = typeof columnIndexRaw === 'number' ? columnIndexRaw : Number(columnIndexRaw);
  const rowIndex = typeof rowIndexRaw === 'number' ? rowIndexRaw : Number(rowIndexRaw);
  const value = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw ?? 0);

  if (!Number.isFinite(columnIndex) || !Number.isFinite(rowIndex)) {
    return null;
  }

  return {
    row: rows?.[rowIndex] ?? '',
    column: columns?.[columnIndex] ?? '',
    value: Number.isFinite(value) ? value : 0,
  };
}

export interface PlotlyTrace {
  type: string;
  z: unknown;
  x: unknown;
  y: unknown;
  colorscale?: unknown;
  showscale?: boolean;
}

export interface PlotlyLayout {
  autosize?: boolean;
  margin?: { l?: number; r?: number; t?: number; b?: number };
  scene?: Record<string, unknown>;
  paper_bgcolor?: string;
  plot_bgcolor?: string;
}

export interface PlotlyConfig {
  responsive?: boolean;
}

export interface PlotlyLike {
  newPlot(element: HTMLDivElement, data: PlotlyTrace[], layout?: PlotlyLayout, config?: PlotlyConfig): void | Promise<unknown>;
}

export interface ChartTooltipPoint {
  dataIndex?: number;
  data?: unknown;
  value?: unknown;
}

export function getChartTooltipPoint(params: unknown): ChartTooltipPoint | null {
  const point = Array.isArray(params) ? params[0] : params;
  if (!point || typeof point !== 'object') {
    return null;
  }

  const tooltipPoint = point as ChartTooltipPoint;
  return tooltipPoint;
}

export function getPlotlyGlobal(): PlotlyLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const plotlyWindow = window as Window & { Plotly?: PlotlyLike };
  return plotlyWindow.Plotly ?? null;
}

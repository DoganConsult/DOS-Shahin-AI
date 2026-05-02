import type { EChartsOption } from 'echarts';

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendSeries {
  name: string;
  data: TrendPoint[];
}

export function buildTrendLineOptions(
  _series: TrendSeries[],
  _theme?: unknown
): EChartsOption {
  return { grid: {}, xAxis: {}, yAxis: {}, series: [] } as EChartsOption;
}

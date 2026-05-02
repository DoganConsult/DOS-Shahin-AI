import type { EChartsOption } from 'echarts';

export interface FindingCategory {
  name: string;
  count?: number;
  value?: number;
  open?: number;
  closed?: number;
}

export function buildFindingsBarOptions(
  _categories: FindingCategory[],
  _theme?: unknown
): EChartsOption {
  return { grid: {}, xAxis: {}, yAxis: {}, series: [{ type: 'bar', data: [] }] } as EChartsOption;
}

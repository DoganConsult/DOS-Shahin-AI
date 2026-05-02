import type { EChartsOption } from 'echarts';

export function buildSparklineOptions(
  _values: number[],
  _theme?: unknown
): EChartsOption {
  return { grid: { left: 0, right: 0, top: 0, bottom: 0 }, xAxis: { show: false }, yAxis: { show: false }, series: [{ type: "line", data: [] }] } as EChartsOption;
}

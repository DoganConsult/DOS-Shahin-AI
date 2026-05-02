import type { EChartsOption } from 'echarts';

export function buildComplianceGaugeOptions(
  _value: number,
  _max?: number,
  _theme?: unknown
): EChartsOption {
  return { series: [{ type: 'gauge', detail: { formatter: '{value}%' }, data: [{ value: 0 }] }] } as EChartsOption;
}

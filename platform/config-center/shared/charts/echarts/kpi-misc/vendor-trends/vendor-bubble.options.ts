import type { EChartsOption } from 'echarts';

export interface VendorPoint {
  id?: string;
  name: string;
  value: number;
  score?: number;
  x?: number;
  y?: number;
  size?: number;
  inherent?: number;
  residual?: number;
  tier?: string;
}

export function buildVendorBubbleOptions(
  _data: VendorPoint[],
  _theme?: unknown
): EChartsOption {
  return { grid: {}, xAxis: {}, yAxis: {}, series: [{ type: "scatter", data: [] }] } as EChartsOption;
}

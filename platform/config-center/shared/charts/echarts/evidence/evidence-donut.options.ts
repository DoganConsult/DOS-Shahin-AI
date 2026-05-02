import type { EChartsOption } from 'echarts';

export interface EvidenceSlice {
  name: string;
  value: number;
  color?: string;
  accent?: string;
}

export function buildEvidenceDonutOptions(
  _slices: EvidenceSlice[],
  _theme?: unknown
): EChartsOption {
  return { series: [{ type: 'pie', radius: ['40%', '70%'], data: [] }] } as EChartsOption;
}

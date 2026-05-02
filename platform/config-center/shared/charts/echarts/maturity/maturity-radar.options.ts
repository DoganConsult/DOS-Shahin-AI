import type { EChartsOption } from 'echarts';

/** Maturity radar chart value. */
export interface MaturityValue {
  name: string;
  score: number;
  target?: number;
}

/**
 * Build ECharts option for a maturity radar chart.
 * @param scores series values
 * @param _animated unused, for API compatibility
 */
export function buildMaturityRadarOptions(
  scores: MaturityValue[],
  _animated?: boolean
): EChartsOption {
  if (!scores?.length) return {} as EChartsOption;
  const max = Math.max(100, ...scores.map((s) => s.score));
  return {
    radar: {
      indicator: scores.map((s) => ({ name: s.name, max })),
    },
    series: [
      {
        type: 'radar',
        data: [{ value: scores.map((s) => s.score), name: 'Maturity' }],
      },
    ],
  } as EChartsOption;
}

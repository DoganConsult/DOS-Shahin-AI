import type { EChartsOption } from 'echarts';

export interface AppetiteTrendPoint {
  date: string;
  actual: number;
  appetite: number;
  tolerance?: number;
}

export function buildRiskAppetiteTrendOptions(points: AppetiteTrendPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dates = sorted.map(p => p.date);
  const hasTolerance = sorted.some(p => p.tolerance !== undefined);

  const series: any[] = [
    {
      name: 'Actual',
      type: 'line' as const,
      data: sorted.map(p => p.actual),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { width: 2.5, color: '#3b82f6' },
      itemStyle: { color: '#3b82f6' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3b82f630' }, { offset: 1, color: '#3b82f605' }] } },
    },
    {
      name: 'Appetite',
      type: 'line' as const,
      data: sorted.map(p => p.appetite),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 2, color: '#22c55e', type: 'dashed' as const },
      itemStyle: { color: '#22c55e' },
    },
  ];

  if (hasTolerance) {
    series.push({
      name: 'Tolerance',
      type: 'line' as const,
      data: sorted.map(p => p.tolerance ?? null),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 1.5, color: '#f59e0b', type: 'dashed' as const },
      itemStyle: { color: '#f59e0b' },
    });
  }

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: hasTolerance ? ['Actual', 'Appetite', 'Tolerance'] : ['Actual', 'Appetite'], top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series,
  } as EChartsOption;
}

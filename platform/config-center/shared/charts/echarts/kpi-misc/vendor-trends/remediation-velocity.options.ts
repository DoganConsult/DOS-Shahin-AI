import type { EChartsOption } from 'echarts';

export interface VelocityPoint {
  date: string;
  completed: number;
  target?: number;
}

export function buildRemediationVelocityOptions(points: VelocityPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dates = sorted.map(p => p.date);
  const hasTarget = sorted.some(p => p.target !== undefined);

  const series: any[] = [
    {
      name: 'Completed',
      type: 'bar' as const,
      data: sorted.map(p => p.completed),
      itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
      barMaxWidth: 50,
      label: { show: true, position: 'top', fontSize: 11, fontWeight: 'bold' as const },
    },
  ];

  if (hasTarget) {
    series.push({
      name: 'Target',
      type: 'line' as const,
      data: sorted.map(p => p.target ?? null),
      smooth: false,
      symbol: 'none',
      lineStyle: { width: 2, color: '#22c55e', type: 'dashed' as const },
      itemStyle: { color: '#22c55e' },
    });
  }

  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: hasTarget ? ['Completed', 'Target'] : ['Completed'], top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series,
  } as EChartsOption;
}

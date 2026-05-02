import type { EChartsOption } from 'echarts';

export interface AgingPoint {
  date: string;
  open: number;
  closed: number;
}

export function buildIssueAgingBurndownOptions(points: AgingPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const sorted = [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const dates = sorted.map(p => p.date);

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['Open', 'Closed'], top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: dates, boundaryGap: false, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: [
      {
        name: 'Open',
        type: 'line' as const,
        data: sorted.map(p => p.open),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#ef444430' }, { offset: 1, color: '#ef444405' }] } },
      },
      {
        name: 'Closed',
        type: 'line' as const,
        data: sorted.map(p => p.closed),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#22c55e30' }, { offset: 1, color: '#22c55e05' }] } },
      },
    ],
  } as EChartsOption;
}

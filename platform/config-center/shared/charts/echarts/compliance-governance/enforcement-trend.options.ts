import type { EChartsOption } from 'echarts';

export interface EnforcementPoint {
  date: string;
  count: number;
  category?: string;
}

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function buildEnforcementTrendOptions(points: EnforcementPoint[]): EChartsOption {
  if (!points.length) return {} as EChartsOption;

  const categories = [...new Set(points.map(p => p.category || 'All'))];
  const allDates = [...new Set(points.map(p => p.date))].sort();

  return {
    tooltip: { trigger: 'axis' },
    legend: { data: categories, top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 40 },
    xAxis: { type: 'category', data: allDates, boundaryGap: false, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { type: 'dashed' as const, color: '#e5e7eb' } } },
    series: categories.map((cat, i) => {
      const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      return {
        name: cat,
        type: 'line' as const,
        data: allDates.map(d => {
          const pt = points.find(p => p.date === d && (p.category || 'All') === cat);
          return pt?.count ?? null;
        }),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2.5, color },
        itemStyle: { color },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '30' }, { offset: 1, color: color + '05' }] } },
      };
    }),
  } as EChartsOption;
}
